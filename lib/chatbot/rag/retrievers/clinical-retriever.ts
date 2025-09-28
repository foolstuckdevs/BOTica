import { Document } from '@langchain/core/documents';
import { BaseRAGRetriever } from '../base-classes';
import type {
  DetectedIntent,
  RetrievalContext,
  ClinicalData,
  DosageInfo,
  UsageInfo,
  SideEffectsInfo,
} from '../types';

/**
 * FDA API interfaces
 */
interface FDADrugLabel {
  openfda?: {
    generic_name?: string[];
    brand_name?: string[];
  };
  dosage_and_administration?: string[];
  indications_and_usage?: string[];
  adverse_reactions?: string[];
  warnings?: string[];
  contraindications?: string[];
  description?: string[];
}

interface FDAResponse {
  results?: FDADrugLabel[];
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Clinical data retriever that fetches information from MedlinePlus and FDA APIs
 * Focuses on retrieving only the specific clinical sections requested by the user
 */
export class ClinicalRetriever extends BaseRAGRetriever {
  private readonly fdaBaseUrl = 'https://api.fda.gov/drug/label.json';
  private readonly medlinePlusBaseUrl = 'https://wsearch.nlm.nih.gov/ws/query';
  private readonly timeout = 15000;

  // Known OTC drugs (from existing implementation)
  private readonly knownOTC = [
    'ibuprofen',
    'acetaminophen',
    'paracetamol',
    'aspirin',
    'naproxen',
    'diphenhydramine',
    'loratadine',
    'cetirizine',
    'pseudoephedrine',
    'dextromethorphan',
    'guaifenesin',
    'calcium carbonate',
    'famotidine',
    'omeprazole',
    'simethicone',
    'loperamide',
    'bismuth subsalicylate',
  ];

  constructor(config: { preferFDA?: boolean; enableFallback?: boolean } = {}) {
    super({
      preferFDA: true,
      enableFallback: true,
      ...config,
    });
  }

  /**
   * Main LangChain retrieval method
   */
  async _getRelevantDocuments(query: string): Promise<Document[]> {
    // This method is called when no context is available
    // We need RxCUI and intent for effective clinical retrieval
    const mockIntent: DetectedIntent = {
      type: 'general',
      drugName: query,
      confidence: 0.5,
      rawQuery: query,
    };

    const mockContext: RetrievalContext = {
      intent: mockIntent,
      inventoryMatches: [],
      rxnormResults: [],
      clinicalData: [],
      errors: [],
    };

    return this.retrieveWithContext(mockIntent, mockContext);
  }

  /**
   * Context-aware retrieval using RxCUI and intent
   */
  async retrieveWithContext(
    intent: DetectedIntent,
    context: RetrievalContext,
  ): Promise<Document[]> {
    console.log(
      `[ClinicalRetriever] Fetching ${intent.type} data for "${intent.drugName}"`,
    );

    const clinicalData: ClinicalData[] = [];

    // Use RxNorm results if available for better API queries
    const rxcuis = context.rxnormResults?.map((result) => result.rxcui) || [];
    const searchTerms = this.buildSearchTerms(intent, context);

    for (const term of searchTerms) {
      const rxcui = rxcuis.length > 0 ? rxcuis[0] : undefined;

      // Try FDA API first (more reliable for dosage)
      if (this.config.preferFDA) {
        const fdaData = await this.fetchFromFDA(term, rxcui, intent);
        if (fdaData) {
          clinicalData.push(fdaData);
        }
      }

      // Try MedlinePlus as fallback or primary
      if (clinicalData.length === 0 || this.config.enableFallback) {
        const medlinePlusData = await this.fetchFromMedlinePlus(
          term,
          rxcui,
          intent,
        );
        if (medlinePlusData) {
          clinicalData.push(medlinePlusData);
        }
      }
    }

    // Store results in context
    context.clinicalData = clinicalData;

    console.log(
      `[ClinicalRetriever] Retrieved ${clinicalData.length} clinical data sources`,
    );

    return clinicalData.map(
      (data) =>
        new Document({
          pageContent: this.formatClinicalData(data, intent),
          metadata: {
            type: 'clinical',
            rxcui: data.rxcui,
            drugName: data.drugName,
            sections: Object.keys(data.sections),
            source: data.source,
            relevantFor: intent.type,
            lastUpdated: data.lastUpdated,
          },
        }),
    );
  }

