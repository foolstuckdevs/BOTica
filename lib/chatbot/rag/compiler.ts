import { ChatOpenAI } from '@langchain/openai';
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
} from '@langchain/core/prompts';
import type { Runnable } from '@langchain/core/runnables';
import type { BaseMessage } from '@langchain/core/messages';
import { BaseResponseCompiler } from './base-classes';
import type {
  RetrievalContext,
  DetectedIntent,
  ClinicalData,
  RxNormResult,
  InventoryMatch,
} from './types';

/**
 * Response compiler that uses LangChain LLM to compile retrieved data into coherent responses
 * Focuses on creating responses that match the user's specific intent (dosage, usage, or side effects)
 */
export class ResponseCompiler extends BaseResponseCompiler {
  private llm: ChatOpenAI;
  private dosageChain?: Runnable<Record<string, string>, BaseMessage>;
  private usageChain?: Runnable<Record<string, string>, BaseMessage>;
  private sideEffectsChain?: Runnable<Record<string, string>, BaseMessage>;
  private generalChain?: Runnable<Record<string, string>, BaseMessage>;

  constructor(
    config: {
      modelName?: string;
      temperature?: number;
      maxTokens?: number;
    } = {},
  ) {
    super(config);

    // Initialize OpenAI LLM with custom environment variable names
    this.llm = new ChatOpenAI({
      apiKey: process.env.AI_API_KEY,
      configuration: {
        baseURL: process.env.AI_API_BASE,
      },
      modelName: config.modelName || process.env.AI_MODEL || 'gpt-4o-mini',
      temperature: config.temperature || 0.1, // Low temperature for factual medical info
      maxTokens: config.maxTokens || 1000,
    });

    // Initialize LLM chains for different intent types
    this.initializeLLMChains();
  }

  /**
   * Initialize specialized LLM chains for different query intents
   */
  private async initializeLLMChains() {
    try {
      // Dosage-focused chain using LCEL
      this.dosageChain = this.createDosagePrompt().pipe(this.llm);

      // Usage-focused chain using LCEL
      this.usageChain = this.createUsagePrompt().pipe(this.llm);

      // Side effects chain using LCEL
      this.sideEffectsChain = this.createSideEffectsPrompt().pipe(this.llm);

      // General information chain using LCEL
      this.generalChain = this.createGeneralPrompt().pipe(this.llm);
    } catch (error) {
      console.error('Failed to initialize LLM chains:', error);
      throw new Error('Unable to initialize response compiler');
    }
  }

  /**
   * Main compilation method that orchestrates the response generation
   */
  public async compile(context: RetrievalContext): Promise<string> {
    try {
      // Ensure chains are initialized
      if (
        !this.dosageChain ||
        !this.usageChain ||
        !this.sideEffectsChain ||
        !this.generalChain
      ) {
        await this.initializeLLMChains();
      }

      // Select appropriate chain based on intent
      const chain = this.selectChain(context.intent);

      // Prepare input data for the chain
      const chainInput = this.prepareChainInput(context);
      console.log(
        '[ResponseCompiler] Starting compilation for intent:',
        context.intent.type,
      );
      console.log(
        '[ResponseCompiler] Clinical data sources:',
        context.clinicalData?.length || 0,
      );
      console.log(
        '[ResponseCompiler] LLM Input - Drug name:',
        chainInput.drug_name,
      );
      console.log('[ResponseCompiler] LLM Input - Intent:', chainInput.intent);
      console.log(
        '[ResponseCompiler] LLM Input - Dosage data:',
        chainInput.dosage_data || 'N/A',
      );
      console.log(
        '[ResponseCompiler] LLM Input - Clinical data:',
        chainInput.clinical_data,
      );

      // Generate response using selected chain with LCEL
      console.log('[ResponseCompiler] Invoking LLM chain...');
      const response = await chain.invoke(chainInput);
      console.log(
        '[ResponseCompiler] Raw LLM response:',
        String(response.content || '').substring(0, 500) + '...',
      );

      // Get and sanitize the main response content (removes deprecated sections)
      const mainContent = this.sanitizeMainContent(
        String(response.content || ''),
      );
      console.log(
        '[ResponseCompiler] Sanitized content:',
        mainContent.substring(0, 300) + '...',
      );

      // Add source attribution footer
      const sourceFooter = this.generateSourceFooter(context);

      // Combine response with source attribution
      let combined = `${mainContent}\n\n${sourceFooter}`;

      // Final defensive sanitation pass (in case model inserted forbidden blocks at end)
      combined = combined.replace(
        /(^|\n)Clinical Information:[\s\S]*?(?=\n?Sources?:|$)/gi,
        '',
      );
      combined = combined.replace(/(^|\n)Sources?:.*$/gim, (m) => {
        // Preserve only the footer's canonical 'Clinical Data Sources:' section, not stray 'Sources:' lines
        return m.includes('Clinical Data Sources:') ? m : '';
      });
      combined = combined.replace(/\n{3,}/g, '\n\n').trim();
      console.log('[ResponseCompiler] Final response length:', combined.length);
      return combined;
    } catch (error) {
      console.error('Compilation failed:', error);
      return 'I apologize, but I encountered an error while processing your request. Please try again.';
    }
  }

