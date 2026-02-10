/**
 * /api/pnf-chat — V2
 *
 * Single-pass streaming chatbot endpoint.
 * 1 embedding call + 1 LLM streaming call = fast responses.
 *
 * - No LangChain overhead
 * - Direct OpenAI streaming via SDK
 * - Direct Supabase RPC for vector search
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import OpenAI from 'openai';
import { searchPNF, buildContext } from '@/lib/rag/pnf-search';
import { buildMessages } from '@/lib/rag/pnf-prompt';
import { db } from '@/database/drizzle';
import { pnfChatLogs } from '@/database/schema';

/* ------------------------------------------------------------------ */
/*  Request validation                                                 */
/* ------------------------------------------------------------------ */

const requestSchema = z.object({
  question: z.string().min(1, 'Question must not be empty'),
  chatHistory: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      }),
    )
    .default([]),
  /** The drug the conversation is currently about */
  activeDrug: z.string().optional(),
});

/* ------------------------------------------------------------------ */
/*  Drug name extraction (heuristic — no LLM call)                    */
/* ------------------------------------------------------------------ */

/**
 * Words / short phrases that commonly appear after trigger words
 * ("about", "for", etc.) but are NOT drug names.  Used to prevent
 * the regex from treating "how about dosage?" as drug = "dosage".
 */
const NON_DRUG_TERMS = new Set([
  // PNF section / topic words
  'dosage', 'dose', 'doses', 'dosing',
  'side effect', 'side effects', 'adverse reaction', 'adverse reactions',
  'adverse effect', 'adverse effects',
  'contraindication', 'contraindications',
  'interaction', 'interactions', 'drug interaction', 'drug interactions',
  'precaution', 'precautions', 'warning', 'warnings',
  'indication', 'indications', 'use', 'uses',
  'administration', 'formulation', 'formulations',
  'pregnancy', 'pregnancy category', 'lactation',
  'dose adjustment', 'renal', 'hepatic',
  'classification', 'class',
  'overview', 'information', 'info', 'details',
  'mechanism', 'mechanism of action',
  'pharmacokinetics', 'pharmacology',
  'storage', 'stability',
  'comparison', 'difference', 'differences',
  // Generic follow-up words
  'that', 'this', 'it', 'its', 'the', 'them',
  'same', 'the same', 'the same drug',
]);