  /**
   * Fetch clinical data from FDA Drug Label API
   */
  private async fetchFromFDA(
    drugName: string,
    rxcui?: string,
    intent?: DetectedIntent,
  ): Promise<ClinicalData | null> {
    try {
      const searchTerm = this.normalizeDrugName(drugName);
      const params = new URLSearchParams({
        search: `openfda.generic_name:"${searchTerm}" OR openfda.brand_name:"${searchTerm}"`,
        limit: '1',
      });

      console.log(`[ClinicalRetriever] Trying FDA API for: "${searchTerm}"`);

      const response = await fetch(`${this.fdaBaseUrl}?${params}`, {
        headers: {
          'User-Agent': 'BOTica-Pharmacy-Assistant/1.0',
        },
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        console.warn(
          `[ClinicalRetriever] FDA API failed: HTTP ${response.status}`,
        );
        return null;
      }

      const data: FDAResponse = await response.json();

      if (data.results && data.results.length > 0) {
        const drugLabel = data.results[0];
        console.log('[ClinicalRetriever] Found FDA drug label data');

        const sections: ClinicalData['sections'] = {};

        // Extract only requested section based on intent
        if (!intent || intent.type === 'dosage' || intent.type === 'general') {
          const dosageInfo = this.extractFDADosage(drugLabel, drugName);
          if (dosageInfo) sections.dosage = dosageInfo;
        }

        if (!intent || intent.type === 'usage' || intent.type === 'general') {
          const usageInfo = this.extractFDAUsage(drugLabel);
          if (usageInfo) sections.usage = usageInfo;
        }

        if (
          !intent ||
          intent.type === 'side-effects' ||
          intent.type === 'general'
        ) {
          const sideEffectsInfo = this.extractFDASideEffects(drugLabel);
          if (sideEffectsInfo) sections.sideEffects = sideEffectsInfo;
        }

        return {
          rxcui: rxcui || 'unknown',
          drugName: drugName,
          sections,
          source: 'FDA Drug Labels',
          lastUpdated: new Date(),
        };
      }

      return null;
    } catch (error) {
      console.error(
        `[ClinicalRetriever] FDA API error for "${drugName}":`,
        error,
      );
      return null;
    }
  }

  /**
   * Fetch clinical data from MedlinePlus API
   */
  private async fetchFromMedlinePlus(
    drugName: string,
    rxcui?: string,
    intent?: DetectedIntent,
  ): Promise<ClinicalData | null> {
    try {
      // MedlinePlus search by RxCUI if available
      let searchUrl: string;
      if (rxcui) {
        searchUrl = `${this.medlinePlusBaseUrl}?db=healthTopics&term=${rxcui}`;
      } else {
        const searchTerm = this.normalizeDrugName(drugName);
        searchUrl = `${
          this.medlinePlusBaseUrl
        }?db=healthTopics&term=${encodeURIComponent(searchTerm)}`;
      }

      console.log(`[ClinicalRetriever] Trying MedlinePlus for: "${drugName}"`);

      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'BOTica-Pharmacy-Assistant/1.0',
        },
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        console.warn(
          `[ClinicalRetriever] MedlinePlus failed: HTTP ${response.status}`,
        );
        return null;
      }

      const xmlData = await response.text();

      if (xmlData.includes('<document>') || xmlData.includes('<result>')) {
        const sections: ClinicalData['sections'] = {};

        // Extract content from XML and parse based on intent
        const content = this.extractContentFromXML(xmlData);

        if (
          content &&
          (!intent || intent.type === 'dosage' || intent.type === 'general')
        ) {
          const dosageInfo = this.extractDosageFromText(content);
          if (dosageInfo) sections.dosage = dosageInfo;
        }

        if (
          content &&
          (!intent || intent.type === 'usage' || intent.type === 'general')
        ) {
          const usageInfo = this.extractUsageFromText(content);
          if (usageInfo) sections.usage = usageInfo;
        }

        if (
          content &&
          (!intent ||
            intent.type === 'side-effects' ||
            intent.type === 'general')
        ) {
          const sideEffectsInfo = this.extractSideEffectsFromText(content);
          if (sideEffectsInfo) sections.sideEffects = sideEffectsInfo;
        }

        return {
          rxcui: rxcui || 'unknown',
          drugName: drugName,
          sections,
          source: 'MedlinePlus',
          lastUpdated: new Date(),
        };
      }

      return null;
    } catch (error) {
      console.error(
        `[ClinicalRetriever] MedlinePlus error for "${drugName}":`,
        error,
      );
      return null;
    }
  }