  /**
   * Select the appropriate LLM chain based on detected intent
   */
  private selectChain(
    intent: DetectedIntent,
  ): Runnable<Record<string, string>, BaseMessage> {
    switch (intent.type) {
      case 'dosage':
        return this.dosageChain!;
      case 'usage':
        return this.usageChain!;
      case 'side-effects':
        return this.sideEffectsChain!;
      default:
        return this.generalChain!;
    }
  }

  /**
   * Prepare input data for LLM chain based on context
   */
  private prepareChainInput(context: RetrievalContext): Record<string, string> {
    const input: Record<string, string> = {
      drug_name: context.intent.drugName,
      intent: context.intent.type,
      inventory_data: this.formatInventoryData(context.inventoryMatches),
      clinical_data: this.formatClinicalData(context.clinicalData),
      rxnorm_data: this.formatRxNormData(context.rxnormResults),
    };

    // Add intent-specific data
    switch (context.intent.type) {
      case 'dosage':
        input.dosage_data = this.extractDosageData(context);
        break;
      case 'usage':
        input.usage_data = this.extractUsageData(context);
        break;
      case 'side-effects':
        input.side_effects_data = this.extractSideEffectsData(context);
        break;
    }

    return input;
  }

  /**
   * Create dosage-specific prompt template
   */
  private createDosagePrompt(): ChatPromptTemplate {
    const systemTemplate = `You are an internal pharmacy assistant system providing clinical dosage information to licensed pharmacists and pharmacy staff.
    Provide precise, technical dosage guidelines based on available clinical data and pharmacy inventory.
    This is for internal professional use - assume the user has pharmaceutical training.
    
    IMPORTANT FORMATTING REQUIREMENTS:
    - Use plain text only - NO markdown formatting, NO ** or * symbols
    - Use simple section headers followed by a colon
    - Use bullet points with • symbol, not - or *
    - Write in a professional, clinical tone appropriate for pharmacy staff
    - Include technical details and professional considerations
    - Structure information clearly without bold or italic text
    
    STRICT OUTPUT CONSTRAINTS (MANDATORY):
    - DO NOT generate any section titled "Clinical Information:" (deprecated legacy block)
    - DO NOT add a trailing "Sources:" section (system supplies footer automatically)
    - DO NOT output sections named "Notes:", "Debug:", "Metadata:", "Confidence:", "Processing:", or "Inventory:" in the visible content
    - DO NOT restate dosage lines in a summary after listing them
    - ONLY use data present in dosage_data, inventory_data, or rxnorm_data; if data is missing explicitly state its absence without fabricating
    
    Guidelines for Internal Staff:
    - Provide clinical dosage ranges with strength details when available (e.g., "500 mg to 1000 mg every 4 to 6 hours")
    - Include frequency, timing, and administration route specifications
    - Note age-specific, weight-based, or condition-specific considerations using clinical reference ranges
    - Include contraindications and drug interaction warnings
    - Reference clinical guidelines and professional standards
    - Note inventory availability and alternative formulations
    - Include overdose symptoms and emergency protocols
    - Mention when to escalate to clinical pharmacist or physician
    - Use clinical reference format, not patient instruction format (avoid "take X tablets")`;

    const humanTemplate = `Drug name: {drug_name}
    
    Inventory data: {inventory_data}
    
    Clinical dosage data: {dosage_data}
    
    RxNorm data: {rxnorm_data}
    
    Please provide comprehensive dosage information for this medication using clinical reference ranges.`;

    return ChatPromptTemplate.fromMessages([
      SystemMessagePromptTemplate.fromTemplate(systemTemplate),
      HumanMessagePromptTemplate.fromTemplate(humanTemplate),
    ]);
  }

