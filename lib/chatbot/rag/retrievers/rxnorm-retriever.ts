import { Document } from '@langchain/core/documents';
import { BaseRAGRetriever } from '../base-classes';
import type { DetectedIntent, RetrievalContext, RxNormResult } from '../types';

/**
 * RxNorm API response interfaces
 */
interface RxNavCandidate {
  rxcui: string;
  score?: string;
  rank?: string;
}

interface RxNavProperty {
  propName: string;
  propValue: string;
  tty?: string;
}

interface RxNavExactResponse {
  idGroup?: {
    rxnormId?: string[];
  };
}

interface RxNavApproxResponse {
  approximateGroup?: {
    candidate?: RxNavCandidate[];
  };
}

interface RxNavSpellingResponse {
  suggestionGroup?: {
    suggestionList?: {
      suggestion?: string[];
    };
  };
}

/**
 * RxNorm retriever that normalizes drug names and gets RxCUI codes
 * Uses NIH RxNav API for standardized medication identification
 */
export class RxNormRetriever extends BaseRAGRetriever {
  private readonly baseUrl = 'https://rxnav.nlm.nih.gov/REST';
  private readonly timeout = 10000;

  constructor(
    config: { enableSpellCheck?: boolean; maxResults?: number } = {},
  ) {
    super({
      enableSpellCheck: true,
      maxResults: 5,
      ...config,
    });
  }

  /**
   * Main LangChain retrieval method
   */
  async _getRelevantDocuments(query: string): Promise<Document[]> {
    const results = await this.normalizeToRxCUI(query);

    return results.map(
      (result) =>
        new Document({
          pageContent: this.formatRxNormResult(result),
          metadata: {
            type: 'rxnorm',
            rxcui: result.rxcui,
            name: result.name,
            confidence: this.calculateConfidence(result),
          },
        }),
    );
  }

  /**
   * Context-aware retrieval using detected intent and inventory matches
   */
  async retrieveWithContext(
    intent: DetectedIntent,
    context: RetrievalContext,
  ): Promise<Document[]> {
    console.log(
      `[RxNormRetriever] Normalizing "${intent.drugName}" for ${intent.type} query`,
    );

    // Try multiple drug name variations from inventory matches
    const searchTerms = this.buildSearchTerms(intent, context);
    const allResults: RxNormResult[] = [];

    for (const term of searchTerms) {
      const results = await this.normalizeToRxCUI(term);
      allResults.push(...results);
    }

    // Remove duplicates and sort by confidence
    const uniqueResults = this.deduplicateResults(allResults);
    const sortedResults = uniqueResults
      .sort((a, b) => this.calculateConfidence(b) - this.calculateConfidence(a))
      .slice(0, this.config.maxResults as number);

    // Store results in context for downstream retrievers
    context.rxnormResults = sortedResults;

    console.log(
      `[RxNormRetriever] Found ${sortedResults.length} normalized results`,
    );

    return sortedResults.map(
      (result) =>
        new Document({
          pageContent: this.formatRxNormResult(result, intent),
          metadata: {
            type: 'rxnorm',
            rxcui: result.rxcui,
            name: result.name,
            synonyms: result.synonyms,
            tty: result.tty,
            confidence: this.calculateConfidence(result),
            relevantFor: intent.type,
          },
        }),
    );
  }

  /**
   * Normalize drug name to RxCUI using multiple strategies
   */
  private async normalizeToRxCUI(drugName: string): Promise<RxNormResult[]> {
    const results: RxNormResult[] = [];
    const normalizedName = this.normalizeDrugName(drugName);

    try {
      // Strategy 1: Exact match
      const exactResult = await this.exactMatch(normalizedName);
      if (exactResult) {
        results.push(exactResult);
      }

      // Strategy 2: Approximate match
      if (results.length === 0) {
        const approxResults = await this.approximateMatch(normalizedName);
        results.push(...approxResults);
      }

      // Strategy 3: Spelling suggestions (fallback)
      if (results.length === 0 && this.config.enableSpellCheck) {
        const spellResults = await this.spellingMatch(normalizedName);
        results.push(...spellResults);
      }

      return results;
    } catch (error) {
      console.error(
        `[RxNormRetriever] Error normalizing "${drugName}":`,
        error,
      );
      return [];
    }
  }