  /**
   * Extract dosage information from FDA drug label
   */
  private extractFDADosage(
    drugLabel: FDADrugLabel,
    drugName: string,
  ): DosageInfo | null {
    const dosageTexts = drugLabel.dosage_and_administration || [];
    if (dosageTexts.length === 0) return null;

    const combinedText = dosageTexts.join(' ').toLowerCase();

    // Check if it's prescription-only and block dosage
    if (this.isPrescriptionDrug(drugName) && !this.isKnownOTC(drugName)) {
      return {
        adults:
          'This is a prescription medication. Consult your healthcare provider for proper dosing.',
        instructions:
          'Prescription medications require professional medical supervision for safe and effective use.',
        warnings:
          'Never take prescription medications without proper medical guidance.',
      };
    }

    return {
      adults: this.extractAdultDosage(combinedText),
      children: this.extractChildrenDosage(combinedText),
      frequency: this.extractFrequency(combinedText),
      instructions: this.extractInstructions(combinedText),
      warnings: this.extractWarnings(combinedText),
    };
  }

  /**
   * Extract usage information from FDA drug label
   */
  private extractFDAUsage(drugLabel: FDADrugLabel): UsageInfo | null {
    const usageTexts = drugLabel.indications_and_usage || [];
    const contraTexts = drugLabel.contraindications || [];

    if (usageTexts.length === 0) return null;

    const indications = usageTexts
      .map((text: string) => text.replace(/[\n\r]+/g, ' ').trim())
      .filter((text: string) => text.length > 10);

    const contraindications = contraTexts
      .map((text: string) => text.replace(/[\n\r]+/g, ' ').trim())
      .filter((text: string) => text.length > 10);

    return {
      indications,
      contraindications:
        contraindications.length > 0 ? contraindications : undefined,
    };
  }

  /**
   * Extract side effects information from FDA drug label
   */
  private extractFDASideEffects(
    drugLabel: FDADrugLabel,
  ): SideEffectsInfo | null {
    const adverseTexts = drugLabel.adverse_reactions || [];
    const warningTexts = drugLabel.warnings || [];

    if (adverseTexts.length === 0 && warningTexts.length === 0) return null;

    const allText = [...adverseTexts, ...warningTexts].join(' ').toLowerCase();

    return {
      common: this.extractCommonSideEffects(allText),
      serious: this.extractSeriousSideEffects(allText),
    };
  }

  /**
   * Build search terms from context, prioritizing RxNorm normalized terms
   */
  private buildSearchTerms(
    intent: DetectedIntent,
    context: RetrievalContext,
  ): string[] {
    const terms = new Set<string>();

    // Prioritize RxNorm normalized terms first (most reliable for US APIs)
    context.rxnormResults?.forEach((result) => {
      terms.add(result.name); // This should include "acetaminophen" for "paracetamol"
      result.synonyms.forEach((synonym) => terms.add(synonym));
    });

    // Add original term only if no RxNorm results
    if (context.rxnormResults?.length === 0) {
      terms.add(intent.drugName);
    }

    // Add inventory terms (but lower priority)
    context.inventoryMatches?.slice(0, 2).forEach((match) => {
      if (match.genericName) terms.add(match.genericName);
      // Only add brand name if it's different from generic
      if (match.name !== match.genericName) {
        terms.add(match.name);
      }
    });

    const searchTerms = Array.from(terms)
      .filter((term) => term.length > 2)
      .filter((term) => !term.includes('pharma')) // Filter out company names
      .slice(0, 3); // Limit to top 3 terms

    console.log(`[ClinicalRetriever] Search terms: ${searchTerms.join(', ')}`);
    return searchTerms;
  }

  /**
   * Check if drug is prescription-only
   */
  private isPrescriptionDrug(drugName: string): boolean {
    const normalizedName = drugName.toLowerCase();

    // Check against known OTC list first
    if (this.isKnownOTC(normalizedName)) return false;

    // Common prescription indicators
    const prescriptionIndicators = [
      'antibiotic',
      'steroid',
      'insulin',
      'warfarin',
      'metformin',
      'lisinopril',
      'atorvastatin',
      'amoxicillin',
      'azithromycin',
    ];

    return prescriptionIndicators.some((indicator) =>
      normalizedName.includes(indicator),
    );
  }

  /**
   * Check if drug is known OTC
   */
  private isKnownOTC(drugName: string): boolean {
    const normalizedName = drugName.toLowerCase();
    return this.knownOTC.some(
      (otc) => normalizedName.includes(otc) || otc.includes(normalizedName),
    );
  }

