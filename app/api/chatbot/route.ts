import { NextRequest, NextResponse } from 'next/server';
import { BoticaAgent } from '@/lib/chatbot/agents/agent';
import type { ChatbotResponse } from '@/lib/chatbot/types';
import { z } from 'zod';

// Request validation schema
const ChatbotRequestSchema = z.object({
  message: z.string().min(1).max(1000),
  userId: z.string().optional(),
  pharmacyId: z.number().int().positive(),
  sessionId: z.string().optional(),
});

// Global agent instance (singleton pattern)
let agent: BoticaAgent | null = null;

/**
 * Initialize the agent singleton
 */
function getAgent(): BoticaAgent {
  if (!agent) {
    console.log('[ChatbotAPI] Initializing new agent instance');
    agent = new BoticaAgent();
  }
  return agent;
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

    // Get agent and process query
    const pharmacyAgent = getAgent();
    const response = await pharmacyAgent.processQuery(validatedRequest);

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
        initialized: !!agent,
        type: 'SimplePharmacyAgent',
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
