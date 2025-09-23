import { ChatOpenAI } from '@langchain/openai';
import { inventoryTool } from '../tools/inventory';
import { rxnavTool } from '../tools/rxnav';
import { medlineplusTool } from '../tools/medlineplus';
import type {
  ChatbotRequest,
  ChatbotResponse,
  InventoryInfo,
  ClinicalInfo,
} from '../types';

/**
 * Simplified agent focused on:
 * 1. Product lookup with multiple results
 * 2. Clinical information (dosage, usage, side effects)
 * 3. Clean inventory-first workflow
 */
export class BoticaAgent {
  private llm: ChatOpenAI;
  private lastDrugContext: string | null = null; // Store last drug name for context

  constructor() {
    this.llm = new ChatOpenAI({
      apiKey: process.env.AI_API_KEY,
      model: process.env.AI_MODEL || 'gpt-4o-mini',
      temperature: 0.3,
      maxTokens: 1500,
    });
  }

  /**
   * Main entry point for processing queries
   */
  async processQuery(request: ChatbotRequest): Promise<ChatbotResponse> {
    const { message, pharmacyId } = request;

    console.log(`[SimpleAgent] Processing: "${message}"`);

    try {
      // Handle context-dependent queries
      const processedMessage = this.handleContextualQuery(message);

      // Check if this is primarily a clinical query
      const isClinicalQuery = this.isClinicalQuery(processedMessage);

      // Step 1: Search inventory first
      const inventoryResults = await this.searchInventory(
        processedMessage,
        pharmacyId,
      );

      // Update context with found drugs
      if (inventoryResults.length > 0) {
        this.lastDrugContext =
          inventoryResults[0].genericName || inventoryResults[0].name;
      }

      // Step 2: Get clinical info - always try if clinical query or if we have products
      const clinicalInfo = await this.getClinicalInfo(
        processedMessage,
        inventoryResults,
        isClinicalQuery,
      );

      // Step 3: Generate response
      return await this.generateResponse(
        message, // Use original message for response generation
        inventoryResults,
        clinicalInfo,
        isClinicalQuery,
      );
    } catch (error) {
      console.error('[SimpleAgent] Error:', error);
      return this.createErrorResponse(message, error);
    }
  }

