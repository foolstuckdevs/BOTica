import type { UserQuery, DetectedIntent } from './types';

/**
 * Pattern-based intent detector for medical queries
 * Uses regex patterns to identify intent types and extract drug names
 */
export class IntentDetector {
  private dosagePatterns: RegExp[];
  private usagePatterns: RegExp[];
  private sideEffectsPatterns: RegExp[];
  private drugNameExtractors: RegExp[];

  constructor() {
    // Dosage detection patterns
    this.dosagePatterns = [
      /\b(?:dosage|dose|how much|amount|quantity|mg|ml|tablets?|pills?)\s+(?:of\s+|for\s+)?([a-zA-Z0-9\s-]+)/i,
      /\b([a-zA-Z0-9\s-]+)\s+(?:dosage|dose|how much|amount)/i,
      /\bhow\s+much\s+([a-zA-Z0-9\s-]+)\s+(?:should|can|to)/i,
      /\bwhat\s+(?:is\s+the\s+)?(?:dosage|dose)\s+(?:of\s+|for\s+)?([a-zA-Z0-9\s-]+)/i,
      /\b([a-zA-Z0-9\s-]+)\s+(?:maximum|max|minimum|min)\s+(?:dose|dosage)/i,
    ];

    // Usage detection patterns
    this.usagePatterns = [
      /\b(?:usage|use|uses|indication|what\s+is)\s+(?:of\s+|for\s+)?([a-zA-Z0-9\s-]+)/i,
      /\bwhat\s+(?:is\s+)?([a-zA-Z0-9\s-]+)\s+(?:used\s+for|for)/i,
      /\bhow\s+(?:to\s+use|do\s+I\s+use)\s+([a-zA-Z0-9\s-]+)/i,
      /\b([a-zA-Z0-9\s-]+)\s+(?:indication|purpose|treatment)/i,
      /\bwhen\s+(?:to\s+take|should\s+I\s+take)\s+([a-zA-Z0-9\s-]+)/i,
    ];

    // Side effects detection patterns
    this.sideEffectsPatterns = [
      /\b(?:side\s+effects?|adverse\s+effects?|reactions?)\s+(?:of\s+|for\s+)?([a-zA-Z0-9\s-]+)/i,
      /\b([a-zA-Z0-9\s-]+)\s+(?:side\s+effects?|adverse\s+effects?)/i,
      /\bwhat\s+are\s+the\s+(?:side\s+effects?|risks?)\s+of\s+([a-zA-Z0-9\s-]+)/i,
      /\bdoes\s+([a-zA-Z0-9\s-]+)\s+(?:have|cause)\s+(?:side\s+effects?|reactions?)/i,
      /\b([a-zA-Z0-9\s-]+)\s+(?:warnings?|precautions?|contraindications?)/i,
    ];

    // Drug name extractors (fallback patterns)
    this.drugNameExtractors = [
      /\b(?:about|regarding|concerning)\s+([a-zA-Z0-9\s-]+)/i,
      /\btell\s+me\s+about\s+([a-zA-Z0-9\s-]+)/i,
      /\binformation\s+(?:on|about)\s+([a-zA-Z0-9\s-]+)/i,
      /\b([a-zA-Z0-9\s-]+)\s+(?:information|details|facts)/i,
    ];
  }