  /**
   * Create usage-specific prompt template
   */
  private createUsagePrompt(): ChatPromptTemplate {
    const systemTemplate = `You are an internal pharmacy assistant system providing clinical usage information to licensed pharmacists and pharmacy staff.
    Provide comprehensive therapeutic information based on available clinical data and inventory.
    This is for internal professional use - assume the user has pharmaceutical training.
    
    IMPORTANT FORMATTING REQUIREMENTS:
    - Use plain text only - NO markdown formatting, NO ** or * symbols
    - Use simple section headers followed by a colon
    - Use bullet points with • symbol, not - or *
    - Write in a professional, clinical tone appropriate for pharmacy staff
    - Include technical details and professional considerations
    - Structure information clearly without bold or italic text
    
    STRICT OUTPUT CONSTRAINTS (MANDATORY):
    - DO NOT generate any section titled "Clinical Information:" (deprecated)
    - DO NOT append a final "Sources:" section (footer provided separately)
    - DO NOT include debug or meta commentary
    - DO NOT duplicate indication lists across headers
    - ONLY use information grounded in usage_data, inventory_data, or rxnorm_data
    
    Guidelines for Internal Staff:
    - Provide clinical therapeutic indications and mechanism of action using professional reference format
    - Include clinically-approved indications and evidence-based uses
    - Note contraindications and precautions using clinical reference style
    - Include drug interaction considerations and monitoring parameters
    - Reference clinical guidelines and professional standards
    - Note inventory availability and therapeutic alternatives
    - Mention when to escalate to clinical pharmacist or physician
    - Use clinical reference format appropriate for pharmacy professionals`;

    const humanTemplate = `Drug name: {drug_name}
    
    Inventory data: {inventory_data}
    
    Clinical usage data: {usage_data}
    
    RxNorm data: {rxnorm_data}
    
    Please provide comprehensive usage information for this medication using clinical reference format.`;

    return ChatPromptTemplate.fromMessages([
      SystemMessagePromptTemplate.fromTemplate(systemTemplate),
      HumanMessagePromptTemplate.fromTemplate(humanTemplate),
    ]);
  }

  /**
   * Create side effects prompt template
   */
  private createSideEffectsPrompt(): ChatPromptTemplate {
    const systemTemplate = `You are an internal pharmacy assistant system providing adverse reaction information to licensed pharmacists and pharmacy staff.
    Provide comprehensive safety profiles based on available clinical data and post-marketing surveillance.
    This is for internal professional use - assume the user has pharmaceutical training.
    
    IMPORTANT FORMATTING REQUIREMENTS:
    - Use plain text only - NO markdown formatting, NO ** or * symbols
    - Use simple section headers followed by a colon
    - Use bullet points with • symbol, not - or *
    - Write in a professional, clinical tone appropriate for pharmacy staff
    - Include technical details and professional considerations
    - Structure information clearly without bold or italic text
    
    STRICT OUTPUT CONSTRAINTS (MANDATORY):
    - DO NOT generate any section titled "Clinical Information:" (legacy)
    - DO NOT add a trailing "Sources:" section (footer handled externally)
    - DO NOT fabricate incidence data; state when unavailable
    - DO NOT repeat the same adverse effect across frequency categories
    - NO debug/meta commentary
    
    Guidelines for Internal Staff:
    - Provide clinical adverse reaction profiles with frequency data when available using professional reference format
    - Include common, serious, and rare adverse effects with clinical significance
    - Note contraindications and black box warnings using clinical reference style
    - Include drug interaction safety considerations and monitoring parameters
    - Reference clinical guidelines and professional safety standards
    - Note inventory monitoring requirements and therapeutic alternatives
    - Include management strategies and early warning signs
    - Mention when to escalate to clinical pharmacist or physician
    - Use clinical reference format appropriate for pharmacy professionals`;

    const humanTemplate = `Drug name: {drug_name}
    
    Inventory data: {inventory_data}
    
    Side effects data: {side_effects_data}
    
    RxNorm data: {rxnorm_data}
    
    Please provide comprehensive side effects information for this medication using clinical reference format.`;

    return ChatPromptTemplate.fromMessages([
      SystemMessagePromptTemplate.fromTemplate(systemTemplate),
      HumanMessagePromptTemplate.fromTemplate(humanTemplate),
    ]);
  }

