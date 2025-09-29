import { IntentDetector } from './intent-detector';
import { InventoryRetriever } from './retrievers/inventory-retriever';
import { RxNormRetriever } from './retrievers/rxnorm-retriever';
import { ClinicalRetriever } from './retrievers/clinical-retriever';
import { ResponseCompiler } from './compiler';
import type {
  UserQuery,
  DetectedIntent,
  RetrievalContext,
  RAGConfig,
} from './types';

/**
 * Main RAG orchestrator that coordinates the entire pipeline:
 * Intent Detection → Inventory Retrieval → RxNorm Normalization → Clinical Data → Response Compilation
 *
 * This replaces the complex tool chain with a streamlined, controllable pipeline
 */
export class RAGOrchestrator {
  private intentDetector: IntentDetector;
  private inventoryRetriever: InventoryRetriever;
  private rxnormRetriever: RxNormRetriever;
  private clinicalRetriever: ClinicalRetriever;
  private responseCompiler: ResponseCompiler;
  private config: RAGConfig;

  constructor(config: Partial<RAGConfig> = {}) {
    this.config = {
      maxInventoryResults: 5,
      rxnormTimeout: 10000,
      clinicalTimeout: 15000,
      enableCache: false,
      fallbackToGeneric: true,
      ...config,
    };

    // Initialize pipeline components
    this.intentDetector = new IntentDetector();

    this.inventoryRetriever = new InventoryRetriever({
      maxResults: this.config.maxInventoryResults,
      enableFuzzy: true,
    });

    this.rxnormRetriever = new RxNormRetriever({
      enableSpellCheck: true,
      maxResults: 3,
    });

    this.clinicalRetriever = new ClinicalRetriever({
      enableFallback: this.config.fallbackToGeneric,
    });

    this.responseCompiler = new ResponseCompiler({
      temperature: 0.1, // Low temperature for factual medical info
      maxTokens: 1000,
    });
  }

  /**
   * Process user query through the complete RAG pipeline
   */
  async processQuery(query: UserQuery): Promise<string> {
    console.log(`[RAGOrchestrator] Processing query: "${query.text}"`);

    const startTime = Date.now();

    try {
      // Step 1: Intent Detection
      const intent = await this.detectIntent(query);
      console.log(
        `[RAGOrchestrator] Detected intent: ${intent.type} for "${intent.drugName}" (confidence: ${intent.confidence})`,
      );

      // Step 2: Initialize retrieval context
      const context: RetrievalContext = {
        intent,
        inventoryMatches: [],
        rxnormResults: [],
        clinicalData: [],
        errors: [],
      };

      // Step 3: Execute retrieval pipeline
      await this.executeRetrievalPipeline(context);

      // Step 4: Compile final response
      const finalResponse = await this.responseCompiler.compile(context);

      const processingTime = Date.now() - startTime;
      console.log(`[RAGOrchestrator] Query processed in ${processingTime}ms`);

      return finalResponse;
    } catch (error) {
      console.error('[RAGOrchestrator] Pipeline error:', error);
      return this.handlePipelineError(query, error as Error);
    }
  }

  /**
   * Detect user intent from query
   */
  private async detectIntent(query: UserQuery): Promise<DetectedIntent> {
    try {
      const intent = this.intentDetector.detectIntent(query);

      // Validate intent quality
      if (intent.confidence < 0.3) {
        console.warn(
          `[RAGOrchestrator] Low confidence intent detection: ${intent.confidence}`,
        );
      }

      if (!this.intentDetector.isValidDrugName(intent.drugName)) {
        console.warn(
          `[RAGOrchestrator] Questionable drug name: "${intent.drugName}"`,
        );
      }

      return intent;
    } catch (error) {
      console.error('[RAGOrchestrator] Intent detection failed:', error);

      // Fallback intent
      return {
        type: 'unknown',
        drugName: query.text.slice(0, 50), // Take first part as potential drug name
        confidence: 0.1,
        rawQuery: query.text,
      };
    }
  }

  /**
   * Execute the retrieval pipeline in sequence
   */
  private async executeRetrievalPipeline(
    context: RetrievalContext,
  ): Promise<void> {
    // Step 1: Inventory Retrieval (fast local database query)
    await this.executeInventoryRetrieval(context);

    // Step 2: RxNorm Normalization (requires inventory or intent results)
    await this.executeRxNormRetrieval(context);

    // Step 3: Clinical Data Retrieval (requires RxNorm results for best results)
    await this.executeClinicalRetrieval(context);

    // Log pipeline results
    this.logPipelineResults(context);
  }

  /**
   * Execute inventory retrieval step
   */
  private async executeInventoryRetrieval(
    context: RetrievalContext,
  ): Promise<void> {
    try {
      console.log(
        `[RAGOrchestrator] Step 1: Inventory retrieval for "${context.intent.drugName}"`,
      );

      await this.inventoryRetriever.retrieveWithContext(
        context.intent,
        context,
      );

      console.log(
        `[RAGOrchestrator] Found ${context.inventoryMatches.length} inventory matches`,
      );

      if (context.inventoryMatches.length === 0) {
        console.log(
          `[RAGOrchestrator] No inventory matches for "${context.intent.drugName}"`,
        );
      }
    } catch (error) {
      console.error('[RAGOrchestrator] Inventory retrieval failed:', error);
      context.errors.push(`Inventory lookup failed: ${error}`);
    }
  }

