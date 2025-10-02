CREATE EXTENSION IF NOT EXISTS "vector";

CREATE TABLE IF NOT EXISTS "pnf_chunks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "content" text NOT NULL,
  "metadata" jsonb NOT NULL,
  "embedding" vector(3072) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "pnf_chat_logs" (
  "id" bigserial PRIMARY KEY,
  "question" text NOT NULL,
  "answer" text NOT NULL,
  "citations" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "latency_ms" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE OR REPLACE FUNCTION "match_pnf_chunks"(
  query_embedding vector(3072),
  match_count int DEFAULT 6,
  filter jsonb DEFAULT '{}'::jsonb
) RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.content,
    p.metadata,
    1 - (p.embedding <=> query_embedding) AS similarity
  FROM pnf_chunks p
  WHERE filter = '{}'::jsonb OR p.metadata @> filter
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