  /**
   * Create general information prompt template
   */
  private createGeneralPrompt(): ChatPromptTemplate {
    const systemTemplate = `You are an internal pharmacy assistant system providing comprehensive medication information to licensed pharmacists and pharmacy staff.
    Provide detailed pharmaceutical data based on available clinical sources and inventory systems.
    This is for internal professional use - assume the user has pharmaceutical training.
    
    IMPORTANT FORMATTING REQUIREMENTS:
    - Use plain text only - NO markdown formatting, NO ** or * symbols
    - Use simple section headers followed by a colon
    - Use bullet points with • symbol, not - or *
    - Write in a professional, clinical tone appropriate for pharmacy staff
    - Include technical details and professional considerations
    - Structure information clearly without bold or italic text
    
    STRICT OUTPUT CONSTRAINTS (MANDATORY):
    - DO NOT generate a section titled "Clinical Information:" (suppress legacy block)
    - DO NOT create standalone "Sources:" or "Notes:" sections (system adds footer)
    - DO NOT include debug/confidence/inventory/processing metadata
    - DO NOT repeat inventory details redundantly
    - ONLY use information in clinical_data, inventory_data, or rxnorm_data; omit absent subsections instead of inventing
    
    Guidelines for Internal Staff:
    - Provide essential drug monograph information focused on dispensing needs
    - Detail formulation specifics and bioequivalence data
    - Note storage requirements (room temperature, moisture/heat protection only)
    - Include regulatory status and scheduling information
    - Reference professional guidelines and standards of care
    - Note inventory levels only
    
    EXCLUDED SECTIONS (DO NOT INCLUDE):
    - DO NOT include Pharmacokinetics section (absorption, distribution, metabolism, elimination details)
    - DO NOT include Clinical Pearls section (general counseling advice)
    - DO NOT include Practice Recommendations section (general practice guidance)
    - DO NOT include Procurement Considerations section (supplier reliability, pricing, stock monitoring)
    - DO NOT mention 'prevent accidental overdose' in storage requirements - focus only on environmental storage conditions`;

    const humanTemplate = `Drug name: {drug_name}
    
    Inventory data: {inventory_data}
    
    Clinical data: {clinical_data}
    
    RxNorm data: {rxnorm_data}
    
    Please provide comprehensive information about this medication.`;

    return ChatPromptTemplate.fromMessages([
      SystemMessagePromptTemplate.fromTemplate(systemTemplate),
      HumanMessagePromptTemplate.fromTemplate(humanTemplate),
    ]);
  }

  /**
   * Sanitize output to remove deprecated legacy sections (Clinical Information:, Sources:, and meta lines)
   */
  private sanitizeMainContent(raw: string): string {
    let text = raw.trimEnd();

    // Remove any Clinical Information block (legacy) until a blank line or end
    text = text.replace(/(^|\n)Clinical Information:[\s\S]*?(?=\n\n|$)/gi, '');

    // Remove standalone Sources: lines (not our footer)
    text = text.replace(/(^|\n)Sources?:.*$/gim, '');

    // Remove forbidden metadata lines
    text = text.replace(
      /(^|\n)(Notes?|Debug|Confidence|Processing|Inventory|Metadata):.*$/gim,
      '',
    );

    // Collapse multiple blank lines
    text = text.replace(/\n{3,}/g, '\n\n').trim();
    return text;
  }

  /**
   * Format inventory data for LLM input
   */
  private formatInventoryData(matches: InventoryMatch[]): string {
    if (!matches || matches.length === 0) {
      return 'No inventory data available.';
    }

    return matches
      .map(
        (match) =>
          `${match.name} - ${match.description || ''} (In Stock: ${
            match.inStock ? 'Yes' : 'No'
          })`,
      )
      .join('\n');
  }

  /**
   * Format RxNorm data for LLM input
   */
  private formatRxNormData(rxnormData?: RxNormResult[]): string {
    if (!rxnormData || rxnormData.length === 0) {
      return 'No standardized drug information available.';
    }

    return rxnormData
      .map((data) => `${data.name} (RxCUI: ${data.rxcui}) - Type: ${data.tty}`)
      .join('\n');
  }