  /**
   * Execute RxNorm normalization step
   */
  private async executeRxNormRetrieval(
    context: RetrievalContext,
  ): Promise<void> {
    try {
      console.log(`[RAGOrchestrator] Step 2: RxNorm normalization`);

      await this.rxnormRetriever.retrieveWithContext(context.intent, context);

      console.log(
        `[RAGOrchestrator] Found ${context.rxnormResults.length} RxNorm results`,
      );

      if (context.rxnormResults.length === 0) {
        console.warn(
          `[RAGOrchestrator] Failed to normalize "${context.intent.drugName}" with RxNorm`,
        );
        context.errors.push('Drug name normalization failed');
      }
    } catch (error) {
      console.error('[RAGOrchestrator] RxNorm retrieval failed:', error);
      context.errors.push(`Drug normalization failed: ${error}`);
    }
  }

  /**
   * Execute clinical data retrieval step
   */
  private async executeClinicalRetrieval(
    context: RetrievalContext,
  ): Promise<void> {
    try {
      console.log(`[RAGOrchestrator] Step 3: Clinical data retrieval`);

      await this.clinicalRetriever.retrieveWithContext(context.intent, context);

      console.log(
        `[RAGOrchestrator] Found ${context.clinicalData.length} clinical data sources`,
      );

      if (context.clinicalData.length === 0) {
        console.warn(
          `[RAGOrchestrator] No clinical data found for "${context.intent.drugName}"`,
        );
        context.errors.push('No clinical information available');
      }
    } catch (error) {
      console.error('[RAGOrchestrator] Clinical retrieval failed:', error);
      context.errors.push(`Clinical data retrieval failed: ${error}`);
    }
  }

  /**
   * Log pipeline results for debugging
   */
  private logPipelineResults(context: RetrievalContext): void {
    console.log(`[RAGOrchestrator] Pipeline Results Summary:`);
    console.log(
      `- Intent: ${context.intent.type} (${context.intent.confidence})`,
    );
    console.log(`- Inventory matches: ${context.inventoryMatches.length}`);
    console.log(`- RxNorm results: ${context.rxnormResults.length}`);
    console.log(`- Clinical data sources: ${context.clinicalData.length}`);
    console.log(`- Errors: ${context.errors.length}`);

    if (context.errors.length > 0) {
      console.log('Errors encountered:');
      context.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
  }

  /**
   * Handle pipeline-level errors
   */
  private handlePipelineError(query: UserQuery, error: Error): string {
    console.error('[RAGOrchestrator] Critical pipeline failure:', error);

    // Extract potential drug name for basic response
    const words = query.text.split(/\s+/);
    const potentialDrugName =
      words.find(
        (word) =>
          word.length > 3 &&
          !/\b(what|how|when|where|why|for|about|tell|me)\b/i.test(word),
      ) || 'the requested medication';

    return `I apologize, but I'm currently unable to process information about ${potentialDrugName}. This could be due to:

- Temporary service unavailability
- Network connectivity issues
- Invalid medication name

**What you can do:**
- Try rephrasing your question (e.g., "dosage for paracetamol")
- Check the spelling of the medication name
- Speak with our pharmacy staff for immediate assistance

**For urgent medical questions, please consult a healthcare professional.**`;
  }

  /**
   * Get processing statistics for monitoring
   */
  async getProcessingStats(): Promise<{
    intentDetectorReady: boolean;
    inventoryConnected: boolean;
    rxnormAvailable: boolean;
    clinicalApisAvailable: boolean;
  }> {
    const stats = {
      intentDetectorReady: true, // Pattern-based, always ready
      inventoryConnected: false,
      rxnormAvailable: false,
      clinicalApisAvailable: false,
    };

    try {
      // Test inventory connection
      await this.inventoryRetriever.getTopMatches('test', 1);
      stats.inventoryConnected = true;
    } catch (error) {
      console.warn(
        '[RAGOrchestrator] Inventory connection test failed:',
        error,
      );
    }

    try {
      // Test RxNorm API
      const rxnormTest = await this.rxnormRetriever.canNormalize('ibuprofen');
      stats.rxnormAvailable = rxnormTest;
    } catch (error) {
      console.warn('[RAGOrchestrator] RxNorm API test failed:', error);
    }

    try {
      // Test clinical APIs with a simple query
      const mockIntent: DetectedIntent = {
        type: 'general',
        drugName: 'test',
        confidence: 0.5,
        rawQuery: 'test',
      };
      const mockContext: RetrievalContext = {
        intent: mockIntent,
        inventoryMatches: [],
        rxnormResults: [],
        clinicalData: [],
        errors: [],
      };

      await this.clinicalRetriever.retrieveWithContext(mockIntent, mockContext);
      stats.clinicalApisAvailable = true; // If no error thrown, APIs are responsive
    } catch (error) {
      console.warn('[RAGOrchestrator] Clinical APIs test failed:', error);
    }

    return stats;
  }

  /**
   * Process a specific dosage query (convenience method)
   */
  async getDosageInfo(drugName: string, userId?: string): Promise<string> {
    const query: UserQuery = {
      text: `dosage for ${drugName}`,
      userId,
      timestamp: new Date(),
    };

    return this.processQuery(query);
  }

  /**
   * Process a specific usage query (convenience method)
   */
  async getUsageInfo(drugName: string, userId?: string): Promise<string> {
    const query: UserQuery = {
      text: `usage for ${drugName}`,
      userId,
      timestamp: new Date(),
    };

    return this.processQuery(query);
  }

  /**
   * Process a specific side effects query (convenience method)
   */
  async getSideEffectsInfo(drugName: string, userId?: string): Promise<string> {
    const query: UserQuery = {
      text: `side effects for ${drugName}`,
      userId,
      timestamp: new Date(),
    };

    return this.processQuery(query);
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<RAGConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('[RAGOrchestrator] Configuration updated:', newConfig);
  }

  /**
   * Get current configuration
   */
  getConfig(): RAGConfig {
    return { ...this.config };
  }
}
