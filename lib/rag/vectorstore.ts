import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase';
import { OpenAIEmbeddings } from '@langchain/openai';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small';

export function createSupabaseClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required for vector store');
  }

  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseKey) {
    throw new Error(
      'Provide SUPABASE_SERVICE_ROLE_KEY (recommended) or NEXT_PUBLIC_SUPABASE_ANON_KEY to use the vector store',
    );
  }

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function createPNFEmbeddings() {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    throw new Error('AI_API_KEY is required to create embeddings');
  }

  const model = process.env.AI_EMBEDDING_MODEL ?? DEFAULT_EMBEDDING_MODEL;

  return new OpenAIEmbeddings({
    apiKey,
    model,
  });
}

export async function createPNFVectorStore() {
  const client = createSupabaseClient();
  const embeddings = createPNFEmbeddings();

  return SupabaseVectorStore.fromExistingIndex(embeddings, {
    client,
    tableName: 'pnf_chunks',
    queryName: 'match_pnf_chunks',
  });
}