  /**
   * Extract and format dosage data from context
   */
  private extractDosageData(context: RetrievalContext): string {
    console.log(
      '[ResponseCompiler] Extracting dosage data from',
      context.clinicalData?.length || 0,
      'clinical sources',
    );

    const dosageInfo = context.clinicalData
      ?.map((data, index) => {
        console.log(
          `[ResponseCompiler] Processing clinical data ${index + 1}:`,
          {
            source: data.source,
            hasDosage: !!data.sections.dosage,
            dosageKeys: data.sections.dosage
              ? Object.keys(data.sections.dosage)
              : [],
          },
        );

        if (data.sections.dosage) {
          console.log(
            `[ResponseCompiler] Dosage data ${index + 1}:`,
            JSON.stringify(data.sections.dosage, null, 2),
          );
        }

        return data.sections.dosage;
      })
      .filter(Boolean)
      .map((dosage, index) => {
        if (!dosage) return '';
        const parts = [];
        if (dosage.adults) {
          parts.push(`Adults: ${dosage.adults}`);
          console.log(
            `[ResponseCompiler] Dosage ${index + 1} - Adults:`,
            dosage.adults,
          );
        }
        if (dosage.children) {
          parts.push(`Children: ${dosage.children}`);
          console.log(
            `[ResponseCompiler] Dosage ${index + 1} - Children:`,
            dosage.children,
          );
        }
        if (dosage.frequency) {
          parts.push(`Frequency: ${dosage.frequency}`);
          console.log(
            `[ResponseCompiler] Dosage ${index + 1} - Frequency:`,
            dosage.frequency,
          );
        }
        if (dosage.instructions) {
          parts.push(`Instructions: ${dosage.instructions}`);
          console.log(
            `[ResponseCompiler] Dosage ${index + 1} - Instructions:`,
            dosage.instructions,
          );
        }
        if (dosage.warnings) {
          parts.push(`Warnings: ${dosage.warnings}`);
          console.log(
            `[ResponseCompiler] Dosage ${index + 1} - Warnings:`,
            dosage.warnings,
          );
        }
        const formatted = parts.join('\n');
        console.log(
          `[ResponseCompiler] Formatted dosage ${index + 1}:`,
          formatted,
        );
        return formatted;
      });

    const result =
      dosageInfo?.filter(Boolean).join('\n\n') ||
      'No specific dosage information available.';
    console.log('[ResponseCompiler] Final extracted dosage data:', result);
    return result;
  }

  /**
   * Extract and format usage data from context
   */
  private extractUsageData(context: RetrievalContext): string {
    const usageInfo = context.clinicalData
      ?.map((data) => data.sections.usage)
      .filter(Boolean)
      .map((usage) => {
        if (!usage) return '';
        const parts = [];
        if (usage.indications) {
          parts.push('Indications:');
          usage.indications.forEach((indication) =>
            parts.push(`• ${indication}`),
          );
        }
        if (usage.contraindications) {
          parts.push('Contraindications:');
          usage.contraindications.forEach((contra) =>
            parts.push(`• ${contra}`),
          );
        }
        return parts.join('\n');
      });

    return (
      usageInfo?.filter(Boolean).join('\n\n') ||
      'No specific usage information available.'
    );
  }

  /**
   * Extract and format side effects data from context
   */
  private extractSideEffectsData(context: RetrievalContext): string {
    const sideEffectsInfo = context.clinicalData
      ?.map((data) => data.sections.sideEffects)
      .filter(Boolean)
      .map((sideEffects) => {
        if (!sideEffects) return '';
        const parts = [];
        if (sideEffects.common && sideEffects.common.length > 0) {
          parts.push('Common Side Effects:');
          sideEffects.common.forEach((effect) => parts.push(`• ${effect}`));
        }
        if (sideEffects.serious && sideEffects.serious.length > 0) {
          parts.push('Serious Side Effects:');
          sideEffects.serious.forEach((effect) => parts.push(`• ${effect}`));
        }
        return parts.join('\n');
      });

    return (
      sideEffectsInfo?.filter(Boolean).join('\n\n') ||
      'No specific side effects information available.'
    );
  }

