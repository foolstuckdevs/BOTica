import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createPNFRetriever } from '@/lib/rag/retriever';
import {
  createPNFChatChain,
  runPNFChatChain,
} from '@/lib/rag/chains/pnf-chat-chain';
import { db } from '@/database/drizzle';
import { pnfChatLogs } from '@/database/schema';
import type { DocumentInterface } from '@langchain/core/documents';

const requestSchema = z.object({
  question: z.string().min(6, 'Question must be at least 6 characters'),
  chatHistory: z.array(z.string()).default([]),
  lastDrugDiscussed: z.string().optional(), // Track the current conversation drug
  k: z.number().min(1).max(12).optional(),
});

function normalizeDrugName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s\+\-]/g, '')
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = requestSchema.parse(body);
    const startedAt = Date.now();

    const normalizedHistory = parsed.chatHistory
      .map((entry) => entry.trim())
      .filter(Boolean);

    const activeDrugHint = parsed.lastDrugDiscussed?.trim() || undefined;

    const retriever = await createPNFRetriever({
      k: parsed.k ?? 6,
      useCompression: false,
    });

    const queryVariants = new Map<string, number>();
    queryVariants.set(parsed.question, 1);

    if (activeDrugHint) {
      const normalizedHint = activeDrugHint.trim();
      const combinedQuery = `${normalizedHint} ${parsed.question}`;
      queryVariants.set(combinedQuery, 2);
      if (
        !parsed.question.toLowerCase().includes(normalizedHint.toLowerCase())
      ) {
        queryVariants.set(normalizedHint, 0.5);
      }
    } else if (normalizedHistory.length) {
      // Use most recent user turn as a fallback hint for continuity
      for (let i = normalizedHistory.length - 1; i >= 0; i -= 1) {
        const entry = normalizedHistory[i];
        if (entry.toLowerCase().startsWith('user:')) {
          const content = entry.slice(entry.indexOf(':') + 1).trim();
          if (content && content.length > 6 && content !== parsed.question) {
            queryVariants.set(`${content} ${parsed.question}`, 1.5);
          }
          break;
        }
      }
    }

    const prioritizedQueries = [...queryVariants.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, Math.min(queryVariants.size, activeDrugHint ? 2 : 1))
      .map(([query]) => query);

    const mergedDocuments: DocumentInterface[] = [];

    const retrievalResults = await Promise.all(
      prioritizedQueries.map((query) => retriever.getRelevantDocuments(query)),
    );

    retrievalResults.forEach((docs) => {
      docs.forEach((doc) => {
        mergedDocuments.push(doc);
      });
    });

    const dedupedDocuments: DocumentInterface[] = [];
    const seen = new Set<string>();

    mergedDocuments.forEach((doc) => {
      const rawId =
        typeof doc.metadata?.id === 'string' && doc.metadata.id.trim().length
          ? doc.metadata.id.trim()
          : undefined;

      const keyParts = [
        doc.metadata?.drugName ?? 'unknown',
        doc.metadata?.section ?? 'general',
        doc.metadata?.entryRange ?? doc.metadata?.source ?? '',
      ];

      const fallbackKey = keyParts
        .map((part) =>
          String(part ?? '')
            .trim()
            .toLowerCase(),
        )
        .filter(Boolean)
        .join('|');

      const key = rawId ?? fallbackKey ?? doc.pageContent.slice(0, 80);

      if (!key) {
        dedupedDocuments.push(doc);
        return;
      }

      if (seen.has(key)) return;
      seen.add(key);
      dedupedDocuments.push(doc);
    });

    if (activeDrugHint) {
      const normalizedHint = normalizeDrugName(activeDrugHint);
      dedupedDocuments.sort((a, b) => {
        const aMatch = a.metadata?.drugName
          ? normalizeDrugName(String(a.metadata.drugName)) === normalizedHint
          : false;
        const bMatch = b.metadata?.drugName
          ? normalizeDrugName(String(b.metadata.drugName)) === normalizedHint
          : false;
        if (aMatch === bMatch) return 0;
        return aMatch ? -1 : 1;
      });
    }

    let documents = dedupedDocuments;
    if (activeDrugHint) {
      const normalizedHint = normalizeDrugName(activeDrugHint);
      const matching = dedupedDocuments.filter((doc) =>
        doc.metadata?.drugName
          ? normalizeDrugName(String(doc.metadata.drugName)) === normalizedHint
          : false,
      );
      if (matching.length) {
        const nonMatching = dedupedDocuments.filter(
          (doc) => !matching.includes(doc),
        );
        documents = [...matching, ...nonMatching];
      }
    }

    documents = documents.slice(0, parsed.k ?? 6);

    const chainResult = await runPNFChatChain({
      question: parsed.question,
      chatHistory: normalizedHistory,
      documents,
      chain: createPNFChatChain(),
      activeDrugHint,
    });

    const answerText =
      chainResult.response.answer ?? 'No formatted answer returned.';

    const latencyMs = Date.now() - startedAt;

    const responseDrug = chainResult.primaryDrug ?? activeDrugHint ?? '';

    await db.insert(pnfChatLogs).values({
      question: parsed.question,
      answer: answerText,
      latencyMs,
    });

    return Response.json(
      {
        answer: answerText,
        sections: chainResult.response.sections,
        followUpQuestions: chainResult.response.followUpQuestions ?? [],
        notes: chainResult.response.notes,
        latencyMs,
        drugContext: responseDrug, // Send back the drug being discussed
        relatedDrugs: chainResult.supportingDrugs,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('[pnf-chat] error', error);

    if (error instanceof z.ZodError) {
      return Response.json(
        { error: error.issues.map((issue) => issue.message).join(', ') },
        { status: 400 },
      );
    }

    return Response.json(
      { error: 'Failed to generate response from formulary chatbot.' },
      { status: 500 },
    );
  }
}