function extractDrugHint(
  question: string,
  chatHistory: Array<{ role: string; content: string }>,
  activeDrug?: string,
): string | undefined {
  // Check if user explicitly names a drug
  const directMatch = question.match(
    /(?:about|regarding|for|info on|information on|tell me about|what is|look up)\s+([a-z][a-z0-9\s\-\+\/]+)/i,
  );

  if (directMatch?.[1]) {
    const candidate = directMatch[1]
      .replace(/[?.!,;:'"]/g, '')
      .trim()
      .split(/\s+/)
      .slice(0, 4)
      .join(' ')
      .trim();

    // Strip leading filler words (its, the, their, etc.) before checking
    const stripped = candidate
      .replace(/^(its|the|their|his|her|my|your|this|that|some|any)\s+/i, '')
      .trim();

    // Only accept the candidate if the core term is NOT a known non-drug term
    const isNonDrug =
      NON_DRUG_TERMS.has(candidate.toLowerCase()) ||
      NON_DRUG_TERMS.has(stripped.toLowerCase());

    if (candidate.length > 2 && !isNonDrug) {
      return candidate;
    }
  }

  // If the question looks like a follow-up, keep the active drug
  const isFollowUp =
    /^(what|how|is|are|can|does|do|tell|show|list|give|any)\s/i.test(question) ||
    /^(dosage|dose|side effects?|contraindications?|interactions?|precautions?|indications?|adverse|formulations?|administration|pregnancy)/i.test(question);

  if (isFollowUp && activeDrug) {
    return activeDrug;
  }

  // Check recent history for drug context
  if (activeDrug) return activeDrug;

  // Scan backwards through history
  for (let i = chatHistory.length - 1; i >= 0; i--) {
    const entry = chatHistory[i];
    if (entry.role === 'user') {
      const histMatch = entry.content.match(
        /(?:about|for|regarding)\s+([a-z][a-z0-9\s\-]+)/i,
      );
      if (histMatch?.[1]) {
        return histMatch[1].trim();
      }
    }
  }

  return undefined;
}

/* ------------------------------------------------------------------ */
/*  Comparison query detection                                         */
/* ------------------------------------------------------------------ */

/**
 * Detect comparison queries and extract both drug names.
 * Returns an array of two drug names, or null if not a comparison.
 */
function extractComparisonDrugs(question: string): [string, string] | null {
  const q = question.trim();

  // "DrugA vs DrugB", "DrugA versus DrugB"
  const vsMatch = q.match(
    /([a-z][a-z0-9\s\-\+\/]+?)\s+(?:vs\.?|versus)\s+([a-z][a-z0-9\s\-\+\/]+)/i,
  );
  if (vsMatch) {
    return [vsMatch[1].trim(), vsMatch[2].trim()];
  }

  // "compare DrugA and DrugB"
  const compareMatch = q.match(
    /compare\s+([a-z][a-z0-9\s\-\+\/]+?)\s+(?:and|with|to)\s+([a-z][a-z0-9\s\-\+\/]+)/i,
  );
  if (compareMatch) {
    return [compareMatch[1].trim(), compareMatch[2].trim()];
  }

  // "difference between DrugA and DrugB"
  const diffMatch = q.match(
    /differenc\w*\s+between\s+([a-z][a-z0-9\s\-\+\/]+?)\s+and\s+([a-z][a-z0-9\s\-\+\/]+)/i,
  );
  if (diffMatch) {
    return [diffMatch[1].trim(), diffMatch[2].trim()];
  }

  // "DrugA and DrugB comparison"
  const andCompareMatch = q.match(
    /([a-z][a-z0-9\s\-\+\/]+?)\s+and\s+([a-z][a-z0-9\s\-\+\/]+?)\s+(?:comparison|compared|differences?)/i,
  );
  if (andCompareMatch) {
    return [andCompareMatch[1].trim(), andCompareMatch[2].trim()];
  }

  return null;
}

/* ------------------------------------------------------------------ */
/*  POST handler — streaming                                           */
/* ------------------------------------------------------------------ */

/**
 * Detect non-drug conversational queries (greetings, capability questions,
 * terminology, thanks) so we can skip the vector search entirely.
 */
function isConversationalQuery(question: string): boolean {
  const q = question.toLowerCase().trim().replace(/[?.!,]+$/g, '');

  // Very short messages are almost always greetings / noise
  if (q.length <= 3) return true;

  const patterns = [
    // Greetings
    /^(hi|hello|hey|good\s*(morning|afternoon|evening|day)|greetings|yo|sup)/,
    // How are you
    /^how\s+(are|r)\s+(you|u)/,
    // Capability / purpose
    /what\s+(can|do)\s+you\s+(do|help|know|assist)/,
    /what\s+(are|is)\s+(you|your)\s*(capable|purpose|function|role)/,
    /what('?s|\s+is)\s+your?\s*(purpose|role|function|job)/,
    /^(help|help me)$/,
    // Terminology questions (not about a specific drug)
    /what\s+(does|is|are|do)\s+(a\s+)?(contraindication|adverse\s*(reaction|effect)|side\s*effect|indication|precaution|drug\s*interaction|formulation|dosage\s*form|dose\s*adjustment)\s*(mean|stand\s*for)?/,
    // Thanks / farewells
    /^(thanks|thank\s*you|ty|bye|goodbye|see\s*you|take\s*care|ok\s*thanks)/,
    // Generic test / nonsense
    /^(test|testing|asdf|aaa|xxx|123)$/,
    // Who are you
    /^who\s+(are|r)\s+(you|u)/,
    // Need help (without drug name)
    /^(i\s+need\s+(your\s+)?help|can\s+you\s+help\s+me)$/,
  ];

  return patterns.some((p) => p.test(q));
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();

  try {
    const body = await req.json();
    const parsed = requestSchema.parse(body);

    // 0. Check if this is a conversational (non-drug) query
    const conversational = isConversationalQuery(parsed.question);

    // 1. Resolve drug context (heuristic, no LLM)
    const drugHint = conversational
      ? undefined
      : extractDrugHint(
          parsed.question,
          parsed.chatHistory,
          parsed.activeDrug,
        );

    // 2. Vector search — skip entirely for conversational queries
    let chunks: Awaited<ReturnType<typeof searchPNF>> = [];
    let detectedDrug = drugHint ?? '';

    // Check if this is a comparison query (two drugs)
    const comparisonDrugs = conversational
      ? null
      : extractComparisonDrugs(parsed.question);

    if (!conversational) {
      if (comparisonDrugs) {
        // --- Comparison: run two parallel searches, one per drug ---
        const [drugA, drugB] = comparisonDrugs;
        const [chunksA, chunksB] = await Promise.all([
          searchPNF({ query: drugA, k: 6, threshold: 0.2, drugFilter: drugA }),
          searchPNF({ query: drugB, k: 6, threshold: 0.2, drugFilter: drugB }),
        ]);
        // Merge: take top 5 per drug so both are well-represented
        chunks = [...chunksA.slice(0, 5), ...chunksB.slice(0, 5)];
        detectedDrug = `${drugA} vs ${drugB}`;
      } else {
        // --- Normal single-drug search ---
        const searchQuery = drugHint
          ? `${drugHint} ${parsed.question}`
          : parsed.question;

        chunks = await searchPNF({
          query: searchQuery,
          k: 8,
          threshold: 0.25,
          drugFilter: drugHint,
        });

        // Detect the primary drug from results
        detectedDrug =
          chunks.length > 0
            ? (chunks[0].metadata.drugName ?? drugHint ?? '')
            : (drugHint ?? '');
      }
    }

    // 3. Build prompt context
    const context = conversational
      ? 'No drug query — this is a conversational message.'
      : buildContext(chunks);

    // 4. Build messages array
    const messages = buildMessages(
      parsed.question,
      context,
      parsed.chatHistory,
    );

    // 5. Stream from OpenAI
    const openai = new OpenAI({ apiKey: process.env.AI_API_KEY });
    const model = process.env.AI_RESPONSE_MODEL ?? 'gpt-4o-mini';

    const stream = await openai.chat.completions.create({
      model,
      temperature: 0,
      max_tokens: 2048,
      stream: true,
      messages,
    });

    // 6. Create a ReadableStream that forwards the OpenAI stream
    const encoder = new TextEncoder();
    let fullAnswer = '';

    const readable = new ReadableStream({
      async start(controller) {
        try {
          // Send metadata first as a JSON event
          const meta = JSON.stringify({
            type: 'meta',
            drugContext: detectedDrug,
            sources: chunks.length,
          });
          controller.enqueue(encoder.encode(`data: ${meta}\n\n`));

          // Stream the text tokens
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) {
              fullAnswer += delta;
              const tokenEvent = JSON.stringify({
                type: 'token',
                content: delta,
              });
              controller.enqueue(encoder.encode(`data: ${tokenEvent}\n\n`));
            }
          }

          // Send done event with latency
          const latencyMs = Date.now() - startedAt;
          const doneEvent = JSON.stringify({
            type: 'done',
            latencyMs,
          });
          controller.enqueue(encoder.encode(`data: ${doneEvent}\n\n`));

          controller.close();

          // Log to database (fire-and-forget)
          db.insert(pnfChatLogs)
            .values({
              question: parsed.question,
              answer: fullAnswer,
              latencyMs,
            })
            .catch((err) =>
              console.error('[pnf-chat] failed to log:', err),
            );
        } catch (streamError) {
          console.error('[pnf-chat] stream error:', streamError);
          const errEvent = JSON.stringify({
            type: 'error',
            message: 'Stream interrupted',
          });
          controller.enqueue(encoder.encode(`data: ${errEvent}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[pnf-chat] error:', error);

    if (error instanceof z.ZodError) {
      return Response.json(
        { error: error.issues.map((i) => i.message).join(', ') },
        { status: 400 },
      );
    }

    return Response.json(
      { error: 'Failed to process your question. Please try again.' },
      { status: 500 },
    );
  }
}
