# BOTica Drug Reference Chatbot — Technical Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Data Pipeline](#data-pipeline)
5. [How It Works (Request Lifecycle)](#how-it-works-request-lifecycle)
6. [File Structure](#file-structure)
7. [Database](#database)
8. [Configuration](#configuration)
9. [Ingestion Script](#ingestion-script)
10. [Anti-Hallucination Safeguards](#anti-hallucination-safeguards)
11. [Performance](#performance)

---

## Overview

BOTica is an **internal drug reference chatbot** for pharmacy staff (pharmacists and owners). It answers questions about medicines using the **Philippine National Formulary (PNF)** as its sole data source.

**Key characteristics:**

- **RAG-based** — Retrieval-Augmented Generation ensures answers come from actual PNF data, not model memory
- **Streaming responses** — Text appears in real-time as the AI generates it (Server-Sent Events)
- **Single-pass architecture** — Only 1 embedding call + 1 LLM call per question for fast responses
- **No hallucination by design** — Strict system prompt forces the model to only use provided context
- **Floating widget** — Available on every page via a bottom-right chat button

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        User (Staff / Owner)                      │
│                     PnfChatbot.tsx (React UI)                    │
│                          floating widget                         │
└──────────────────────┬───────────────────────────────────────────┘
                       │  POST /api/pnf-chat
                       │  { question, chatHistory, activeDrug }
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                     API Route (route.ts)                         │
│                                                                  │
│  1. Validate request (Zod)                                       │
│  2. Extract drug hint (regex heuristic — no LLM call)            │
│  3. Vector search (1 embedding call → Supabase RPC)              │
│  4. Build prompt (system + context + history + question)          │
│  5. Stream response (OpenAI SDK → SSE)                           │
│  6. Log to database (fire-and-forget)                            │
└─────┬────────────────────────┬───────────────────────────────────┘
      │                        │
      ▼                        ▼
┌─────────────┐    ┌───────────────────┐    ┌─────────────────────┐
│  OpenAI API │    │  Supabase pgvector │    │  Neon DB (Postgres) │
│             │    │                   │    │                     │
│ Embeddings  │    │  pnf_chunks table │    │  pnf_chat_logs      │
│ (search)    │    │  881 drug chunks  │    │  (question logging) │
│             │    │  1536-dim vectors │    │                     │
│ GPT-4o-mini │    │  match_pnf_chunks │    │                     │
│ (answers)   │    │  (RPC function)   │    │                     │
└─────────────┘    └───────────────────┘    └─────────────────────┘
```

### How it differs from typical chatbots

| Feature | Typical Chatbot | BOTica |
|---------|----------------|--------|
| Data source | Model's training data | PNF formulary only |
| LLM calls per question | 1-3+ | 1 (streaming) |
| Embedding calls | 2-6 | 1 |
| Response delivery | Wait for full response | Real-time streaming |
| Framework | LangChain / LlamaIndex | Direct OpenAI SDK + Supabase |
| Latency | 7-15 seconds | 1-4 seconds to first token |

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 19, Next.js 15 | Chat UI with streaming text display |
| **API** | Next.js App Router (route.ts) | Streaming SSE endpoint |
| **LLM** | OpenAI `gpt-4o-mini` | Generates drug information answers |
| **Embeddings** | OpenAI `text-embedding-3-small` | Converts text → 1536-dim vectors for search |
| **Vector DB** | Supabase (PostgreSQL + pgvector) | Stores & searches drug monograph embeddings |
| **Primary DB** | Neon (PostgreSQL + Drizzle ORM) | Logs chat interactions (`pnf_chat_logs`) |
| **Validation** | Zod | Request/response schema validation |
| **Streaming** | Server-Sent Events (SSE) | Real-time token-by-token delivery |
| **UI Components** | shadcn/ui (Card, Button, Input) | Consistent design system |

### Why these choices?

- **OpenAI SDK directly** (not LangChain) — Eliminates ~66 unnecessary dependencies, reduces bundle size, and gives full control over streaming
- **Supabase pgvector** — The project already uses Supabase for storage; pgvector adds vector search without a separate service
- **`gpt-4o-mini`** — Fast, cheap, and smart enough for structured data retrieval tasks
- **`text-embedding-3-small`** — Best balance of quality vs cost for 1536-dim embeddings
- **SSE** (not WebSocket) — Simple, HTTP-native, works through all proxies, perfect for one-way streaming

---

## Data Pipeline

### Source Data

The raw data source is `storage/pnf-formulary.txt` — a text file containing **717 drug monographs** from the Philippine National Formulary (~84,000 lines). Each drug entry is separated by `---` and follows this structure:

```
DRUG NAME
Rx (or OTC)

Oral: 500mg tablet, 250mg/5ml syrup
Inj.: 100mg/ml, 10ml vial

A short description of the drug and its mechanism of action.

Indications:
- Indication 1
- Indication 2

Contra-indications:
- Contraindication 1

Dose:
Adults: 500mg every 6 hours
Children: 10mg/kg every 8 hours

Dose Adjustment:
Renal impairment: reduce dose by 50%

Precautions:
- Precaution 1

Adverse Drug Reactions:
- Side effect 1

Drug Interactions:
- Interaction 1

Administration:
Take with food.

Pregnancy Category: B

ATC Code: N02BE01

---
```

### Chunking Strategy

The ingestion script (`scripts/pnf-ingest-v2.ts`) converts the raw text into vector-searchable chunks:

```
pnf-formulary.txt (84,000 lines)
        │
        ▼  Split on "---"
   717 drug entries
        │
        ▼  Per-entry processing
   881 chunks (with embeddings)
        │
        ▼  Upload to Supabase
   pnf_chunks table (pgvector)
```

**Chunking rules:**

1. **One chunk per drug** — Each drug monograph stays as a single chunk so the model gets full context (drug name, dosage, contraindications, interactions — all together)
2. **Large entries split at section boundaries** — Entries over 6,000 characters are split into 2 overlapping parts at the nearest section heading (e.g., split before "Precautions:"), with 400 characters of overlap
3. **Drug name prepended to continuation chunks** — If a drug is split, part 2 starts with the drug name + "(continued)" so the model knows which drug the chunk belongs to
4. **717 entries → 881 chunks** — 571 entries fit in 1 chunk; 146 entries were split into 2+ chunks

### Metadata extracted per chunk

| Field | Example | Purpose |
|-------|---------|---------|
| `drugName` | `PARACETAMOL` | Drug identification & filtering |
| `classification` | `Rx` / `OTC` / `Unknown` | Regulatory classification |
| `sections` | `["indications","dosage","precautions"]` | Which PNF sections are present |
| `atcCode` | `N02BE01` | ATC classification code |
| `pregnancyCategory` | `B` | FDA pregnancy risk category |
| `entryIndex` | `42` | Position in source file |
| `chunkPart` / `totalParts` | `1/2` | For split entries only |

---

## How It Works (Request Lifecycle)

### Step-by-step flow for a single question

#### Step 1 — User asks a question

The user types a question in the floating chat widget (e.g., "What is the dosage for Paracetamol?"). The React component sends a POST request:

```json
{
  "question": "What is the dosage for Paracetamol?",
  "chatHistory": [
    { "role": "user", "content": "Tell me about Paracetamol" },
    { "role": "assistant", "content": "**Overview**\nParacetamol is..." }
  ],
  "activeDrug": "PARACETAMOL"
}
```

#### Step 2 — Drug context resolution (heuristic, no LLM)

The API route extracts the drug name using **regex pattern matching** — not an LLM call:

```
"What is the dosage for Paracetamol?"
                           ▲
                           └── regex match → "Paracetamol"
```

**Rules:**
- If the question mentions a drug name explicitly → use that drug
- If it's a follow-up (e.g., "What are the side effects?") → keep the `activeDrug` from the previous turn
- If neither works → scan chat history backwards for the last mentioned drug
- No LLM call needed — this saves ~1-2 seconds per request

#### Step 3 — Vector search (1 embedding call)

The search query is constructed by combining the drug hint with the question:

```
Search query: "Paracetamol What is the dosage for Paracetamol?"
```

This query is sent to OpenAI's embedding API (`text-embedding-3-small`) to get a 1536-dimensional vector. That vector is then sent to Supabase via the `match_pnf_chunks` RPC function, which performs a cosine similarity search across all 881 chunks.

**Parameters:**
- `k = 8` — Return the top 8 most similar chunks
- `threshold = 0.25` — Minimum cosine similarity score

If a drug hint is available, matching chunks are boosted to the top of results.

#### Step 4 — Build the LLM prompt

The retrieved chunks are assembled into a context string with source annotations:

```
[Source 1] Drug: PARACETAMOL | Section: general | Classification: OTC | Pregnancy Category: B
PARACETAMOL
OTC
Oral: 500mg tablet...
Indications: Pain relief, fever reduction...
Dose: Adults: 500-1000mg every 4-6 hours...

---

[Source 2] Drug: PARACETAMOL | Section: general | Classification: OTC | Pregnancy Category: B
(continued)
Drug Interactions: Warfarin — may increase INR...
```

This context is injected into the message array along with:
- **System prompt** — BOTica's strict rules and response format
- **Last 6 chat turns** — For conversational continuity
- **The user's current question** — Combined with the context

#### Step 5 — Stream the response (1 LLM call)

The message array is sent to OpenAI's `gpt-4o-mini` model with `stream: true`. The API route creates a `ReadableStream` that forwards tokens to the client via **Server-Sent Events (SSE)**.

**SSE event types:**

| Event Type | Payload | When |
|-----------|---------|------|
| `meta` | `{ drugContext, sources }` | First event — before any text |
| `token` | `{ content: "**Over" }` | Each text chunk from OpenAI |
| `done` | `{ latencyMs: 2340 }` | After the last token |
| `error` | `{ message: "..." }` | If streaming fails |

#### Step 6 — Render in real-time

The React component reads SSE events and appends each token to the message bubble. A blinking cursor (`▊`) shows while streaming. Once the `done` event arrives, the cursor disappears and the latency badge appears.

#### Step 7 — Log to database

After streaming completes, the full question + answer + latency is logged to `pnf_chat_logs` in Neon DB (fire-and-forget, doesn't block the response).

---

## File Structure

```
lib/rag/
├── pnf-search.ts       # Vector search — embed query → Supabase RPC → ranked results
└── pnf-prompt.ts        # System prompt + message builder

app/api/pnf-chat/
└── route.ts             # POST endpoint — streaming SSE handler

components/
└── PnfChatbot.tsx       # React chat UI — floating widget + inline variant

scripts/
└── pnf-ingest-v2.ts     # CLI tool — parse, embed, upload to Supabase

storage/
└── pnf-formulary.txt    # Raw PNF data (717 drug entries, ~84K lines)
```

### File responsibilities

| File | Lines | Responsibility |
|------|-------|---------------|
| `pnf-search.ts` | ~168 | Supabase client singleton, OpenAI embedding call, `match_pnf_chunks` RPC, result ranking, context string builder |
| `pnf-prompt.ts` | ~95 | System prompt with anti-hallucination rules, response format spec, message array builder with history |
| `route.ts` | ~237 | Request validation (Zod), drug hint extraction (regex), orchestrates search → prompt → stream, SSE encoding, chat logging |
| `PnfChatbot.tsx` | ~500 | Chat state management, SSE stream reader, markdown-lite renderer (bold headings, bullet lists, inline bold), floating/inline variants, suggestion chips |
| `pnf-ingest-v2.ts` | ~548 | CLI argument parser, PNF text parser (drug name, classification, ATC, pregnancy category, sections), chunking with section-boundary splitting, OpenAI batch embedding, Supabase upload |

---

## Database

### `pnf_chunks` table (Supabase — pgvector)

Stores the embedded drug monograph chunks. Not managed by Drizzle — lives in Supabase.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `content` | `text` | The raw drug monograph text |
| `metadata` | `jsonb` | `{ drugName, classification, sections, atcCode, pregnancyCategory, entryIndex, chunkPart?, totalParts? }` |
| `embedding` | `vector(1536)` | OpenAI `text-embedding-3-small` embedding |

**RPC function:** `match_pnf_chunks(query_embedding, match_count, match_threshold)` — performs cosine similarity search.

### `pnf_chat_logs` table (Neon DB — Drizzle)

Logs every chatbot interaction for analytics and debugging.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `serial` | Auto-increment primary key |
| `question` | `text` | The user's question |
| `answer` | `text` | The full generated answer |
| `citations` | `jsonb` | Reserved for future use (defaults to `[]`) |
| `latency_ms` | `integer` | End-to-end response time in milliseconds |
| `created_at` | `timestamp` | When the interaction occurred |

---

## Configuration

### Environment Variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `AI_API_KEY` | ✅ | — | OpenAI API key for embeddings + chat completions |
| `AI_RESPONSE_MODEL` | ❌ | `gpt-4o-mini` | Which OpenAI model to use for answers |
| `AI_EMBEDDING_MODEL` | ❌ | `text-embedding-3-small` | Which model to use for vector embeddings |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | — | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ | — | Supabase service key (preferred for server-side) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | — | Supabase anon key (fallback) |
| `DATABASE_URL` | ✅ | — | Neon DB connection string (for chat logs) |

---

## Ingestion Script

### Running the script

```bash
# Full ingest (clear existing data and re-upload)
npm run pnf:ingest -- --reset

# Preview without uploading (see chunk counts and samples)
npm run pnf:ingest -- --dry-run

# Custom source file
npm run pnf:ingest -- --source ./path/to/formulary.txt

# Limit to first N entries (for testing)
npm run pnf:ingest -- --dry-run --limit 10
```

### What it does

1. **Reads** `storage/pnf-formulary.txt`
2. **Splits** on `---` separators → 717 drug entries
3. **Parses** each entry → extracts drug name, Rx/OTC, ATC code, pregnancy category, detected sections
4. **Chunks** each entry (1 chunk per drug, split at section boundaries if >6000 chars)
5. **Embeds** chunks in batches of 50 via OpenAI API
6. **Uploads** to Supabase `pnf_chunks` table with embeddings + metadata

### CLI options

| Flag | Description |
|------|-------------|
| `--reset` | Delete all existing `pnf_chunks` rows before ingesting |
| `--dry-run` | Parse and count without uploading |
| `--source <path>` | Custom path to the PNF text file |
| `--batch-size <n>` | Chunks per embedding batch (default: 50) |
| `--limit <n>` | Only process first N entries |

---

## Anti-Hallucination Safeguards

The system uses multiple layers to prevent the model from inventing information:

### 1. RAG architecture

The model never answers from memory — it only sees the PNF extracts provided in the prompt context. If the data isn't in the retrieved chunks, the model cannot reference it.

### 2. Strict system prompt rules

The system prompt enforces:
- **"Source-only answers"** — Every fact must come from the provided context
- **"No fabricated numbers"** — Dosages, frequencies, and ranges must appear verbatim in context
- **"No hedging language"** — Words like "typically" and "usually" are forbidden
- **"Not available in PNF data"** — The required response when information is missing

### 3. Temperature = 0

The model is set to `temperature: 0` (fully deterministic), which minimizes creative/speculative outputs.

### 4. Context-only design

The prompt structure explicitly separates context from the question:

```
## Formulary Extracts
[Source 1] Drug: PARACETAMOL | ...
...actual PNF content...

---

## Question
What is the dosage?
```

This makes it clear to the model that the "Formulary Extracts" section is the only source of truth.

### 5. Max tokens cap

Responses are capped at `max_tokens: 2048`, preventing the model from rambling into hallucination territory.

---

## Performance

### Speed breakdown (per request)

| Step | Time | Calls |
|------|------|-------|
| Drug hint extraction | <1ms | 0 (regex only) |
| Embedding (search query) | 100-200ms | 1 API call |
| Vector search (Supabase RPC) | 50-150ms | 1 RPC call |
| LLM streaming (first token) | 500-1500ms | 1 API call |
| LLM streaming (full response) | 1-3s | (same call) |
| **Total (first token)** | **~1-2s** | **2 calls** |
| **Total (full response)** | **~2-4s** | **2 calls** |

### Why it's fast

- **No LangChain overhead** — Direct API calls to OpenAI and Supabase
- **1 embedding call** (not 2-6) — Single search query instead of multi-query retrieval
- **No drug resolver LLM call** — Regex heuristic instead of a separate GPT call
- **No intent classifier LLM call** — The model determines what to include based on the question
- **Streaming** — User sees text within ~1-2 seconds, doesn't wait for full generation
- **Singleton clients** — Supabase client and OpenAI client are reused across requests

### Storage efficiency

| Metric | Value |
|--------|-------|
| Drug entries | 717 |
| Total chunks | 881 |
| Avg chunk size | ~2,500 chars |
| Embedding dimensions | 1,536 |
| Embedding model | `text-embedding-3-small` |