  /**
   * Handle queries that depend on previous context
   */
  private handleContextualQuery(message: string): string {
    const contextualPatterns = [
      /^(?:how about|what about|tell me about|give me)?\s*(?:the|its?)?\s*(dosage|dose|usage|side effects?|warnings?|information|details)\s*(?:for it|for that)?\??\s*$/i,
      /^(?:what is|what's)\s*(?:the|its?)?\s*(dosage|dose|usage|side effects?)\s*(?:for it|for that)?\??\s*$/i,
      /^(dosage|dose|usage|side effects?|warnings?)\s*(?:for it|for that)?\??\s*$/i,
      /^(?:and\s+)?(?:the\s+)?(dosage|dose|usage|side effects?|warnings?)\??\s*$/i,
    ];

    const isContextual = contextualPatterns.some((pattern) =>
      pattern.test(message.trim()),
    );

    if (isContextual && this.lastDrugContext) {
      const match = message.match(
        /(dosage|dose|usage|side effects?|warnings?|information|details)/i,
      );
      if (match) {
        const clinicalType = match[1];
        const contextualQuery = `${clinicalType} for ${this.lastDrugContext}`;
        console.log(
          `[SimpleAgent] Contextual query: "${message}" -> "${contextualQuery}"`,
        );
        return contextualQuery;
      }
    }

    return message;
  }

  /**
   * Extract drug name from clinical queries like "dosage for paracetamol"
   */
  private extractDrugNameFromQuery(query: string): string | null {
    // Clinical info queries - extract drug name after "for"
    const clinicalPattern =
      /(?:dosage|usage|side effects?|information|details) (?:for|of) (.+?)(?:\s+|\?|$)/i;
    const match = query.match(clinicalPattern);

    if (match && match[1]) {
      return match[1].trim();
    }

    return null;
  }

  /**
   * Detect if the query is primarily asking for clinical information
   */
  private isClinicalQuery(query: string): boolean {
    // More specific patterns to avoid false positives with stock queries
    const clinicalPatterns = [
      // Direct dosage queries
      /\b(?:dosage|dose)\s+(?:for|of|information)\b/i,
      /^(?:dosage|dose)\s+for\b/i,
      /\b(?:how much|how often)\s+(?:to take|should|can)\b/i,
      /\b(?:dosing|dosage)\s+(?:instructions?|guidelines?|recommendations?)\b/i,

      // Usage patterns - must be asking about how to use medically
      /\b(?:usage|use)\s+(?:for|of|information|instructions?)\b/i,
      /\b(?:how to|when to)\s+(?:take|use)\b/i,
      /\b(?:indications?|what is.*for)\b/i,

      // Side effects and safety - broader matching
      /\b(?:side effects?|adverse|reactions?)\b/i,
      /\b(?:interactions?|contraindications?)\b/i,
      /\b(?:warnings?|precautions?)\b/i,
      /\b(?:clinical|medical|therapeutic)\s+(?:information|data|details)\b/i,

      // Context patterns for follow-up questions
      /^(?:how about|what about|and|also)\s/i,
      /^(?:dosage|usage|side effects?|warnings?)\s*\??\s*$/i,
    ];

    return clinicalPatterns.some((pattern) => pattern.test(query));
  }

  /**
   * Extract the specific clinical information type requested
   */
  private getRequestedClinicalType(query: string): string[] {
    const sections: string[] = [];

    // For follow-up questions like "how about side effects?", prioritize the specific term
    if (/\b(?:side effects?|adverse|reactions?)\b/i.test(query)) {
      sections.push('side-effects');
    }
    if (/\b(?:warnings?|precautions?)\b/i.test(query)) {
      sections.push('warnings');
    }

    // Only check dosage/usage if side effects/warnings weren't found
    if (sections.length === 0) {
      if (/\b(?:dosage|dose|how much|how often)\b/i.test(query)) {
        sections.push('dosage');
      }
      if (/\b(?:usage|use|how to|when to|take)\b/i.test(query)) {
        sections.push('usage');
      }
    }

    // If no specific type found, return all sections
    return sections.length > 0 ? sections : ['dosage', 'usage', 'side-effects'];
  }

  /**
   * Search inventory for products
   */
  private async searchInventory(
    query: string,
    pharmacyId: number,
  ): Promise<InventoryInfo[]> {
    try {
      const result = await inventoryTool.func({
        query,
        pharmacyId,
        limit: 10, // Allow multiple results
      });

      const parsed = JSON.parse(result);
      return parsed.found ? parsed.results : [];
    } catch (error) {
      console.error('[SimpleAgent] Inventory search failed:', error);
      return [];
    }
  }

  /**
   * Get clinical information for the drug
   */
  private async getClinicalInfo(
    query: string,
    inventoryResults: InventoryInfo[],
    forceClinical: boolean = false,
  ): Promise<ClinicalInfo | null> {
    try {
      // For clinical queries, extract drug name from query if no inventory found
      let drugName: string;

      if (inventoryResults.length > 0) {
        // Use inventory result - inventory first approach
        drugName = inventoryResults[0].genericName || inventoryResults[0].name;
      } else if (forceClinical) {
        // Extract from clinical query pattern
        const extracted = this.extractDrugNameFromQuery(query);
        drugName = extracted || query;
      } else {
        // No inventory and not a clinical query
        return null;
      }

      console.log(`[SimpleAgent] Getting clinical info for: "${drugName}"`);

      // Get the specific clinical information requested
      const requestedSections = this.getRequestedClinicalType(query);

      // Step 1: Normalize drug name via RxNav
      const rxnavResult = await rxnavTool.func({
        drugName,
        searchType: 'approximate' as const,
      });

      const rxnavData = JSON.parse(rxnavResult);

      // Step 2: Get clinical info from MedlinePlus using normalized name
      // Pass category name for prescription classification
      const categoryName =
        inventoryResults.length > 0
          ? inventoryResults[0].categoryName
          : undefined;

      const clinicalResult = await medlineplusTool.func({
        drugName: rxnavData.name || drugName,
        rxCui: rxnavData.rxCui,
        sections: requestedSections as (
          | 'dosage'
          | 'usage'
          | 'side-effects'
          | 'warnings'
        )[],
        categoryName, // Pass category for OTC/prescription classification
      });

      const clinicalData = JSON.parse(clinicalResult);

      // Only return clinical info if we actually found it from MedlinePlus
      if (clinicalData.found) {
        // Summarize clinical information to make it more readable
        const summarizedClinical = await this.summarizeClinicalInfo({
          dosage: clinicalData.dosage,
          usage: clinicalData.usage,
          sideEffects: clinicalData.sideEffects,
          source: clinicalData.source || 'MedlinePlus',
          rxCui: rxnavData.rxCui,
        });

        return summarizedClinical;
      }

      // If MedlinePlus fails, we don't provide fallback clinical data
      // Clinical information must come from legitimate medical sources only
      return null;
    } catch (error) {
      console.error('[SimpleAgent] Clinical info failed:', error);
      return null;
    }
  }

  /**
   * Summarize clinical information using LLM to make it more readable
   */
  private async summarizeClinicalInfo(
    clinical: ClinicalInfo,
  ): Promise<ClinicalInfo> {
    try {
      const prompt = `You are a medical information assistant. Summarize the following clinical information to be concise and readable for pharmacy staff. Keep each section to 2-3 sentences maximum while preserving all important safety information and dosing details. If the text says "This is a prescription medication", keep that exact message unchanged.

Clinical Information to Summarize:
${clinical.dosage ? `Dosage: ${clinical.dosage}` : ''}
${clinical.usage ? `Usage: ${clinical.usage}` : ''}
${clinical.sideEffects ? `Side Effects: ${clinical.sideEffects}` : ''}

Please respond with JSON in this exact format:
{
  "dosage": "summarized dosage info or null",
  "usage": "summarized usage info or null", 
  "sideEffects": "summarized side effects info or null"
}`;

      const response = await this.llm.invoke(prompt);
      const content = response.content as string;

      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const summarized = JSON.parse(jsonMatch[0]);
        return {
          dosage: summarized.dosage || clinical.dosage,
          usage: summarized.usage || clinical.usage,
          sideEffects: summarized.sideEffects || clinical.sideEffects,
          source: clinical.source,
          rxCui: clinical.rxCui,
        };
      }

      // Fallback to original if parsing fails
      return clinical;
    } catch (error) {
      console.error('[SimpleAgent] Clinical summarization failed:', error);
      // Return original clinical info if summarization fails
      return clinical;
    }
  }

