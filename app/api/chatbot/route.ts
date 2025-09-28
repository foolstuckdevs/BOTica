import { NextRequest, NextResponse } from 'next/server';
import { RAGOrchestrator } from '@/lib/chatbot/rag';
import type { UserQuery, ChatbotResponse } from '@/lib/chatbot/rag/types';
import { z } from 'zod';

// Request validation schema
const ChatbotRequestSchema = z.object({
  message: z.string().min(1).max(1000),
  userId: z.string().optional(),
  pharmacyId: z.number().int().positive(),
  sessionId: z.string().optional(),
});

// Global RAG orchestrator instance (singleton pattern)
let ragOrchestrator: RAGOrchestrator | null = null;

/**
 * Convert RAG response to ChatbotResponse format for compatibility
 */
async function convertRAGResponse(
  ragResponse: string,
): Promise<ChatbotResponse> {
  // Extract information from RAG response for structured format
  const hasInventoryInfo =
    ragResponse.includes('Available in pharmacy:') ||
    ragResponse.includes('In Stock');
  const hasClinicalInfo =
    ragResponse.includes('Dosage') ||
    ragResponse.includes('Usage') ||
    ragResponse.includes('Side effects');

  // Extract sources
  const sources = [];
  if (ragResponse.includes('FDA Drug Labels')) sources.push('FDA Drug Labels');
  if (ragResponse.includes('MedlinePlus')) sources.push('MedlinePlus');
  if (ragResponse.includes('RxNorm')) sources.push('RxNorm');
  if (ragResponse.includes('Pharmacy Inventory'))
    sources.push('Pharmacy Inventory');

  // Calculate confidence based on available data
  let confidence = 0.5;
  if (hasClinicalInfo) confidence += 0.3;
  if (hasInventoryInfo) confidence += 0.2;
  if (sources.length > 2) confidence += 0.1;
  confidence = Math.min(confidence, 1.0);

  // Extract inventory information if present
  let inventory = null;
  const inventoryMatch = ragResponse.match(
    /Available in pharmacy: ([^-]+)(?:-.*)?/,
  );
  if (inventoryMatch) {
    const productName = inventoryMatch[1].trim();
    const inStockMatch = ragResponse.match(/In Stock|Out of Stock/);
    const priceMatch = ragResponse.match(/₱(\d+(?:\.\d+)?)/);

    inventory = [
      {
        id: 0, // Placeholder ID
        name: productName,
        dosageForm: 'Unknown',
        quantity: inStockMatch && inStockMatch[0] === 'In Stock' ? 1 : 0,
        sellingPrice: priceMatch ? priceMatch[1] : '0.00',
        inStock: inStockMatch ? inStockMatch[0] === 'In Stock' : false,
        unit: 'piece',
        categoryName: undefined,
      },
    ];
  }

  // Extract clinical information if present
  let clinical = null;
  if (hasClinicalInfo) {
    const dosageMatch = ragResponse.match(/(?:Adults?:|Dosage:)([^•\n]+)/i);
    const usageMatch = ragResponse.match(
      /(?:treats|used for|indicated for)([^•\n]+)/i,
    );
    const sideEffectsMatch = ragResponse.match(
      /(?:side effects?|common)([^•\n]+)/i,
    );

    clinical = {
      dosage: dosageMatch ? dosageMatch[1].trim() : undefined,
      usage: usageMatch ? usageMatch[1].trim() : undefined,
      sideEffects: sideEffectsMatch ? sideEffectsMatch[1].trim() : undefined,
      source: sources[0] || 'RAG System',
    };
  }

  return {
    ui: {
      staffMessage: ragResponse, // The RAG response becomes the staff message
      detailedNotes: `• Sources: ${
        sources.join(', ') || 'None'
      }\n• Confidence: ${(confidence * 100).toFixed(
        0,
      )}%\n• Processing: RAG Pipeline\n• Inventory: ${
        inventory ? 'Found' : 'Not found'
      }\n• Clinical: ${clinical ? 'Available' : 'Not available'}`,
    },
    inventory,
    clinical,
    sources,
    confidence,
  };
}

/**
 * Initialize the RAG orchestrator singleton
 */
function getRAGOrchestrator(): RAGOrchestrator {
  if (!ragOrchestrator) {
    console.log('[ChatbotAPI] Initializing new RAG orchestrator');
    ragOrchestrator = new RAGOrchestrator({
      maxInventoryResults: 5,
      rxnormTimeout: 10000,
      clinicalTimeout: 15000,
      enableCache: false,
      fallbackToGeneric: true,
    });
  }
  return ragOrchestrator;
}

