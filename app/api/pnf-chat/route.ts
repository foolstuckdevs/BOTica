import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createPNFRetriever } from '@/lib/rag/retriever';
import {
  createPNFChatChain,
  runPNFChatChain,
} from '@/lib/rag/chains/pnf-chat-chain';
import { db } from '@/database/drizzle';
import { pnfChatLogs } from '@/database/schema';

const requestSchema = z.object({
  question: z.string().min(6, 'Question must be at least 6 characters'),
  chatHistory: z.array(z.string()).default([]),
  k: z.number().min(1).max(12).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = requestSchema.parse(body);
    const startedAt = Date.now();

    const normalizedHistory = parsed.chatHistory
      .map((entry) => entry.trim())
      .filter(Boolean);

    const userOnlyHistory = normalizedHistory.filter((entry) =>
      entry.toLowerCase().startsWith('user:'),
    );

    const retriever = await createPNFRetriever({
      k: parsed.k ?? 6,
      useCompression: true,
    });

    const documents = await retriever.getRelevantDocuments(parsed.question);

    const response = await runPNFChatChain({
      question: parsed.question,
      chatHistory: userOnlyHistory,
      documents,
      chain: createPNFChatChain(),
    });

    const citations = response.citations ?? [];
    const answerText = response.answer ?? 'No formatted answer returned.';

    const latencyMs = Date.now() - startedAt;

    await db.insert(pnfChatLogs).values({
      question: parsed.question,
      answer: answerText,
      citations,
      latencyMs,
    });

    return Response.json(
      {
        answer: answerText,
        sections: response.sections,
        citations,
        followUpQuestions: response.followUpQuestions ?? [],
        notes: response.notes,
        sources: documents.map((doc, index) => ({
          id: doc.metadata?.id ?? `chunk-${index}`,
          drugName: doc.metadata?.drugName,
          section: doc.metadata?.section,
          pageRange: doc.metadata?.pageRange,
          snippet: doc.pageContent.slice(0, 400),
        })),
        latencyMs,
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
