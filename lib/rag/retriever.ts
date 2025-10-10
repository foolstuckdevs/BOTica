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

type RetrieverCacheKey = string;

const retrieverCache = new Map<
  RetrieverCacheKey,
  Promise<BaseRetrieverInterface>
>();
const llmCache = new Map<string, ChatOpenAI>();
const compressorCache = new Map<string, LLMChainExtractor>();

function getRetrieverCacheKey(
  options: CreatePNFRetrieverOptions,
): RetrieverCacheKey {
  const k = options.k ?? 6;
  const useCompression = Boolean(options.useCompression);
  const temperature = options.temperature ?? 0;
  return JSON.stringify({ k, useCompression, temperature });
}

function getCachedLLM(model: string, temperature: number) {
  const key = `${model}:${temperature}`;
  if (!llmCache.has(key)) {
    llmCache.set(
      key,
      new ChatOpenAI({
        model,
        temperature,
        apiKey: process.env.AI_API_KEY,
      }),
    );
  }
  return llmCache.get(key)!;
}

async function getCachedCompressor(llmKey: string, llm: ChatOpenAI) {
  if (!compressorCache.has(llmKey)) {
    const extractor = await LLMChainExtractor.fromLLM(llm);
    compressorCache.set(llmKey, extractor);
  }
  return compressorCache.get(llmKey)!;
}

export async function createPNFRetriever(
  options: CreatePNFRetrieverOptions = {},
): Promise<BaseRetrieverInterface> {
  const cacheKey = getRetrieverCacheKey(options);
  if (retrieverCache.has(cacheKey)) {
    return retrieverCache.get(cacheKey)!;
  }

  const retrieverPromise = (async () => {
    const vectorStore = await createPNFVectorStore();
    const baseRetriever = vectorStore.asRetriever({ k: options.k ?? 6 });

    if (!options.useCompression) {
      return baseRetriever;
    }

    const model = process.env.AI_RESPONSE_MODEL ?? 'gpt-4o-mini';
    const temperature = options.temperature ?? 0;
    const llm = getCachedLLM(model, temperature);
    const baseCompressor = await getCachedCompressor(
      `${model}:${temperature}`,
      llm,
    );

    return new ContextualCompressionRetriever({
      baseRetriever,
      baseCompressor,
    });
  })();

  retrieverCache.set(cacheKey, retrieverPromise);
  return retrieverPromise;
}

export type { BaseRetrieverInterface as PNFRetriever };