  /**
   * Format clinical data for LLM input
   */
  private formatClinicalData(clinicalData?: ClinicalData[]): string {
    console.log(
      '[ResponseCompiler] Formatting clinical data:',
      clinicalData?.length || 0,
      'sources',
    );

    if (!clinicalData || clinicalData.length === 0) {
      console.log('[ResponseCompiler] No clinical data available');
      return 'No clinical data available.';
    }

    const formatted = clinicalData
      .map((data: ClinicalData, index) => {
        const sections = Object.keys(data.sections);
        console.log(`[ResponseCompiler] Clinical data ${index + 1}:`, {
          source: data.source,
          sections: sections,
          sectionsContent: Object.fromEntries(
            sections.map((key) => [
              key,
              data.sections[key as keyof typeof data.sections],
            ]),
          ),
        });
        return `Source: ${data.source}\nSections: ${sections.join(', ')}`;
      })
      .join('\n\n');

    console.log('[ResponseCompiler] Formatted clinical data:', formatted);
    return formatted;
  }

  /**
   * Extract sources from retrieval context
   */
  private extractSources(context: RetrievalContext): string[] {
    const sources: string[] = [];

    // Add inventory sources
    if (context.inventoryMatches?.length > 0) {
      sources.push('Internal Inventory Database');
    }

    // Add clinical data sources
    context.clinicalData?.forEach((data) => {
      if (data.source && !sources.includes(data.source)) {
        sources.push(data.source);
      }
    });

    // Add RxNorm if available
    if (context.rxnormResults?.length > 0) {
      sources.push('RxNorm Database');
    }

    return sources;
  }

  /**
   * Calculate confidence score based on available data
   */
  private calculateConfidence(context: RetrievalContext): number {
    let confidence = 0;

    // Base confidence from inventory matches
    if (context.inventoryMatches?.length > 0) {
      confidence += 0.3;
    }

    // Add confidence from clinical data
    if (context.clinicalData?.length > 0) {
      confidence += 0.4;
    }

    // Add confidence from RxNorm data
    if (context.rxnormResults?.length > 0) {
      confidence += 0.2;
    }

    // Boost confidence if intent matches available data
    switch (context.intent.type) {
      case 'dosage':
        if (context.clinicalData?.some((data) => data.sections.dosage)) {
          confidence += 0.1;
        }
        break;
      case 'usage':
        if (context.clinicalData?.some((data) => data.sections.usage)) {
          confidence += 0.1;
        }
        break;
      case 'side-effects':
        if (context.clinicalData?.some((data) => data.sections.sideEffects)) {
          confidence += 0.1;
        }
        break;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Health check method
   */
  public async healthCheck(): Promise<boolean> {
    try {
      // Test LLM connectivity
      const testResponse = await this.llm.invoke(
        'Respond with "OK" if you can receive this message.',
      );

      return (
        (typeof testResponse?.content === 'string' &&
          testResponse.content.includes('OK')) ||
        false
      );
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  /**
   * Generate professional source attribution footer
   */
  private generateSourceFooter(context: RetrievalContext): string {
    const sources = [];

    // Check what data sources were used
    const hasInventoryData =
      context.inventoryMatches && context.inventoryMatches.length > 0;
    const hasRxNormData =
      context.rxnormResults && context.rxnormResults.length > 0;
    const hasClinicalData =
      context.clinicalData && context.clinicalData.length > 0;

    // Add data sources
    if (hasInventoryData) {
      sources.push('BOTica Inventory');
    }

    if (hasRxNormData) {
      sources.push('RxNorm (National Library of Medicine)');
    }

    if (hasClinicalData) {
      const clinicalSources = new Set<string>();
      context.clinicalData?.forEach((data) => {
        if (data.source === 'FDA') {
          clinicalSources.add('OpenFDA Drug Labels Database');
        } else {
          clinicalSources.add(data.source);
        }
      });
      sources.push(...Array.from(clinicalSources));
    }

    // Build footer
    const footerLines = [];

    // Add source attribution if we have sources
    if (sources.length > 0) {
      footerLines.push('Clinical Data Sources:');
      sources.forEach((source) => {
        footerLines.push(`• ${source}`);
      });
      footerLines.push('');
    }

    // Add professional disclaimer for internal staff
    footerLines.push('Notice:');
    footerLines.push(
      '- This information is compiled from authoritative clinical databases for pharmacy staff reference.',
    );
    footerLines.push(
      '- Verify current prescribing information and consult clinical guidelines for patient-specific decisions.',
    );

    return footerLines.join('\n');
  }
}
