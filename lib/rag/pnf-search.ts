/**
 * PNF Vector Search — V2
 *
 * Direct Supabase RPC call to match_pnf_chunks. No LangChain overhead.
 * Returns typed chunk results for the chatbot to consume.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface PNFChunkMatch {
  id: string;
  content: string;
  similarity: number;
  metadata: {
    drugName?: string;
    section?: string;
    entryRange?: string;
    classification?: string;
    pregnancyCategory?: string;
    atcCode?: string;
  };
}

/* ------------------------------------------------------------------ */
/*  Supabase singleton                                                 */
/* ------------------------------------------------------------------ */

let _client: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or ANON_KEY) are required',
    );
  }

  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return _client;
}

/* ------------------------------------------------------------------ */
/*  Embedding helper                                                   */
/* ------------------------------------------------------------------ */

async function embed(text: string): Promise<number[]> {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) throw new Error('AI_API_KEY is required for embeddings');

  const model = process.env.AI_EMBEDDING_MODEL ?? 'text-embedding-3-small';

  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ input: text, model }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Embedding API error ${res.status}: ${body}`);
  }

  const json = await res.json();
  return json.data[0].embedding as number[];
}

/* ------------------------------------------------------------------ */
/*  Vector search                                                      */
/* ------------------------------------------------------------------ */

export interface SearchPNFOptions {
  query: string;
  /** Number of nearest chunks to return (default 8) */
  k?: number;
  /** Minimum similarity threshold 0-1 (default 0.3) */
  threshold?: number;
  /** Optional drug name filter for more targeted results */
  drugFilter?: string;
}

export async function searchPNF(
  options: SearchPNFOptions,
): Promise<PNFChunkMatch[]> {
  const { query, k = 8, threshold = 0.3, drugFilter } = options;

  const embedding = await embed(query);
  const supabase = getSupabase();

  // NOTE: We intentionally pass an empty filter to the RPC and rely on
  // vector similarity + client-side re-ranking by drugFilter.
  // The RPC's JSONB @> filter is case-sensitive and the metadata stores
  // drug names in UPPER CASE, while user input is mixed-case.
  const { data, error } = await supabase.rpc('match_pnf_chunks', {
    query_embedding: embedding,
    match_count: k,
    filter: {},
  });

  if (error) {
    console.error('[pnf-search] RPC error:', error);
    throw new Error(`Vector search failed: ${error.message}`);
  }

  if (!data?.length) return [];

  // Apply similarity threshold client-side (the RPC function doesn't filter by threshold)
  const results: PNFChunkMatch[] = (data as Record<string, unknown>[])
    .map((row) => ({
      id: String(row.id ?? ''),
      content: String(row.content ?? ''),
      similarity: Number(row.similarity ?? 0),
      metadata: (row.metadata ?? {}) as PNFChunkMatch['metadata'],
    }))
    .filter((chunk) => chunk.similarity >= threshold);

  // If a drug filter is provided, boost matching chunks to the top
  if (drugFilter) {
    const normalized = drugFilter.toLowerCase().trim();
    results.sort((a, b) => {
      const aMatch = a.metadata.drugName?.toLowerCase().includes(normalized);
      const bMatch = b.metadata.drugName?.toLowerCase().includes(normalized);
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
      return b.similarity - a.similarity;
    });
  }

  return results;
}

/* ------------------------------------------------------------------ */
/*  Build context string for the LLM prompt                           */
/* ------------------------------------------------------------------ */

export function buildContext(chunks: PNFChunkMatch[]): string {
  if (!chunks.length) return 'No relevant formulary data found.';

  return chunks
    .map((chunk, i) => {
      const drug = chunk.metadata.drugName ?? 'Unknown';
      const section = chunk.metadata.section ?? 'general';
      const classification = chunk.metadata.classification ?? 'Unknown';
      const pregnancy = chunk.metadata.pregnancyCategory;
      const header = [
        `[Source ${i + 1}]`,
        `Drug: ${drug}`,
        `Section: ${section}`,
        `Classification: ${classification}`,
        pregnancy ? `Pregnancy Category: ${pregnancy}` : null,
      ]
        .filter(Boolean)
        .join(' | ');
      return `${header}\n${chunk.content}`;
    })
    .join('\n\n---\n\n');
}