  /**
   * Generate structured response using LLM
   */
  private async generateResponse(
    query: string,
    inventory: InventoryInfo[],
    clinical: ClinicalInfo | null,
    isClinicalQuery: boolean = false,
  ): Promise<ChatbotResponse> {
    const hasInventory = inventory.length > 0;
    const hasClinical = clinical !== null;

    // Create context for LLM
    const context = {
      query,
      inventory: hasInventory ? inventory : null,
      clinical: hasClinical ? clinical : null,
      inventoryCount: inventory.length,
      isClinicalQuery,
    };

    const prompt = `
You are a Philippine pharmacy assistant helping internal staff with product lookups and clinical information. Analyze this query and data:

QUERY: "${query}"
IS CLINICAL QUERY: ${isClinicalQuery}
INVENTORY RESULTS: ${JSON.stringify(context.inventory, null, 2)}
CLINICAL INFO: ${JSON.stringify(context.clinical, null, 2)}

STRICT FORMATTING RULES:
- Output must be plain text (no markdown, no bold, no asterisks)
- Do NOT include cost price, lot number, or barcode anywhere
- Avoid repeating inventory details that the UI will render; keep the staffMessage concise
- Include clear source attribution strings only if asked; the UI renders a sources footer

BEHAVIORAL RULES:
- INVENTORY FIRST APPROACH: Always check inventory first, then provide clinical information
- For GENERAL INVENTORY QUERIES: "We have [product] in stock" - let UI show inventory details
- For SPECIFIC CLINICAL QUERIES (when IS CLINICAL QUERY: true):
  * MANDATORY: DO NOT mention stock status, inventory, or "We have X in stock" 
  * Use ONLY this format: "[Clinical info type] information for [product]:" with NO additional details
  * Examples: "Dosage information for Paracetamol:" or "Side effects information for Azithromycin:"
  * If prescription-only: "[Clinical info type] information for [product]: This is prescription-only, consult a doctor."
  * NEVER combine inventory status with clinical queries
  * CRITICAL: staffMessage must be SHORT - just the header. Clinical details appear separately in "Clinical Information" section
  * DO NOT repeat dosage amounts, side effects, or usage instructions in staffMessage
- If clinical info unavailable from legitimate sources: "Clinical information not available from our medical databases"
- CRITICAL: Never provide hardcoded or fabricated clinical information - ONLY use data from clinical sources
- If clinical data is null/empty: "No clinical information available from legitimate medical sources"
- For prescription-only meds: do NOT provide dosing instructions; say "This is prescription-only, consult a doctor"
- Handle Philippine generics (e.g., Paracetamol) and US names (Acetaminophen)
- For typos or unclear queries: extract the likely drug name and proceed with inventory search
- DO NOT fabricate statements like "generally well-tolerated" or "potential side effects include" - these are NOT from legitimate sources
- AVOID DUPLICATION: Clinical details will be shown in separate "Clinical Information" section, don't repeat them in staffMessage
- CLINICAL SUMMARIZATION: If clinical information is provided, summarize it to be concise and readable (2-3 sentences max per section), focusing on key points while preserving accuracy

Respond with JSON in this exact format:
{
  "staffMessage": "Short summary for staff (plain text)",
  "detailedNotes": "Optional compact notes ONLY if needed (plain text, no duplication)"
}`;

    try {
      const response = await this.llm.invoke(prompt);
      const content = response.content as string;

      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const llmResponse = jsonMatch
        ? JSON.parse(jsonMatch[0])
        : {
            staffMessage: hasInventory
              ? `Found ${inventory.length} product(s) for "${query}"`
              : `No products found for "${query}"`,
            detailedNotes: this.createDetailedNotes(
              inventory,
              clinical,
              isClinicalQuery,
            ),
          };

      return {
        ui: {
          staffMessage: llmResponse.staffMessage,
          detailedNotes: llmResponse.detailedNotes,
        },
        inventory: hasInventory && !isClinicalQuery ? inventory : null,
        clinical: this.shouldShowClinicalInfo(clinical),
        sources: this.getSources(hasInventory, hasClinical),
        confidence: this.calculateConfidence(hasInventory, hasClinical),
      };
    } catch (error) {
      console.error('[SimpleAgent] Response generation failed:', error);

      // Fallback response without LLM
      return {
        ui: {
          staffMessage: hasInventory
            ? `Found ${inventory.length} product(s)`
            : hasClinical
            ? 'Clinical information available from our medical databases'
            : 'Product not found and no clinical information available from legitimate sources',
          detailedNotes: this.createDetailedNotes(
            inventory,
            clinical,
            isClinicalQuery,
          ),
        },
        inventory: hasInventory && !isClinicalQuery ? inventory : null,
        clinical: this.shouldShowClinicalInfo(clinical),
        sources: this.getSources(hasInventory, hasClinical),
        confidence: 0.8,
      };
    }
  }

