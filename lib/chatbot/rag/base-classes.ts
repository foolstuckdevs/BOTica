import { Document } from '@langchain/core/documents';
import type { DetectedIntent, RetrievalContext } from './types';

/**
 * Configuration interface for retrievers
 */
interface RetrieverConfig {
  timeout?: number;
  maxResults?: number;
  enableCache?: boolean;
  [key: string]: unknown;
}

/**
 * Base class for all RAG retrievers in our system
 * Each retriever focuses on a specific data source (inventory, RxNorm, clinical APIs)
 */
export abstract class BaseRAGRetriever {
  protected config: RetrieverConfig;

  constructor(config: RetrieverConfig = {}) {
    this.config = config;
  }

  /**
   * Main retrieval method that LangChain will call
   */
  abstract _getRelevantDocuments(query: string): Promise<Document[]>;

  /**
   * Context-aware retrieval with intent and previous results
   */
  abstract retrieveWithContext(
    intent: DetectedIntent,
    context: RetrievalContext,
  ): Promise<Document[]>;

  /**
   * Validate and clean retrieved data
   */
  protected validateData(data: unknown): boolean {
    return data !== null && data !== undefined;
  }

  /**
   * Handle retrieval errors gracefully
   */
  protected handleError(error: Error, context: string): Document[] {
    console.error(`${context} retrieval error:`, error);
    return [];
  }
}

/**
 * Base class for response compilation
 */
export abstract class BaseResponseCompiler {
  protected config: RetrieverConfig;

  constructor(config: RetrieverConfig = {}) {
    this.config = config;
  }

  /**
   * Compile retrieved context into final response
   */
  abstract compile(context: RetrievalContext): Promise<string>;

  /**
   * Generate appropriate disclaimers based on content type
   */
  protected generateDisclaimers(intent: DetectedIntent): string[] {
    const disclaimers = [
      'This information is for educational purposes only and should not replace professional medical advice.',
    ];

    if (intent.type === 'dosage') {
      disclaimers.push(
        'Always consult your healthcare provider for proper dosing instructions.',
      );
    }

    return disclaimers;
  }
}

/**
 * Utility functions for RAG pipeline
 */
export class RAGUtils {
  /**
   * Normalize drug names for better matching
   */
  static normalizeDrugName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .trim()
      .replace(/\s+/g, ' ');
  }

  /**
   * Extract key terms from user query
   */
  static extractKeyTerms(query: string): string[] {
    const stopWords = [
      'for',
      'of',
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'from',
      'up',
      'out',
      'what',
      'how',
      'when',
      'where',
      'why',
    ];
    return query
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.includes(word))
      .map((word) => word.replace(/[^\w]/g, ''));
  }

  /**
   * Calculate confidence score based on match quality
   */
  static calculateConfidence(
    matches: Array<{ name?: string }>,
    query: string,
  ): number {
    if (matches.length === 0) return 0;

    const queryTerms = this.extractKeyTerms(query);
    let totalScore = 0;

    matches.forEach((match) => {
      const matchTerms = this.extractKeyTerms(match.name || '');
      const commonTerms = queryTerms.filter((term) =>
        matchTerms.some(
          (matchTerm) => matchTerm.includes(term) || term.includes(matchTerm),
        ),
      );
      totalScore += commonTerms.length / queryTerms.length;
    });

    return Math.min(totalScore / matches.length, 1.0);
  }

  /**
   * Merge clinical data from multiple sources
   */
  static mergeClinicalData(
    sources: Array<{
      dosage?: Record<string, unknown>;
      usage?: {
        indications?: string[];
        contraindications?: string[];
      };
      sideEffects?: {
        common?: string[];
        serious?: string[];
      };
    }>,
  ): {
    dosage: Record<string, unknown>;
    usage: {
      indications: string[];
      contraindications: string[];
    };
    sideEffects: {
      common: string[];
      serious: string[];
    };
  } {
    const merged = {
      dosage: {} as Record<string, unknown>,
      usage: { indications: [] as string[], contraindications: [] as string[] },
      sideEffects: { common: [] as string[], serious: [] as string[] },
    };

    sources.forEach((source) => {
      if (source.dosage) {
        Object.assign(merged.dosage, source.dosage);
      }
      if (source.usage) {
        merged.usage.indications = [
          ...merged.usage.indications,
          ...(source.usage.indications || []),
        ];
        merged.usage.contraindications = [
          ...merged.usage.contraindications,
          ...(source.usage.contraindications || []),
        ];
      }
      if (source.sideEffects) {
        merged.sideEffects.common = [
          ...merged.sideEffects.common,
          ...(source.sideEffects.common || []),
        ];
        merged.sideEffects.serious = [
          ...merged.sideEffects.serious,
          ...(source.sideEffects.serious || []),
        ];
      }
    });

    // Remove duplicates
    merged.usage.indications = [...new Set(merged.usage.indications)];
    merged.usage.contraindications = [
      ...new Set(merged.usage.contraindications),
    ];
    merged.sideEffects.common = [...new Set(merged.sideEffects.common)];
    merged.sideEffects.serious = [...new Set(merged.sideEffects.serious)];

    return merged;
  }
}