  /**
   * Normalize drug name for API searches
   */
  private normalizeDrugName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, ' ');
  }

  /**
   * Format clinical data for retrieval context
   */
  private formatClinicalData(
    data: ClinicalData,
    intent: DetectedIntent,
  ): string {
    const lines = [
      `Drug: ${data.drugName}`,
      `RxCUI: ${data.rxcui}`,
      `Source: ${data.source}`,
      '',
    ];

    // Only include requested section based on intent
    if (intent.type === 'dosage' && data.sections.dosage) {
      lines.push('=== DOSAGE INFORMATION ===');
      const dosage = data.sections.dosage;
      if (dosage.adults) lines.push(`Adults: ${dosage.adults}`);
      if (dosage.children) lines.push(`Children: ${dosage.children}`);
      if (dosage.frequency) lines.push(`Frequency: ${dosage.frequency}`);
      if (dosage.instructions)
        lines.push(`Instructions: ${dosage.instructions}`);
      if (dosage.warnings) lines.push(`Warnings: ${dosage.warnings}`);
    } else if (intent.type === 'usage' && data.sections.usage) {
      lines.push('=== USAGE INFORMATION ===');
      const usage = data.sections.usage;
      if (usage.indications) {
        lines.push('Indications:');
        usage.indications.forEach((indication) =>
          lines.push(`- ${indication}`),
        );
      }
    } else if (intent.type === 'side-effects' && data.sections.sideEffects) {
      lines.push('=== SIDE EFFECTS ===');
      const sideEffects = data.sections.sideEffects;
      if (sideEffects.common.length > 0) {
        lines.push('Common side effects:');
        sideEffects.common.forEach((effect) => lines.push(`- ${effect}`));
      }
      if (sideEffects.serious.length > 0) {
        lines.push('Serious side effects:');
        sideEffects.serious.forEach((effect) => lines.push(`- ${effect}`));
      }
    } else {
      // General query - include available sections
      Object.entries(data.sections).forEach(([section, sectionData]) => {
        lines.push(`=== ${section.toUpperCase()} ===`);
        lines.push(JSON.stringify(sectionData, null, 2));
      });
    }

    return lines.join('\n');
  }

  // Helper methods for text extraction (simplified versions)
  private extractContentFromXML(xml: string): string | null {
    const contentMatch =
      xml.match(/<content[^>]*>([^<]+)<\/content>/i) ||
      xml.match(/<summary[^>]*>([^<]+)<\/summary>/i);
    return contentMatch ? contentMatch[1] : null;
  }

  private extractDosageFromText(text: string): DosageInfo | null {
    const dosageMatch = text.match(/(?:dose|dosage|take)[\s:]+([^.!?]+)/i);
    return dosageMatch ? { adults: dosageMatch[1].trim() } : null;
  }

  private extractUsageFromText(text: string): UsageInfo | null {
    const usageMatch = text.match(/(?:used|treats|for)[\s:]+([^.!?]+)/i);
    return usageMatch ? { indications: [usageMatch[1].trim()] } : null;
  }

  private extractSideEffectsFromText(text: string): SideEffectsInfo | null {
    const sideEffectsMatch = text.match(/(?:side effects?)[\s:]+([^.!?]+)/i);
    return sideEffectsMatch
      ? { common: [sideEffectsMatch[1].trim()], serious: [] }
      : null;
  }

  private extractAdultDosage(text: string): string | undefined {
    const adultMatch = text.match(/(?:adults?|adult dose)[\s:]+([^.!?\n]+)/i);
    return adultMatch ? adultMatch[1].trim() : undefined;
  }

  private extractChildrenDosage(text: string): string | undefined {
    const childMatch = text.match(/(?:children?|pediatric)[\s:]+([^.!?\n]+)/i);
    return childMatch ? childMatch[1].trim() : undefined;
  }

  private extractFrequency(text: string): string | undefined {
    const freqMatch = text.match(
      /(?:frequency|times?|daily|hourly)[\s:]+([^.!?\n]+)/i,
    );
    return freqMatch ? freqMatch[1].trim() : undefined;
  }

  private extractInstructions(text: string): string | undefined {
    const instrMatch = text.match(
      /(?:instructions?|how to take)[\s:]+([^.!?\n]+)/i,
    );
    return instrMatch ? instrMatch[1].trim() : undefined;
  }

  private extractWarnings(text: string): string | undefined {
    const warnMatch = text.match(/(?:warning|caution)[\s:]+([^.!?\n]+)/i);
    return warnMatch ? warnMatch[1].trim() : undefined;
  }

  private extractCommonSideEffects(text: string): string[] {
    const commonMatch = text.match(
      /(?:common|frequent)[\s\w]*(?:side effects?|reactions?)[\s:]+([^.!?\n]+)/i,
    );
    if (commonMatch) {
      return commonMatch[1]
        .split(/[,;]/)
        .map((effect) => effect.trim())
        .filter(Boolean);
    }
    return [];
  }

  private extractSeriousSideEffects(text: string): string[] {
    const seriousMatch = text.match(
      /(?:serious|severe)[\s\w]*(?:side effects?|reactions?)[\s:]+([^.!?\n]+)/i,
    );
    if (seriousMatch) {
      return seriousMatch[1]
        .split(/[,;]/)
        .map((effect) => effect.trim())
        .filter(Boolean);
    }
    return [];
  }
}