  /**
   * Try exact match search
   */
  private async exactMatch(drugName: string): Promise<RxNormResult | null> {
    try {
      const url = `${this.baseUrl}/rxcui?name=${encodeURIComponent(drugName)}`;
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) return null;

      const data: RxNavExactResponse = await response.json();
      const rxcuis = data.idGroup?.rxnormId;

      if (rxcuis && rxcuis.length > 0) {
        const details = await this.getRxCUIDetails(rxcuis[0]);
        return {
          rxcui: rxcuis[0],
          name: details?.name || drugName, // Use normalized name from API, fallback to original
          synonyms: details?.synonyms || [],
          tty: details?.tty || 'UNKNOWN',
          language: 'ENG',
        };
      }

      return null;
    } catch (error) {
      console.warn(
        `[RxNormRetriever] Exact match failed for "${drugName}":`,
        error,
      );
      return null;
    }
  }

  /**
   * Try approximate match search
   */
  private async approximateMatch(drugName: string): Promise<RxNormResult[]> {
    try {
      const url = `${this.baseUrl}/approximateTerm?term=${encodeURIComponent(
        drugName,
      )}`;
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) return [];

      const data: RxNavApproxResponse = await response.json();
      const candidates = data.approximateGroup?.candidate;

      if (!candidates) return [];

      const results: RxNormResult[] = [];

      // Process top candidates
      for (const candidate of candidates.slice(0, 3)) {
        const details = await this.getRxCUIDetails(candidate.rxcui);
        if (details) {
          results.push({
            rxcui: candidate.rxcui,
            name: details.name || drugName,
            synonyms: details.synonyms || [],
            tty: details.tty || 'UNKNOWN',
            language: 'ENG',
            score: candidate.score,
          });
        }
      }

      return results;
    } catch (error) {
      console.warn(
        `[RxNormRetriever] Approximate match failed for "${drugName}":`,
        error,
      );
      return [];
    }
  }

  /**
   * Try spelling suggestions as fallback
   */
  private async spellingMatch(drugName: string): Promise<RxNormResult[]> {
    try {
      const url = `${
        this.baseUrl
      }/spellingsuggestions?name=${encodeURIComponent(drugName)}`;
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) return [];

      const data: RxNavSpellingResponse = await response.json();
      const suggestions = data.suggestionGroup?.suggestionList?.suggestion;

      if (!suggestions) return [];

      const results: RxNormResult[] = [];

      // Try first few spelling suggestions
      for (const suggestion of suggestions.slice(0, 2)) {
        const exactResult = await this.exactMatch(suggestion);
        if (exactResult) {
          results.push(exactResult); // Keep the normalized name from exactMatch
        }
      }

      return results;
    } catch (error) {
      console.warn(
        `[RxNormRetriever] Spelling suggestions failed for "${drugName}":`,
        error,
      );
      return [];
    }
  }

  /**
   * Get detailed information about an RxCUI
   */
  private async getRxCUIDetails(rxcui: string): Promise<{
    name?: string;
    synonyms: string[];
    tty: string;
  } | null> {
    try {
      const url = `${this.baseUrl}/rxcui/${rxcui}/allProperties?prop=names`;
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) return null;

      const data = await response.json();
      const properties = data.propConceptGroup?.propConcept;

      if (!properties) return { synonyms: [], tty: 'UNKNOWN' };

      const names = properties
        .filter((prop: RxNavProperty) => prop.propName === 'RxNorm Name')
        .map((prop: RxNavProperty) => prop.propValue);

      return {
        name: names[0] || undefined,
        synonyms: names.slice(1),
        tty: properties[0]?.tty || 'UNKNOWN',
      };
    } catch (error) {
      console.warn(
        `[RxNormRetriever] Failed to get details for RxCUI ${rxcui}:`,
        error,
      );
      return { synonyms: [], tty: 'UNKNOWN' };
    }
  }

  /**
   * Build search terms from intent and context
   */
  private buildSearchTerms(
    intent: DetectedIntent,
    context: RetrievalContext,
  ): string[] {
    const terms = new Set<string>();

    // Primary term from intent
    terms.add(intent.drugName);

    // Terms from inventory matches
    context.inventoryMatches?.forEach((match) => {
      terms.add(match.name);
      if (match.genericName) terms.add(match.genericName);
      if (match.brand) terms.add(match.brand);
    });

    return Array.from(terms).filter((term) => term.length > 2);
  }

  /**
   * Remove duplicate RxNorm results
   */
  private deduplicateResults(results: RxNormResult[]): RxNormResult[] {
    const seen = new Set<string>();
    return results.filter((result) => {
      if (seen.has(result.rxcui)) return false;
      seen.add(result.rxcui);
      return true;
    });
  }

  /**
   * Calculate confidence score for RxNorm result
   */
  private calculateConfidence(result: RxNormResult): number {
    let confidence = 0.8; // Base confidence

    if (result.score) {
      // Use API score if available
      confidence = Math.min(0.95, parseInt(result.score) / 100);
    }

    // Boost for common term types
    if (result.tty === 'IN' || result.tty === 'PIN') confidence += 0.1; // Ingredient
    if (result.tty === 'SCD' || result.tty === 'GPCK') confidence += 0.05; // Semantic Clinical Drug

    return Math.min(confidence, 1.0);
  }

  /**
   * Normalize drug name for better API matching
   */
  private normalizeDrugName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, ' ');
  }

  /**
   * Format RxNorm result for retrieval context
   */
  private formatRxNormResult(
    result: RxNormResult,
    intent?: DetectedIntent,
  ): string {
    const lines = [
      `RxCUI: ${result.rxcui}`,
      `Name: ${result.name}`,
      result.tty ? `Type: ${result.tty}` : '',
      result.synonyms.length > 0
        ? `Synonyms: ${result.synonyms.join(', ')}`
        : '',
    ].filter(Boolean);

    if (intent) {
      lines.push(`Query Type: ${intent.type}`);
      lines.push('Note: Use this RxCUI for clinical data retrieval');
    }

    return lines.join('\n');
  }

  /**
   * Get the best RxCUI for a drug name
   */
  async getBestRxCUI(drugName: string): Promise<string | null> {
    const results = await this.normalizeToRxCUI(drugName);
    if (results.length === 0) return null;

    const best = results.sort(
      (a, b) => this.calculateConfidence(b) - this.calculateConfidence(a),
    )[0];
    return best.rxcui;
  }

  /**
   * Check if a drug name can be normalized
   */
  async canNormalize(drugName: string): Promise<boolean> {
    const rxcui = await this.getBestRxCUI(drugName);
    return rxcui !== null;
  }
}