  /**
   * Detect intent from user query
   */
  public detectIntent(query: UserQuery): DetectedIntent {
    const normalizedQuery = query.text.toLowerCase().trim();

    // Try dosage patterns first (most specific)
    const dosageMatch = this.matchPatterns(
      normalizedQuery,
      this.dosagePatterns,
    );
    if (dosageMatch.matched && dosageMatch.pattern) {
      return {
        type: 'dosage',
        drugName: this.cleanDrugName(dosageMatch.drugName),
        confidence: this.calculatePatternConfidence(
          dosageMatch.pattern,
          normalizedQuery,
        ),
        rawQuery: query.text,
      };
    }

    // Try usage patterns
    const usageMatch = this.matchPatterns(normalizedQuery, this.usagePatterns);
    if (usageMatch.matched && usageMatch.pattern) {
      return {
        type: 'usage',
        drugName: this.cleanDrugName(usageMatch.drugName),
        confidence: this.calculatePatternConfidence(
          usageMatch.pattern,
          normalizedQuery,
        ),
        rawQuery: query.text,
      };
    }

    // Try side effects patterns
    const sideEffectsMatch = this.matchPatterns(
      normalizedQuery,
      this.sideEffectsPatterns,
    );
    if (sideEffectsMatch.matched && sideEffectsMatch.pattern) {
      return {
        type: 'side-effects',
        drugName: this.cleanDrugName(sideEffectsMatch.drugName),
        confidence: this.calculatePatternConfidence(
          sideEffectsMatch.pattern,
          normalizedQuery,
        ),
        rawQuery: query.text,
      };
    }

    // Fallback to general drug name extraction
    const generalMatch = this.matchPatterns(
      normalizedQuery,
      this.drugNameExtractors,
    );
    if (generalMatch.matched) {
      return {
        type: 'general',
        drugName: this.cleanDrugName(generalMatch.drugName),
        confidence: 0.5,
        rawQuery: query.text,
      };
    }

    // No clear intent detected
    return {
      type: 'unknown',
      drugName: this.extractPotentialDrugName(normalizedQuery),
      confidence: 0.2,
      rawQuery: query.text,
    };
  }

  /**
   * Match query against pattern arrays
   */
  private matchPatterns(
    query: string,
    patterns: RegExp[],
  ): {
    matched: boolean;
    drugName: string;
    pattern?: RegExp;
  } {
    for (const pattern of patterns) {
      const match = query.match(pattern);
      if (match && match[1]) {
        return {
          matched: true,
          drugName: match[1].trim(),
          pattern,
        };
      }
    }
    return { matched: false, drugName: '' };
  }

  /**
   * Calculate confidence based on pattern specificity and match quality
   */
  private calculatePatternConfidence(pattern: RegExp, query: string): number {
    const match = query.match(pattern);
    if (!match) return 0;

    let confidence = 0.7; // Base confidence for pattern match

    // Boost confidence for explicit keywords
    if (/\b(?:dosage|dose|how much)\b/i.test(query)) confidence += 0.2;
    if (/\b(?:usage|used for|indication)\b/i.test(query)) confidence += 0.2;
    if (/\b(?:side effects|adverse effects)\b/i.test(query)) confidence += 0.2;

    // Reduce confidence for vague queries
    if (query.length < 10) confidence -= 0.2;
    if (!match[1] || match[1].length < 3) confidence -= 0.3;

    return Math.min(Math.max(confidence, 0.1), 1.0);
  }

  /**
   * Clean and normalize extracted drug name
   */
  private cleanDrugName(drugName: string): string {
    if (!drugName) return '';

    return drugName
      .toLowerCase()
      .replace(/\b(?:tablet|pill|capsule|mg|ml|dose|dosage)s?\b/gi, '')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, ' ');
  }

  /**
   * Extract potential drug name when no clear pattern matches
   */
  private extractPotentialDrugName(query: string): string {
    // Remove common question words and medical terms
    const cleanedQuery = query
      .replace(
        /\b(?:what|how|when|where|why|is|are|the|a|an|and|or|but|for|of|to|in|on|at|by|with|about|tell|me|information|details)\b/gi,
        '',
      )
      .replace(/\b(?:medicine|medication|drug|pills?|tablets?)\b/gi, '')
      .trim();

    // Take the first significant word that might be a drug name
    const words = cleanedQuery.split(/\s+/).filter((word) => word.length > 2);
    return words[0] || '';
  }

  /**
   * Validate if extracted drug name looks legitimate
   */
  public isValidDrugName(drugName: string): boolean {
    if (!drugName || drugName.length < 3) return false;

    // Check for common patterns in drug names
    const validPatterns = [
      /^[a-zA-Z][a-zA-Z0-9\s-]*$/, // Starts with letter, contains letters/numbers/spaces/hyphens
      /\b(?:acetaminophen|paracetamol|ibuprofen|aspirin|tylenol|advil)\b/i, // Common medications
    ];

    return validPatterns.some((pattern) => pattern.test(drugName));
  }

  /**
   * Get intent type priority for handling multiple matches
   */
  public getIntentPriority(intentType: DetectedIntent['type']): number {
    const priorities = {
      dosage: 3,
      'side-effects': 2,
      usage: 2,
      general: 1,
      unknown: 0,
    };
    return priorities[intentType] || 0;
  }
}
