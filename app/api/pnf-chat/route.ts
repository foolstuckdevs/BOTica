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
import { auth } from '@/auth';
import { searchPNF, buildContext } from '@/lib/rag/pnf-search';
import { buildMessages } from '@/lib/rag/pnf-prompt';
import { searchInventory, buildInventoryContext } from '@/lib/rag/inventory-search';
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
 * Comprehensive set of words that are NEVER part of a drug name.
 * We split the user's question into words, remove every word in this set,
 * and whatever remains is presumed to be the drug / product name.
 *
 * This "negative-space" approach is far more robust than pattern-matching
 * because any new phrasing is automatically handled — only truly novel
 * non-drug words need to be added here.
 */
const STRIP_WORDS = new Set([
  // --- Question / grammar words ---
  'what', 'whats', 'when', 'where', 'which', 'who', 'whom', 'whose', 'why', 'how', 'hows',
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'am',
  'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'she', 'it', 'its',
  'they', 'them', 'their', 'this', 'that', 'these', 'those',
  'some', 'any', 'all', 'each', 'every', 'no', 'not', 'nor', 'none',
  'of', 'for', 'in', 'on', 'at', 'to', 'from', 'with', 'by', 'about',
  'as', 'if', 'or', 'and', 'but', 'so', 'do', 'does', 'did',
  'have', 'has', 'had', 'will', 'would', 'shall', 'should',
  'can', 'could', 'may', 'might', 'must',
  'still', 'already', 'yet', 'currently', 'now', 'just', 'also', 'too',
  'very', 'really', 'actually', 'only',
  'there', 'here', 'up', 'down', 'out', 'same',
  // --- Command verbs ---
  'tell', 'show', 'give', 'check', 'look', 'find', 'get', 'list',
  'search', 'verify', 'confirm', 'see', 'know', 'need', 'want',
  'please', 'pls', 'kindly',
  // --- Tagalog filler ---
  'po', 'ba', 'ng', 'nang', 'ang', 'mga', 'ko', 'mo',
  'namin', 'natin', 'nila', 'amin', 'atin', 'sa', 'na', 'pa',
  'ano', 'magkano', 'ilan', 'meron', 'mayroon',
  // --- Inventory-topic words ---
  'stock', 'stocks', 'stocked', 'available', 'availability',
  'price', 'cost', 'pricing', 'selling', 'sold',
  'expiry', 'expire', 'expires', 'expiration', 'expired', 'expiring',
  'date', 'shelf', 'life', 'best', 'before',
  'quantity', 'count', 'pieces', 'pcs', 'units', 'boxes',
  'per', 'piece', 'unit', 'box', 'tab', 'tablet', 'capsule', 'caps',
  'much', 'many', 'remaining', 'left', 'hand',
  'carry', 'sell', 'got', 'low',
  'info', 'information', 'inventory', 'supply', 'supplies',
  'qty', 'on',
  // --- Clinical-topic words ---
  'dosage', 'dose', 'dosing', 'doses',
  'side', 'effect', 'effects',
  'adverse', 'reaction', 'reactions',
  'contraindication', 'contraindications',
  'interaction', 'interactions', 'drug', 'drugs',
  'precaution', 'precautions', 'warning', 'warnings',
  'indication', 'indications', 'use', 'uses', 'used',
  'administration', 'administer',
  'formulation', 'formulations', 'form',
  'pregnancy', 'lactation', 'pregnant', 'safe', 'during',
  'mechanism', 'pharmacology', 'pharmacokinetics',
  'classification', 'class', 'category',
  'take', 'taken', 'taking',
  'overview', 'details', 'detail',
  'monitoring', 'monitor',
  'rx', 'otc', 'medicine', 'medication', 'medications',
  'storage', 'stability',
  // --- Comparison ---
  'comparison', 'compare', 'compared', 'difference', 'differences',
  'between', 'versus', 'vs',
]);

