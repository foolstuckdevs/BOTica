# 🤖 BOTica Chatbot: Complete Technical Explanation

## 📚 Table of Contents

1. [High-Level Overview](#high-level-overview)
2. [Data Preparation Phase](#data-preparation-phase)
3. [Query Processing Phase](#query-processing-phase)
4. [Key Files Explained](#key-files-explained)
5. [Database Structure](#database-structure)
6. [Complete Flow Diagram](#complete-flow-diagram)

---

## 🎯 High-Level Overview

Your chatbot uses **RAG (Retrieval-Augmented Generation)** architecture:

```
User Question → Find Relevant Data → Send to AI → Get Answer
```

Think of it like a **smart librarian**:

1. You ask a question about a drug
2. The system searches the Philippine National Formulary (PNF)
3. It finds the most relevant pages
4. Sends those pages + your question to OpenAI
5. OpenAI reads the pages and answers your question

**Key Insight**: The AI doesn't memorize drug information—it reads from your database every time!

---

## 📖 Data Preparation Phase (One-Time Setup)

### Step 1: Load Raw Data

**File**: `lib/rag/loaders/pnf-text-loader.ts`

```
pnf-formulary.txt (84,479 lines)
         ↓
    Split on "---"
         ↓
    717 drug entries
```

**What it does**:

- Reads the massive text file
- Splits it by `---` separators (each drug is separated by `---`)
- Creates 717 separate "documents" (one per drug)

**Key code**:

```typescript
sliceEntries(content: string): string[] {
  return content.split(/\n\s*-{3,}\s*\n/g)  // Split on "---"
}
```

---

### Step 2: Parse Drug Information

**File**: `lib/rag/parsers/pnf-text-parser.ts`

```
Raw drug text
      ↓
Extract sections
      ↓
Structured data
```

**What it does**:

- Takes each drug entry
- Identifies sections (Dosage, Contraindications, Side Effects, etc.)
- Extracts metadata (drug name, ATC code, pregnancy category)
- Creates structured objects

**Example Input**:

```
PARACETAMOL
Oral: 500mg tablet
Indications: Pain relief
Dosage: 500mg every 4-6 hours
...
```

**Example Output**:

```javascript
{
  drugName: "PARACETAMOL",
  sections: {
    indications: "Pain relief",
    dosage: "500mg every 4-6 hours",
    ...
  },
  atcCode: "N02BE01",
  pregnancyCategory: "C"
}
```

**Key sections detected**:

- `indications` - What the drug treats
- `contraindications` - When NOT to use it
- `dosage` - How much to take
- `doseAdjustment` - Special cases (kidney/liver issues)
- `precautions` - Warnings
- `adverseReactions` - Side effects
- `drugInteractions` - Drug-drug interactions
- `administration` - How to give the drug
- `formulations` - Available forms (tablet, syrup, etc.)

---

### Step 3: Create Chunks

**File**: `lib/rag/parsers/pnf-text-parser.ts`

```
1 drug entry
      ↓
Split into sections
      ↓
7-9 smaller chunks
```

**Why chunk?**

- OpenAI has a context limit (~128k tokens)
- Sending the entire formulary would be too big
- Chunking lets us send only relevant pieces

**Example**: Paracetamol creates 7 chunks:

1. Overview (639 chars)
2. Dosage (2,243 chars)
3. Dose Adjustment (231 chars)
4. Precautions (832 chars)
5. Adverse Reactions (903 chars)
6. Drug Interactions (1,085 chars)
7. Administration (837 chars)

**Total**: 717 drugs × ~7 chunks = **4,958 chunks**

---

### Step 4: Generate Embeddings

**File**: `lib/rag/vectorstore.ts`

```
Text chunk
      ↓
OpenAI Embedding API
      ↓
Vector (1536 numbers)
```

**What are embeddings?**

- Mathematical representation of text meaning
- Similar texts have similar vectors
- Enables semantic search

**Example**:

```typescript
"paracetamol dosage" → [0.23, -0.14, 0.87, ..., 0.45]  // 1536 numbers
"acetaminophen dose" → [0.21, -0.16, 0.89, ..., 0.43]  // Very similar!
```

**Model used**: `text-embedding-3-small` (OpenAI)

- Fast and cheap
- Good enough for drug matching
- 1536 dimensions per vector

---

### Step 5: Store in Database

**File**: `scripts/pnf-ingest.ts`

```
4,958 chunks
      ↓
Generate embeddings
      ↓
Save to Supabase
```

**Database table**: `pnf_chunks`

**What gets stored**:

```sql
CREATE TABLE pnf_chunks (
  id UUID PRIMARY KEY,
  content TEXT,              -- The actual text
  embedding VECTOR(1536),    -- The embedding vector
  metadata JSONB             -- Drug name, section, etc.
);
```

**Example row**:

```json
{
  "id": "abc-123",
  "content": "ADULT: 500mg every 4-6 hours (max 4g daily)",
  "embedding": [0.23, -0.14, ...],
  "metadata": {
    "drugName": "PARACETAMOL",
    "section": "dosage",
    "atcCode": "N02BE01"
  }
}
```

**Indexing for fast search**:

```sql
CREATE INDEX ON pnf_chunks
USING ivfflat (embedding vector_cosine_ops);
```

This makes vector search extremely fast (milliseconds for 4,958 chunks).

---

## 🔍 Query Processing Phase (Every User Question)

### Step 1: User Asks Question

**File**: `components/PnfChatbot.tsx`

```
User types: "dosage for paracetamol"
         ↓
Send to /api/pnf-chat
```

**What happens in the UI**:

```typescript
const sendMessage = async (question) => {
  const response = await fetch('/api/pnf-chat', {
    method: 'POST',
    body: JSON.stringify({
      question: 'dosage for paracetamol',
      chatHistory: previousMessages,
      lastDrugDiscussed: 'PARACETAMOL', // For context
    }),
  });

  const { answer, latencyMs } = await response.json();
  // Display answer to user
};
```

---

### Step 2: Detect Intent

**File**: `lib/rag/chains/pnf-chat-chain.ts`

```
"dosage for paracetamol"
         ↓
Pattern matching
         ↓
Intent: DOSAGE
```

**Intent patterns**:

```typescript
const INTENT_PATTERNS = {
  dosage: /\b(dosage|dose|dosing|how much)\b/i,
  sideEffects: /\b(side effect|adverse)\b/i,
  contraindications: /\b(contraindication|should not)\b/i,
  // ... more patterns
};
```

**Why detect intent?**

- Fetch only relevant sections (faster)
- Show only relevant information (cleaner)
- Smaller prompts = cheaper & faster

**Example**:

- "dosage for X" → Only fetch dosage sections
- "side effects of X" → Only fetch adverse reactions
- "tell me about X" → Fetch all sections

---

### Step 3: Retrieve Relevant Documents

**File**: `lib/rag/retriever.ts` & `app/api/pnf-chat/route.ts`

```
User question
      ↓
Convert to embedding
      ↓
Find similar vectors
      ↓
Return top 4 chunks
```

**How vector search works**:

1. **User question is embedded**:

```typescript
"dosage for paracetamol" → [0.24, -0.15, 0.88, ...]
```

2. **Compare with all 4,958 chunk embeddings**:

```sql
SELECT content, metadata,
       embedding <=> query_embedding AS distance
FROM pnf_chunks
ORDER BY distance ASC
LIMIT 4;
```

3. **Returns closest matches**:

```javascript
[
  { content: 'ADULT: 500mg every 4-6 hours...', drugName: 'PARACETAMOL' },
  { content: 'CHILD: 10-15mg/kg per dose...', drugName: 'PARACETAMOL' },
  { content: 'By IV: 650mg every 4 hours...', drugName: 'PARACETAMOL' },
  { content: 'Maximum daily dose: 4g', drugName: 'PARACETAMOL' },
];
```

**Smart optimizations**:

- If follow-up question, prioritize last drug discussed
- Run multiple query variations in parallel
- Filter by detected intent (only dosage sections)
- Deduplicate results

---

### Step 4: Build Context

**File**: `lib/rag/chains/pnf-chat-chain.ts`

```
Retrieved chunks
      ↓
Format for AI
      ↓
Add citations
```

**Context formatting**:

```typescript
const context = workingDocuments
  .map((doc, index) => {
    return `[#${index + 1}] Drug: ${doc.metadata.drugName}
${doc.pageContent}`;
  })
  .join('\n\n');
```

**Example context**:

```
[#1] Drug: PARACETAMOL
ADULT: 500mg-1g every 4-6 hours (maximum 4g daily)
CHILD: 10-15mg/kg per dose

[#2] Drug: PARACETAMOL
By IV: 650mg every 4 hours or 1000mg every 6 hours

[#3] Drug: PARACETAMOL
Infants <3 months: consult doctor first
```

---

### Step 5: Build Prompt

**File**: `lib/rag/prompts/pnf-chat-prompt.ts`

```
System prompt + Context + Question
      ↓
Complete prompt
```

**The full prompt sent to OpenAI**:

```
SYSTEM:
You are BOTica — a Drug Reference Assistant.
Respond ONLY using the Philippine National Formulary context provided.
NEVER use training data or general knowledge.

If the context doesn't contain the answer, say:
"This information is not available in the Philippine National Formulary."

You must respond in JSON format with these fields:
{
  "sections": {
    "overview": "...",
    "dosage": "...",
    // ... other sections
  },
  "answer": "summary here"
}

CONTEXT:
[#1] Drug: PARACETAMOL
ADULT: 500mg-1g every 4-6 hours...
[#2] Drug: PARACETAMOL
By IV: 650mg every 4 hours...

USER QUESTION:
What is the dosage for paracetamol?

RESPOND:
```

---

### Step 6: Get AI Response

**File**: `lib/rag/chains/pnf-chat-chain.ts`

```
Complete prompt
      ↓
OpenAI GPT-4o-mini
      ↓
JSON response
```

**OpenAI processing**:

- Model: `gpt-4o-mini` (fast & cheap)
- Temperature: 0 (deterministic, no creativity)
- Max tokens: 2000 (limit response length)
- JSON mode: Enforced (guarantees valid JSON)

**Example response**:

```json
{
  "sections": {
    "overview": "Paracetamol is used for mild-to-moderate pain and fever.",
    "dosage": "ADULT: 500mg-1g every 4-6 hours (max 4g daily). CHILD: 10-15mg/kg per dose.",
    "doseAdjustment": "Reduce dose in hepatic impairment"
    // ... other sections
  },
  "answer": "For adults: 500mg-1g every 4-6 hours, maximum 4g daily. For children: 10-15mg/kg per dose."
}
```

---

### Step 7: Format & Return

**File**: `lib/rag/chains/pnf-chat-chain.ts` & `app/api/pnf-chat/route.ts`

```
Raw JSON
      ↓
Format sections
      ↓
Send to frontend
```

**Formatting**:

```typescript
function formatAnswerFromSections(sections) {
  const parts = [];

  if (sections.overview) {
    parts.push(`Overview:\n${sections.overview}`);
  }

  if (sections.dosage) {
    parts.push(`Dosage:\n${sections.dosage}`);
  }

  return parts.join('\n\n');
}
```

**Final response to user**:

```
Overview:
Paracetamol is used for mild-to-moderate pain and fever.

Dosage:
ADULT: 500mg-1g every 4-6 hours (max 4g daily)
CHILD: 10-15mg/kg per dose
```

---

### Step 8: Display to User

**File**: `components/PnfChatbot.tsx`

```
API response
      ↓
Parse sections
      ↓
Render with formatting
```

**UI rendering**:

```typescript
function renderAssistantContent(message) {
  return message.content.split('\n').map((line) => {
    // Bold section headings
    if (/^\s*[A-Z][A-Za-z\s]+:\s*$/.test(line)) {
      return <p className="font-bold">{line}</p>;
    }
    // Regular text
    return <p>{line}</p>;
  });
}
```

---

## 📂 Key Files Explained

### 1. **Data Preparation** (Run Once)

#### `lib/rag/loaders/pnf-text-loader.ts`

**Purpose**: Split the giant text file into manageable pieces

- **Input**: `pnf-formulary.txt` (84k lines)
- **Output**: 717 drug documents
- **Key method**: `sliceEntries()` - splits on `---`

#### `lib/rag/parsers/pnf-text-parser.ts`

**Purpose**: Extract structured data from raw text

- **Input**: Raw drug text
- **Output**: Structured objects with sections
- **Key methods**:
  - `parse()` - Main parsing logic
  - `detectSection()` - Find section headers
  - `toRawChunks()` - Convert to chunks

#### `scripts/pnf-ingest.ts`

**Purpose**: Upload chunks to database

- **Input**: 4,958 chunks
- **Output**: Database entries with embeddings
- **Process**:
  1. Load & parse text file
  2. Generate embeddings via OpenAI
  3. Upload to Supabase in batches

---

### 2. **Vector Storage**

#### `lib/rag/vectorstore.ts`

**Purpose**: Interface with Supabase vector database

- **Creates**: Supabase client
- **Creates**: OpenAI embeddings client
- **Creates**: Vector store connection
- **Caches**: Instance for performance

**Key insight**: Uses `pgvector` extension in PostgreSQL for fast similarity search

---

### 3. **Query Processing** (Every Request)

#### `app/api/pnf-chat/route.ts` ⭐ **MOST IMPORTANT**

**Purpose**: Main API endpoint that orchestrates everything

- **Receives**: User question
- **Returns**: Formatted answer

**Complete flow**:

```typescript
export async function POST(req: NextRequest) {
  // 1. Parse request
  const { question, chatHistory, lastDrugDiscussed } = await req.json();

  // 2. Create retriever
  const retriever = await createPNFRetriever({ k: 4 });

  // 3. Build query variants
  const queries = [question];
  if (lastDrugDiscussed) {
    queries.push(`${lastDrugDiscussed} ${question}`);
  }

  // 4. Retrieve documents (parallel)
  const docs = await Promise.all(
    queries.map((q) => retriever.getRelevantDocuments(q)),
  );

  // 5. Deduplicate & prioritize
  const documents = deduplicateAndSort(docs, lastDrugDiscussed);

  // 6. Run AI chain
  const result = await runPNFChatChain({
    question,
    chatHistory,
    documents,
    activeDrugHint: lastDrugDiscussed,
  });

  // 7. Log to database
  await db.insert(pnfChatLogs).values({
    question,
    answer: result.response.answer,
    latencyMs,
  });

  // 8. Return response
  return Response.json({
    answer: result.response.answer,
    latencyMs,
    drugContext: result.primaryDrug,
  });
}
```

#### `lib/rag/retriever.ts`

**Purpose**: Find relevant chunks from vector database

- **Input**: User question
- **Output**: Top k similar chunks
- **Uses**: Cosine similarity search

#### `lib/rag/chains/pnf-chat-chain.ts` ⭐ **MOST IMPORTANT**

**Purpose**: Main AI logic and orchestration

- **Detects intent** from question
- **Identifies active drug** from context
- **Filters documents** by intent
- **Builds prompt** with context
- **Calls OpenAI** for answer
- **Formats response** for user

**Key functions**:

```typescript
// Detect what user is asking about
function detectIntent(question) {
  if (/dosage|dose/.test(question)) return ['dosage', 'doseAdjustment'];
  if (/side effect/.test(question)) return ['adverseReactions'];
  // ...
}

// Find which drug we're discussing
function resolveActiveDrug(question, history, documents) {
  // Check current question
  // Check chat history
  // Return best match
}

// Main execution
async function runPNFChatChain({ question, documents }) {
  const intent = detectIntent(question);
  const drug = resolveActiveDrug(question, history, documents);
  const filteredDocs = filterByIntentAndDrug(documents, intent, drug);
  const context = buildContext(filteredDocs);
  const response = await llm.invoke({ question, context });
  return formatResponse(response);
}
```

#### `lib/rag/prompts/pnf-chat-prompt.ts`

**Purpose**: Define system instructions for AI

- **System prompt**: Behavior rules
- **User template**: Question format
- **Format instructions**: JSON schema

---

### 4. **User Interface**

#### `components/PnfChatbot.tsx`

**Purpose**: Chat UI component

- **Manages**: Conversation state
- **Handles**: User input
- **Displays**: Formatted responses
- **Tracks**: Last drug discussed (for context)

**Key state**:

```typescript
const [messages, setMessages] = useState([]);
const [lastDrugDiscussed, setLastDrugDiscussed] = useState('');

// When sending message
fetch('/api/pnf-chat', {
  body: JSON.stringify({
    question,
    chatHistory: messages.map((m) => `${m.role}: ${m.content}`),
    lastDrugDiscussed,
  }),
});

// Update context from response
setLastDrugDiscussed(response.drugContext);
```

---

## 🗄️ Database Structure

### Supabase Tables

#### `pnf_chunks` (Vector Store)

```sql
CREATE TABLE pnf_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,              -- The actual chunk text
  embedding VECTOR(1536) NOT NULL,    -- OpenAI embedding
  metadata JSONB NOT NULL,            -- Drug info
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fast vector search
CREATE INDEX ON pnf_chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Fast drug lookup
CREATE INDEX ON pnf_chunks ((metadata->>'drugName'));
```

**Example row**:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "content": "ADULT: 0.5–1 g every 4–6 hours (maximum, 4 g daily); CHILD 6–12 years, 250–500 mg...",
  "embedding": [0.0234, -0.0156, 0.0891, ..., 0.0445],
  "metadata": {
    "drugName": "PARACETAMOL",
    "section": "dosage",
    "entryRange": "491",
    "atcCode": "N02BE01",
    "pregnancyCategory": "C",
    "classification": "Rx"
  },
  "created_at": "2025-10-10T00:00:00Z"
}
```

**Total**: 4,958 rows

#### `pnf_chat_logs` (Analytics)

```sql
CREATE TABLE pnf_chat_logs (
  id SERIAL PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  latency_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Purpose**: Track usage and performance

---

## 🔄 Complete Flow Diagram

### Data Preparation (One-Time)

```
┌─────────────────────────────────────────────────────────────────┐
│                     DATA PREPARATION PHASE                       │
└─────────────────────────────────────────────────────────────────┘

pnf-formulary.txt (84,479 lines)
        │
        │ lib/rag/loaders/pnf-text-loader.ts
        ▼
Split by "---" separator
        │
        ▼
717 raw drug documents
        │
        │ lib/rag/parsers/pnf-text-parser.ts
        ▼
Parse into structured sections
        │
        ▼
717 structured drug entries
        │
        │ lib/rag/parsers/pnf-text-parser.ts
        ▼
Break into 4,958 small chunks
        │
        │ scripts/pnf-ingest.ts
        ▼
Generate embeddings (OpenAI API)
        │
        ▼
4,958 chunks with embeddings
        │
        │ lib/rag/vectorstore.ts
        ▼
┌─────────────────────────────────────┐
│   Supabase Database (pnf_chunks)    │
│  - content: TEXT                    │
│  - embedding: VECTOR(1536)          │
│  - metadata: JSONB                  │
└─────────────────────────────────────┘
```

### Query Processing (Every Request)

```
┌─────────────────────────────────────────────────────────────────┐
│                    QUERY PROCESSING PHASE                        │
└─────────────────────────────────────────────────────────────────┘

User types: "dosage for paracetamol"
        │
        │ components/PnfChatbot.tsx
        ▼
POST /api/pnf-chat
        │
        │ app/api/pnf-chat/route.ts
        ▼
┌───────────────────────────────┐
│  1. Parse Request             │
│     - question                │
│     - chatHistory             │
│     - lastDrugDiscussed       │
└───────────────────────────────┘
        │
        ▼
┌───────────────────────────────┐
│  2. Build Query Variants      │
│     - "dosage for paracetamol"│
│     - "paracetamol dosage"    │
└───────────────────────────────┘
        │
        │ lib/rag/retriever.ts
        ▼
┌───────────────────────────────┐
│  3. Vector Search (parallel)  │
│     - Convert to embedding    │
│     - Search database         │
│     - Return top 4 chunks     │
└───────────────────────────────┘
        │
        ▼
┌───────────────────────────────┐
│  4. Deduplicate & Filter      │
│     - Remove duplicates       │
│     - Prioritize active drug  │
│     - Filter by intent        │
└───────────────────────────────┘
        │
        │ lib/rag/chains/pnf-chat-chain.ts
        ▼
┌───────────────────────────────┐
│  5. Detect Intent             │
│     "dosage" → dosage section │
└───────────────────────────────┘
        │
        ▼
┌───────────────────────────────┐
│  6. Build Context             │
│     [#1] PARACETAMOL dosage   │
│     [#2] PARACETAMOL admin    │
└───────────────────────────────┘
        │
        │ lib/rag/prompts/pnf-chat-prompt.ts
        ▼
┌───────────────────────────────┐
│  7. Build Prompt              │
│     System + Context + Q      │
└───────────────────────────────┘
        │
        │ OpenAI API (gpt-4o-mini)
        ▼
┌───────────────────────────────┐
│  8. Get AI Response           │
│     JSON with sections        │
└───────────────────────────────┘
        │
        ▼
┌───────────────────────────────┐
│  9. Format Response           │
│     Overview: ...             │
│     Dosage: ...               │
└───────────────────────────────┘
        │
        │ app/api/pnf-chat/route.ts
        ▼
┌───────────────────────────────┐
│  10. Log to Database          │
│      pnf_chat_logs table      │
└───────────────────────────────┘
        │
        │ components/PnfChatbot.tsx
        ▼
Display formatted answer to user
```

---

## 🎓 Key Concepts Explained

### What is RAG (Retrieval-Augmented Generation)?

**Traditional AI**:

```
Question → AI (uses training data) → Answer
Problem: Outdated, hallucinates, can't cite sources
```

**RAG AI** (Your chatbot):

```
Question → Search Database → Send relevant data → AI reads data → Answer
Benefit: Always current, grounded in facts, can cite sources
```

### What are Embeddings?

**Simple explanation**: Converting text to numbers that capture meaning

```
"paracetamol" → [0.23, -0.14, 0.87, ...]
"acetaminophen" → [0.21, -0.16, 0.89, ...]
(These are SIMILAR vectors = similar meaning!)

"aspirin" → [0.89, -0.76, 0.12, ...]
(This is DIFFERENT = different drug)
```

**Math behind it**: Cosine similarity

```
similarity = cos(angle between vectors)
1.0 = identical
0.0 = unrelated
```

### What is Vector Search?

**Traditional search** (keyword matching):

```sql
SELECT * FROM drugs
WHERE name LIKE '%paracetamol%';
```

Problem: Misses "acetaminophen", "APAP", typos

**Vector search** (semantic matching):

```sql
SELECT * FROM pnf_chunks
ORDER BY embedding <=> query_embedding
LIMIT 4;
```

Finds: "paracetamol", "acetaminophen", "APAP", even with typos!

### Why Chunk the Data?

**Problem**: OpenAI has context limits

- Can't send entire formulary (too big)
- Need to be selective about what we send

**Solution**: Break into chunks

- Each chunk = one drug section
- Search finds relevant chunks only
- Send only what's needed

**Analogy**: Like index cards in a library

- Each card = one topic
- Find relevant cards
- Read only those cards

---

## 🔍 How Context Awareness Works

### Follow-up Questions

**Scenario**:

```
User: "dosage for paracetamol"
Bot: [explains dosage]
User: "what about side effects?"  ← No drug mentioned!
```

**How it stays on topic**:

1. **Track last drug discussed**:

```typescript
const [lastDrugDiscussed, setLastDrugDiscussed] = useState('');

// After first response
setLastDrugDiscussed('PARACETAMOL');
```

2. **Include in next query**:

```typescript
const queries = [
  "what about side effects?",
  "PARACETAMOL what about side effects?"  ← Combined!
];
```

3. **Prioritize matching drug**:

```typescript
docs.sort((a, b) => {
  if (a.drugName === lastDrugDiscussed) return -1; // First
  if (b.drugName === lastDrugDiscussed) return 1;
  return 0;
});
```

**Result**: Bot finds PARACETAMOL side effects, not random drugs!

---

## ⚡ Performance Optimizations

### Why Some Queries Are Slow

**Bottlenecks**:

1. **Vector search**: ~500ms (searching 4,958 vectors)
2. **OpenAI API**: ~5-10s (generating response)
3. **Network latency**: ~200ms (Philippines → US)

**Total**: ~7-12 seconds

### How We Made It Faster

1. **Cached vector store**: Save 200ms per request
2. **Parallel queries**: Run multiple searches at once
3. **Reduced k**: Fewer documents = smaller prompt
4. **JSON mode**: No parsing errors = no retries
5. **Max tokens**: Limit response length

**Before**: 50-55 seconds
**After**: 7-12 seconds (80% faster!)

---

## 🎯 Summary: The Magic Happens Here

### Most Critical Files (Read These First!)

1. **`app/api/pnf-chat/route.ts`**

   - Main orchestrator
   - Connects all pieces
   - 203 lines that tie everything together

2. **`lib/rag/chains/pnf-chat-chain.ts`**

   - AI logic
   - Intent detection
   - Context building
   - Response formatting

3. **`lib/rag/parsers/pnf-text-parser.ts`**
   - Data extraction
   - Section detection
   - Chunk creation

### The Secret Sauce

**It's NOT magic—it's clever engineering**:

1. **Smart chunking**: Break data into searchable pieces
2. **Vector embeddings**: Enable semantic search
3. **Intent detection**: Fetch only what's needed
4. **Context tracking**: Remember conversation flow
5. **Grounded AI**: Force AI to use provided context only

### One-Sentence Summary

> "Your chatbot uses vector similarity search to find relevant drug information from a pre-processed database, then sends that specific information to OpenAI which formats it into a natural language answer—essentially creating a smart, grounded AI that never hallucinates because it always reads from your data."

---

## 🚀 Want to Learn More?

### Deep Dive Topics

1. **Vector Databases**: Learn about pgvector, FAISS, Pinecone
2. **LangChain**: Framework for building LLM apps
3. **Prompt Engineering**: Crafting better AI instructions
4. **Semantic Search**: Beyond keyword matching

### Next Steps

1. Read `app/api/pnf-chat/route.ts` line by line
2. Trace a query through the system with console.logs
3. Modify intent patterns to add new query types
4. Experiment with different prompt templates

---

**Questions?** This documentation explains the complete system. Each section builds on the previous one, starting from raw data and ending with user-facing responses.
