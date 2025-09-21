## BOTica

Pharmacy POS and reports app built on Next.js App Router with Drizzle ORM, RBAC, auth (short-lived JWT with rotating refresh), and a Chatbot assistant.

### Getting Started

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`.

### Chatbot: Two-pass AI Pipeline

The legacy Dialogflow integration was removed. The Chatbot now uses a two-pass, JSON-only pipeline:

1. PASS 1 — Intent Extraction

- Route: `POST /api/ai/intent`
- Input: `{ text: string }`
- Output: `{ intent: 'drug_info'|'stock_check'|'dosage'|'other', drugName: string|null, needs: string[], sources: ('internal_db'|'external_db'|'web_search')[] }`

2. PASS 2 — Final Response Composer

- Route: `POST /api/ai/respond`
- Input: PASS 1 output
- Output: `{ patientSummary: string, pharmacistNotes: string[], warnings: string[], sources: string[] }`

The UI component `components/Chatbot.tsx` calls PASS 1 then PASS 2 and renders a readable response on the client. Backend responses are strict JSON—no prose.

### Env cleanup

Remove any Dialogflow environment variables if present:

- `DIALOGFLOW_PROJECT_ID`
- `DIALOGFLOW_CLIENT_EMAIL`
- `DIALOGFLOW_PRIVATE_KEY`
- `DEBUG_DIALOGFLOW`

### Build

```powershell
npm run build
npm start
```

### Tech

- Next.js 15 (App Router), React 19
- Drizzle ORM + Postgres
- Auth: short-lived JWT, rotating refresh tokens, inactivity enforcement
- shadcn/ui, tailwindcss, sonner

### AI Model (optional)

To enable LLM-powered intent extraction in PASS 1 set:

```powershell
# Required
$env:AI_API_KEY = "sk-..."

# Optional overrides
$env:AI_API_BASE = "https://api.openai.com/v1"    # or another OpenAI-compatible endpoint
$env:AI_MODEL = "gpt-5-mini"                      # default already set
```

When unset, the system falls back to deterministic heuristics.

### External data (OpenFDA & MedlinePlus)

PASS 2 pulls indications/dosage/warnings from OpenFDA (primary) and MedlinePlus (fallback) using their public APIs; no API key is required. OpenFDA provides official FDA drug labeling data, while MedlinePlus offers patient-friendly information for common medications.
