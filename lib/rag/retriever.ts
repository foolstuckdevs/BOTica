import { ContextualCompressionRetriever } from 'langchain/retrievers/contextual_compression';
import { LLMChainExtractor } from 'langchain/retrievers/document_compressors/chain_extract';
import { ChatOpenAI } from '@langchain/openai';
import type { BaseRetrieverInterface } from '@langchain/core/retrievers';
import { createPNFVectorStore } from '@/lib/rag/vectorstore';

export interface CreatePNFRetrieverOptions {
  k?: number;
  useCompression?: boolean;
  temperature?: number;
}

export async function createPNFRetriever(
  options: CreatePNFRetrieverOptions = {},
): Promise<BaseRetrieverInterface> {
  const vectorStore = await createPNFVectorStore();
  const baseRetriever = vectorStore.asRetriever({ k: options.k ?? 6 });

  if (!options.useCompression) {
    return baseRetriever;
  }

  const llm = new ChatOpenAI({
    model: process.env.AI_RESPONSE_MODEL ?? 'gpt-4o-mini',
    temperature: options.temperature ?? 0,
    apiKey: process.env.AI_API_KEY,
  });

  const baseCompressor = await LLMChainExtractor.fromLLM(llm);

  return new ContextualCompressionRetriever({
    baseRetriever,
    baseCompressor,
  });
}

export type { BaseRetrieverInterface as PNFRetriever };