export function extractDrugHint(
  question: string,
  chatHistory: Array<{ role: string; content: string }>,
  activeDrug?: string,
): string | undefined {
  // ---- Step 1: Strip every known non-drug word ----
  const words = question
    .replace(/[?.!,;:'"()\[\]{}]/g, '')   // remove punctuation
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 0 && !STRIP_WORDS.has(w));

  // 1-4 remaining words → almost certainly the drug name
  if (words.length >= 1 && words.length <= 4) {
    return words.join(' ');
  }

  // More than 4 remaining words → look for capitalised words in the
  // original text (drug names are usually capitalised or unique).
  if (words.length > 4) {
    const capitalised = question
      .replace(/[?.!,;:'"()\[\]{}]/g, '')
      .split(/\s+/)
      .filter((w) => /^[A-Z]/.test(w) && !STRIP_WORDS.has(w.toLowerCase()))
      .map((w) => w.toLowerCase());

    if (capitalised.length >= 1 && capitalised.length <= 4) {
      return capitalised.join(' ');
    }
  }

  // ---- Step 2: Follow-up / active-drug fallback ----
  const isFollowUp =
    /^(what|how|is|are|can|does|do|tell|show|list|give|any)\s/i.test(question) ||
    /^(dosage|dose|side effects?|contraindications?|interactions?|precautions?|indications?|adverse|formulations?|administration|pregnancy)/i.test(question);

  if (isFollowUp && activeDrug) return activeDrug;
  if (activeDrug) return activeDrug;

  // ---- Step 3: Scan chat history ----
  for (let i = chatHistory.length - 1; i >= 0; i--) {
    const entry = chatHistory[i];
    if (entry.role === 'user') {
      // Recursive call with empty history to avoid infinite recursion
      const histHint = extractDrugHint(entry.content, [], undefined);
      if (histHint) return histHint;
    }
  }

  return undefined;
}

function toTitleCase(value: string): string {
  return value
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function formatInventoryOnlyAnswer(
  items: Awaited<ReturnType<typeof searchInventory>>,
  drugHint?: string,
): string {
  const drug = toTitleCase((drugHint ?? 'This medicine').trim());

  if (!items.length) {
    return `${drug} is not currently in stock at this pharmacy.\n\n_Source: Pharmacy Inventory_`;
  }

  const lines: string[] = [];
  lines.push(`**${drug}** is available in inventory:\n`);

  for (const item of items) {
    const stockStatus =
      item.quantity === 0
        ? 'OUT OF STOCK'
        : item.quantity <= item.minStockLevel
          ? `LOW STOCK — only ${item.quantity} ${item.unit ?? 'unit(s)'} remaining`
          : `IN STOCK — ${item.quantity} ${item.unit ?? 'unit(s)'} available`;

    lines.push(`- **${item.name}**`);
    if (item.brandName) lines.push(`  - Brand: ${item.brandName}`);
    if (item.dosageForm) lines.push(`  - Dosage Form: ${item.dosageForm.replace(/_/g, ' ')}`);
    lines.push(`  - Selling Price: ₱${Number(item.sellingPrice).toFixed(2)} per ${item.unit ?? 'unit'}`);
    lines.push(`  - Stock Status: ${stockStatus}`);
    if (item.expiryDate) lines.push(`  - Expiry: ${item.expiryDate}`);
  }

  lines.push('\n_Source: Pharmacy Inventory_');
  return lines.join('\n');
}

/* ------------------------------------------------------------------ */
/*  Query classification (inventory vs. clinical)                      */
/* ------------------------------------------------------------------ */

/**
 * Classify a question as inventory-focused or clinical-focused.
 * - INVENTORY: stock, price, availability, expiry, quantity, dosage form
 * - CLINICAL: side effects, interactions, contraindications, indications, etc.
 * - BOTH: questions that span both (e.g., "Tell me about Paracetamol")
 */
export function classifyQuery(
  question: string,
): 'inventory' | 'clinical' | 'both' {
  const q = question.toLowerCase();

  // Inventory-focused keywords
  const inventoryKeywords = [
    /\b(stock|available|in stock|out of stock|low stock)\b/,
    /\b(price|cost|how much|selling price)\b/,
    /\b(quantity|units|how many|pieces|boxes|stock count|on hand|qty)\b/,
    /\b(expir|expire|expiry date|best before)\b/,
    /\b(form|formulation|tablet|capsule|syrup|injection)\b/,
    /\b(do we have|do we still have|have we got|got|carry|sell)\b/,
  ];

  // Clinical-focused keywords
  const clinicalKeywords = [
    /\b(dosage|dose|dosing)\b/,
    /\b(side effects?|adverse reactions?|adverse effects?)\b/,
    /\b(contraindications?|when not to use)\b/,
    /\b(interactions?|drug interactions?|can .*take with)\b/,
    /\b(precautions?|warnings?|monitoring)\b/,
    /\b(indications?|approved uses?|used for)\b/,
    /\b(administration|how to give|how to take)\b/,
    /\b(pregnancy|lactation|safe during|pregnant)\b/,
    /\b(mechanism|pharmacology|pharmacokinetics?)\b/,
    /\b(classification|rx|otc|afc class)\b/,
  ];

  const isInventory = inventoryKeywords.some((pattern) => pattern.test(q));
  const isClinical = clinicalKeywords.some((pattern) => pattern.test(q));

  if (isInventory && !isClinical) return 'inventory';
  if (isClinical && !isInventory) return 'clinical';
  return 'both'; // Or mention a drug generically without asking about specific aspect
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
export function isConversationalQuery(question: string): boolean {
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

  // Symptom-only messages (English/Tagalog) without a medicine name or drug-topic keyword
  const symptomOnly =
    /\b(headache|fever|ubo|sipon|masakit\s+ang\s+ulo|sore\s+throat|cough|cold)\b/.test(q) &&
    !/\b(dosage|dose|side effects?|contraindications?|interactions?|indications?|precautions?|drug|medicine|medication|stock|price|available|in stock)\b/.test(q);

  if (symptomOnly) return true;

  return patterns.some((p) => p.test(q));
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();

  try {
    // Resolve session so we can query the pharmacy's inventory
    const session = await auth();
    const pharmacyId = session?.user?.pharmacyId ?? null;

    const body = await req.json();
    const parsed = requestSchema.parse(body);

    // 0. Check if this is a conversational (non-drug) query
    const conversational = isConversationalQuery(parsed.question);

    // 0b. Classify query type (inventory vs clinical)
    const queryType = conversational ? 'conversational' : classifyQuery(parsed.question);

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

    // 2a. Run PNF vector search + inventory search based on query type
    let inventoryContext: string | undefined;
    let directAnswer: string | undefined;
    let inventoryMatches = 0;

    const debugEnabled =
      process.env.CHATBOT_DEBUG_META === 'true' ||
      process.env.NODE_ENV !== 'production';

    if (!conversational) {
      if (comparisonDrugs) {
        // --- Comparison: always use both inventory and PNF for both drugs ---
        const [drugA, drugB] = comparisonDrugs;
        const [chunksA, chunksB, invA, invB] = await Promise.all([
          searchPNF({ query: drugA, k: 6, threshold: 0.2, drugFilter: drugA }),
          searchPNF({ query: drugB, k: 6, threshold: 0.2, drugFilter: drugB }),
          pharmacyId ? searchInventory(pharmacyId, drugA) : Promise.resolve([]),
          pharmacyId ? searchInventory(pharmacyId, drugB) : Promise.resolve([]),
        ]);
        // Merge: take top 5 per drug so both are well-represented
        chunks = [...chunksA.slice(0, 5), ...chunksB.slice(0, 5)];
        detectedDrug = `${drugA} vs ${drugB}`;

        const allInventory = [...invA, ...invB];
        inventoryMatches = allInventory.length;
        inventoryContext = allInventory.length
          ? buildInventoryContext(allInventory)
          : undefined;
      } else {
        // --- Normal single-drug search: decide based on query type ---
        const searchQuery = drugHint
          ? `${drugHint} ${parsed.question}`
          : parsed.question;

        if (queryType === 'inventory') {
          // INVENTORY-ONLY: Skip PNF search, only get inventory
          const invItems = pharmacyId && drugHint
            ? await searchInventory(pharmacyId, drugHint)
            : [];
          inventoryMatches = invItems.length;
          inventoryContext = invItems.length
            ? buildInventoryContext(invItems)
            : pharmacyId && drugHint
              ? buildInventoryContext([]) // explicitly not found
              : undefined;
          chunks = []; // No PNF context for inventory queries
          detectedDrug = drugHint ?? '';
          directAnswer = formatInventoryOnlyAnswer(invItems, drugHint);
        } else if (queryType === 'clinical') {
          // CLINICAL-ONLY: Skip inventory search, only get PNF
          chunks = await searchPNF({
            query: searchQuery,
            k: 8,
            threshold: 0.25,
            drugFilter: drugHint,
          });
          inventoryContext = undefined; // No inventory context for clinical queries
          detectedDrug =
            chunks.length > 0
              ? (chunks[0].metadata.drugName ?? drugHint ?? '')
              : (drugHint ?? '');
        } else {
          // BOTH: Run both searches in parallel
          const [pnfChunks, invItems] = await Promise.all([
            searchPNF({
              query: searchQuery,
              k: 8,
              threshold: 0.25,
              drugFilter: drugHint,
            }),
            pharmacyId && drugHint
              ? searchInventory(pharmacyId, drugHint)
              : Promise.resolve([]),
          ]);

          chunks = pnfChunks;
          detectedDrug =
            chunks.length > 0
              ? (chunks[0].metadata.drugName ?? drugHint ?? '')
              : (drugHint ?? '');

          inventoryContext = invItems.length
            ? buildInventoryContext(invItems)
            : pharmacyId && drugHint
              ? buildInventoryContext([]) // explicitly not found
              : undefined;
          inventoryMatches = invItems.length;
        }
      }
    }

    // 3. Build prompt context
    const context = conversational
      ? 'No drug query — this is a conversational message.'
      : buildContext(chunks);

    // 3a. For inventory-only queries, bypass LLM and return deterministic response
    if (directAnswer) {
      const encoder = new TextEncoder();
      const latencyMs = Date.now() - startedAt;

      const readable = new ReadableStream({
        start(controller) {
          const meta = JSON.stringify({
            type: 'meta',
            drugContext: detectedDrug,
            sources: 0,
            ...(debugEnabled
              ? {
                  debug: {
                    queryType,
                    drugHint: drugHint ?? null,
                    inventoryMatches,
                    pnfMatches: chunks.length,
                    hasInventoryContext: Boolean(inventoryContext),
                    directAnswer: true,
                  },
                }
              : {}),
          });
          controller.enqueue(encoder.encode(`data: ${meta}\n\n`));

          const tokenEvent = JSON.stringify({
            type: 'token',
            content: directAnswer,
          });
          controller.enqueue(encoder.encode(`data: ${tokenEvent}\n\n`));

          const doneEvent = JSON.stringify({ type: 'done', latencyMs });
          controller.enqueue(encoder.encode(`data: ${doneEvent}\n\n`));
          controller.close();

          db.insert(pnfChatLogs)
            .values({
              question: parsed.question,
              answer: directAnswer,
              latencyMs,
            })
            .catch((err) => console.error('[pnf-chat] failed to log:', err));
        },
      });

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    // 4. Build messages array (with inventory context injected)
    const messages = buildMessages(
      parsed.question,
      context,
      parsed.chatHistory,
      inventoryContext,
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
            ...(debugEnabled
              ? {
                  debug: {
                    queryType,
                    drugHint: drugHint ?? null,
                    inventoryMatches,
                    pnfMatches: chunks.length,
                    hasInventoryContext: Boolean(inventoryContext),
                    directAnswer: false,
                  },
                }
              : {}),
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
