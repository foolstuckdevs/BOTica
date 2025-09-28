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

      // Generate response using selected chain with LCEL
      const response = await chain.invoke(chainInput);

      // Get the main response content
      const mainContent = String(response.content || '');

      // Add source attribution footer
      const sourceFooter = this.generateSourceFooter(context);

      // Combine response with source attribution
      return `${mainContent}\n\n${sourceFooter}`;
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
    - DO NOT add any "Clinical Information:" summary sections at the end
    - DO NOT add any "Sources:" lines (this will be handled separately)
    
    Guidelines for Internal Staff:
    - Provide specific dosage amounts with strength details when available
    - Include frequency, timing, and administration route instructions
    - Note age-specific, weight-based, or condition-specific considerations
    - Include contraindications and drug interaction warnings
    - Reference clinical guidelines and professional standards
    - Note inventory availability and alternative formulations
    - Include overdose symptoms and emergency protocols
    - Mention when to escalate to clinical pharmacist or physician`;

    const humanTemplate = `Drug name: {drug_name}
    
    Inventory data: {inventory_data}
    
    Clinical dosage data: {dosage_data}
    
    RxNorm data: {rxnorm_data}
    
    Please provide comprehensive dosage information for this medication.`;

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
    - DO NOT add any "Clinical Information:" summary sections at the end
    - DO NOT add any "Sources:" lines (this will be handled separately)
    
    Guidelines for Internal Staff:
    - List primary therapeutic indications with ICD-10 codes when available
    - Include off-label uses and clinical evidence
    - Detail contraindications, precautions, and black box warnings
    - Note drug interactions and monitoring parameters
    - Reference clinical guidelines and formulary status
    - Include pregnancy/lactation categories and special populations
    - Note therapeutic alternatives available in inventory
    - Mention when clinical pharmacist consultation is recommended`;

    const humanTemplate = `Drug name: {drug_name}
    
    Inventory data: {inventory_data}
    
    Clinical usage data: {usage_data}
    
    RxNorm data: {rxnorm_data}
    
    Please provide comprehensive usage information for this medication.`;

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
    - DO NOT add any "Clinical Information:" summary sections at the end
    - DO NOT add any "Sources:" lines (this will be handled separately)
    
    Guidelines for Internal Staff:
    - Categorize adverse reactions by frequency and severity (MedDRA terms when available)
    - Include incidence rates and clinical significance
    - Note serious adverse reactions requiring immediate intervention
    - Detail monitoring parameters and early warning signs
    - Reference black box warnings and REMS requirements
    - Include drug-drug interaction profiles
    - Note special population considerations (pediatric, geriatric, hepatic/renal impairment)
    - Mention reporting requirements for adverse events`;

    const humanTemplate = `Drug name: {drug_name}
    
    Inventory data: {inventory_data}
    
    Side effects data: {side_effects_data}
    
    RxNorm data: {rxnorm_data}
    
    Please provide comprehensive side effects information for this medication.`;

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
    - DO NOT add any "Clinical Information:" summary sections at the end
    - DO NOT add any "Sources:" lines (this will be handled separately)
    
    Guidelines for Internal Staff:
    - Provide comprehensive drug monograph information
    - Include pharmacokinetic and pharmacodynamic properties
    - Detail formulation specifics and bioequivalence data
    - Note storage requirements and stability information
    - Include regulatory status and scheduling information
    - Reference professional guidelines and standards of care
    - Note inventory levels and procurement considerations
    - Include clinical pearls and practice recommendations`;

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
    const dosageInfo = context.clinicalData
      ?.map((data) => data.sections.dosage)
      .filter(Boolean)
      .map((dosage) => {
        if (!dosage) return '';
        const parts = [];
        if (dosage.adults) parts.push(`Adults: ${dosage.adults}`);
        if (dosage.children) parts.push(`Children: ${dosage.children}`);
        if (dosage.frequency) parts.push(`Frequency: ${dosage.frequency}`);
        if (dosage.instructions)
          parts.push(`Instructions: ${dosage.instructions}`);
        if (dosage.warnings) parts.push(`Warnings: ${dosage.warnings}`);
        return parts.join('\n');
      });

    return (
      dosageInfo?.filter(Boolean).join('\n\n') ||
      'No specific dosage information available.'
    );
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
    if (!clinicalData || clinicalData.length === 0) {
      return 'No clinical data available.';
    }

    return clinicalData
      .map(
        (data: ClinicalData) =>
          `Source: ${data.source}\nSections: ${Object.keys(data.sections).join(
            ', ',
          )}`,
      )
      .join('\n\n');
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
      sources.push('Internal Pharmacy Inventory');
    }

    if (hasRxNormData) {
      sources.push('RxNorm (National Library of Medicine)');
    }

    if (hasClinicalData) {
      const clinicalSources = new Set<string>();
      context.clinicalData?.forEach((data) => {
        if (data.source === 'FDA') {
          clinicalSources.add('OpenFDA Drug Labels Database');
        } else if (data.source === 'MedlinePlus') {
          clinicalSources.add('MedlinePlus (National Library of Medicine)');
        }
      });
      sources.push(...Array.from(clinicalSources));
    }

    // Build footer
    const footerLines = [];

    // Add separator line
    footerLines.push(
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    );

    // Add source attribution if we have sources
    if (sources.length > 0) {
      footerLines.push('Clinical Data Sources:');
      sources.forEach((source) => {
        footerLines.push(`• ${source}`);
      });
      footerLines.push('');
    }

    // Add retrieval timestamp
    footerLines.push(`Data retrieved: ${new Date().toLocaleString()}`);
    footerLines.push('');

    // Add professional disclaimer for internal staff
    footerLines.push('Internal Use Notice:');
    footerLines.push(
      'This information is compiled from authoritative clinical databases for pharmacy staff reference.',
    );
    footerLines.push(
      'Verify current prescribing information and consult clinical guidelines for patient-specific decisions.',
    );
    footerLines.push(
      'Report any data discrepancies to the pharmacy informatics team.',
    );

    return footerLines.join('\n');
  }
}