  /**
   * Create detailed notes without LLM - compact, no duplication with UI
   */
  private createDetailedNotes(
    inventory: InventoryInfo[],
    clinical: ClinicalInfo | null,
    isClinicalQuery: boolean = false,
  ): string {
    const notes: string[] = [];

    type InventoryForNotes = InventoryInfo & { sellingPrice?: string };

    // For specific clinical queries, don't repeat inventory details
    // The UI will show inventory in a separate section
    if (inventory.length > 0 && !isClinicalQuery) {
      (inventory as InventoryForNotes[]).forEach((item) => {
        const priceVal = item.sellingPrice ? Number(item.sellingPrice) : 0;
        const price = `₱${priceVal.toFixed(2)}`;
        const expiry = item.expiryDate ? `Expires: ${item.expiryDate}` : '';
        notes.push(
          `${item.name}${item.genericName ? ` (${item.genericName})` : ''} | ${
            item.quantity
          } ${item.unit} | ${price}${expiry ? ` | ${expiry}` : ''}`,
        );
      });
    }

    // Don't duplicate clinical information that's already in the staffMessage
    // Clinical info will be shown in the UI's Clinical Information section
    // Only add source attribution if not already obvious
    if (clinical && clinical.source && !isClinicalQuery) {
      notes.push(`Clinical data from: ${clinical.source}`);
    }

    return notes.join('\n');
  }

  /**
   * Check if clinical info should be shown or hidden to avoid duplication
   * Hide clinical info if it's just prescription blocking messages
   */
  private shouldShowClinicalInfo(
    clinical: ClinicalInfo | null,
  ): ClinicalInfo | null {
    if (!clinical) return null;

    // Check if all clinical info sections are just prescription blocking messages
    const isPrescriptionBlocking = (text: string | undefined): boolean => {
      if (!text) return false;
      return text.includes(
        'This is a prescription medication. Consult your doctor',
      );
    };

    const hasAnyContent =
      (clinical.dosage && !isPrescriptionBlocking(clinical.dosage)) ||
      (clinical.usage && !isPrescriptionBlocking(clinical.usage)) ||
      (clinical.sideEffects && !isPrescriptionBlocking(clinical.sideEffects));

    // Only show clinical section if there's actual content (not just prescription blocking)
    if (!hasAnyContent) {
      return null;
    }

    return clinical;
  }

  /**
   * Determine sources used
   */
  private getSources(hasInventory: boolean, hasClinical: boolean): string[] {
    const sources: string[] = [];
    if (hasInventory) sources.push('BOTica Database');
    if (hasClinical) sources.push('RxNav/MedlinePlus');
    return sources;
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(
    hasInventory: boolean,
    hasClinical: boolean,
  ): number {
    let confidence = 0.5; // Base confidence
    if (hasInventory) confidence += 0.3;
    if (hasClinical) confidence += 0.2;
    return Math.min(confidence, 1.0);
  }

  /**
   * Create error response
   */
  private createErrorResponse(query: string, error: unknown): ChatbotResponse {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    return {
      ui: {
        staffMessage: 'System error - manual lookup required',
        detailedNotes: `• Error processing "${query}"\n• ${errorMessage}\n• Use manual database query`,
      },
      inventory: null,
      clinical: null,
      sources: [],
      confidence: 0.0,
    };
  }
}