/**
 * POST /api/chatbot
 *
 * Main chatbot endpoint for BOTica pharmacy assistant
 * Handles user queries and returns structured responses
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    console.log('[ChatbotAPI] Received POST request');

    // Parse and validate request body
    const body = await request.json();
    const validatedRequest = ChatbotRequestSchema.parse(body);

    console.log(`[ChatbotAPI] Processing query: "${validatedRequest.message}"`);

    // Check environment variables
    if (!process.env.AI_API_KEY) {
      console.error('[ChatbotAPI] Missing AI_API_KEY environment variable');
      return NextResponse.json(
        {
          error: 'Service configuration error',
          ui: {
            staffMessage:
              'Chatbot service unavailable - AI configuration missing. Use manual processes.',
            detailedNotes:
              '• AI service not configured properly\n• Missing API key in environment\n• Recommend checking .env.local file',
          },
          inventory: null,
          clinical: null,
          sources: [],
          confidence: 0.0,
        } as ChatbotResponse,
        { status: 503 },
      );
    }

    // Get RAG orchestrator and process query
    const ragOrchestrator = getRAGOrchestrator();

    // Create user query object
    const userQuery: UserQuery = {
      text: validatedRequest.message,
      userId: validatedRequest.userId,
      timestamp: new Date(),
    };

    // Process query through RAG pipeline
    const ragResponse = await ragOrchestrator.processQuery(userQuery);

    // Convert RAG response to ChatbotResponse format
    const response: ChatbotResponse = await convertRAGResponse(ragResponse);

    const processingTime = Date.now() - startTime;
    console.log(`[ChatbotAPI] Query processed in ${processingTime}ms`);

    // Add metadata to response
    const enrichedResponse = {
      ...response,
      _metadata: {
        processingTime,
        timestamp: new Date().toISOString(),
        sessionId: validatedRequest.sessionId,
        userId: validatedRequest.userId,
      },
    };

    return NextResponse.json(enrichedResponse, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;

    console.error('[ChatbotAPI] Request processing failed:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      const validationErrors = error.issues.map((issue) => issue.message);
      return NextResponse.json(
        {
          error: 'Invalid request format',
          details: validationErrors,
          ui: {
            staffMessage:
              'Invalid request format detected. Check query structure.',
            detailedNotes: `• Request validation failed\n• Errors: ${validationErrors.join(
              ', ',
            )}\n• Required: message (string), pharmacyId (number)`,
          },
          inventory: null,
          clinical: null,
          sources: [],
          confidence: 0.0,
          _metadata: {
            processingTime,
            timestamp: new Date().toISOString(),
            error: 'validation_error',
          },
        } as ChatbotResponse & { error: string; details: string[] },
        { status: 400 },
      );
    }

    // Handle other errors
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: 'Internal server error',
        ui: {
          staffMessage: 'System error occurred. Manual processes required.',
          detailedNotes: `• System error occurred\n• Error: ${errorMessage}\n• Processing time: ${processingTime}ms\n• Recommend system restart or manual database query`,
        },
        inventory: null,
        clinical: null,
        sources: [],
        confidence: 0.0,
        _metadata: {
          processingTime,
          timestamp: new Date().toISOString(),
          error: 'system_error',
        },
      } as ChatbotResponse & { error: string },
      { status: 500 },
    );
  }
}

/**
 * GET /api/chatbot
 *
 * Health check endpoint
 */
export async function GET(): Promise<NextResponse> {
  try {
    console.log('[ChatbotAPI] Health check requested');

    const status = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      agent: {
        initialized: !!ragOrchestrator,
        type: 'RAG-PharmacyAssistant',
      },
      environment: {
        hasApiKey: !!process.env.AI_API_KEY,
        hasDbUrl: !!process.env.DATABASE_URL,
        model: process.env.AI_MODEL || 'gpt-4o-mini',
      },
    };

    return NextResponse.json(status, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('[ChatbotAPI] Health check failed:', error);

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        version: '1.0.0',
      },
      { status: 503 },
    );
  }
}

/**
 * OPTIONS /api/chatbot
 *
 * CORS preflight handler
 */
export async function OPTIONS(): Promise<NextResponse> {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    },
  );
}
