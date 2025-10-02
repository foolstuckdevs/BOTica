# RAG Module Reference

This document summarizes the key Retrieval-Augmented Generation (RAG) files that power the Philippine National Formulary assistant. Use it alongside `docs/RAG_SETUP.md` when onboarding new contributors or preparing releases.

## High-level flow

1. **Ingestion** parses the source PDF, extracts drug monographs, normalizes the text, and uploads embeddings to Supabase (`scripts/pnf-ingest.ts`).
2. **Retrieval** queries Supabase for the most relevant chunks for a given question (`lib/rag/retriever.ts`).
3. **Answer generation** feeds those chunks into a structured LangChain prompt to produce concise, cited answers (`lib/rag/chains/pnf-chat-chain.ts`, `lib/rag/prompts/pnf-chat-prompt.ts`).
4. **Delivery** exposes a `/api/pnf-chat` endpoint and React client that render professional responses with source attributions.

## Source ingestion

| File                                       | Purpose                                                                                                                                                                                            |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/pnf-ingest.ts`                    | CLI entry point that loads `.env.local`, parses the PNF PDF, chunks content, embeds text, and uploads to the `pnf_chunks` Supabase table. Supports reset/append, concurrency limits, and logging.  |
| `lib/rag/loaders/pnf-two-column-loader.ts` | Custom PDF loader aware of two-column page layouts. Ensures columns are merged correctly before parsing.                                                                                           |
| `lib/rag/parsers/pnf-drug-parser.ts`       | Extracts drug entries, splits them into sections (dosage, contraindications, etc.), captures metadata (classification, page range, ATC code), and produces chunk-ready payloads via `toRawChunks`. |
| `lib/rag/utils/text.ts`                    | Normalizes whitespace, repairs numeric ranges/units, and keeps ingestion text tidy to avoid LLM misreads.                                                                                          |

## Retrieval & prompt orchestration

| File                                 | Purpose                                                                                                                                                                               |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/rag/vectorstore.ts`             | Creates the Supabase client and OpenAI embedding factory; connects to the existing `pnf_chunks` index.                                                                                |
| `lib/rag/retriever.ts`               | Builds a `ContextualCompressionRetriever` when compression is enabled, falling back to the base retriever otherwise. Exported options allow tuning `k`, compression, and temperature. |
| `lib/rag/chains/pnf-chat-chain.ts`   | Configures the ChatOpenAI client, attaches the structured output parser, assembles the formatted context, and invokes the chain. Contains the fallback answer.                        |
| `lib/rag/prompts/pnf-chat-prompt.ts` | Defines the system + user templates. The system prompt enforces tone, JSON structure, and now mandates verbatim dosage quoting when numbers exist.                                    |
| `lib/rag/types/index.ts`             | Shared Zod schemas and TypeScript types for parsed entries, chunk metadata, and the structured chat response.                                                                         |

## API and client integration

| File                            | Purpose                                                                                                                                              |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/api/pnf-chat/route.ts`     | Next.js Route Handler that validates incoming questions, runs the retriever + chain, persists chat logs, and returns citations plus source previews. |
| `components/PnfChatbot.tsx`     | Front-end widget used on `/pnf-assistant` to render questions, answers, inline citations, and chunk previews with timestamps.                        |
| `scripts/pnf-preview-chunks.ts` | Debug helper CLI to inspect stored chunks by drug, section, or range (uses service-role credentials).                                                |

## Operations checklist

- Run `npm run pnf:ingest` after any parser or normalization change to refresh Supabase embeddings.
- Monitor `pnf_chat_logs` for latency and coverage insights.
- If you see unclear dosage answers, confirm the stored chunk text with `npx tsx scripts/pnf-preview-chunks.ts --drug="DRUG NAME"`.
- Keep `.env.local` aligned across deployments (database, Supabase, and OpenAI keys are all required).

For deployment details covering the entire POS platform, see the project `README.md` once updated for production readiness.
