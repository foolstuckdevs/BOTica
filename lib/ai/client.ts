import { z } from 'zod';

const AI_API_BASE = process.env.AI_API_BASE || 'https://api.openai.com/v1';
const AI_API_KEY = process.env.AI_API_KEY;
const AI_MODEL = process.env.AI_MODEL || 'gpt-5-mini';

const IntentSchema = z.object({
  intent: z.enum(['drug_info', 'stock_check', 'dosage', 'other']),
  drugName: z.string().nullable().optional(),
  needs: z.array(z.string()).default([]),
  sources: z
    .array(z.enum(['internal_db', 'external_db', 'web_search']))
    .default([]),
});

export type IntentResult = z.infer<typeof IntentSchema>;

type ChatChoice = { message?: { content?: string } };
type ChatResponse = { choices?: ChatChoice[] };

function buildIntentSystemPrompt(): string {
  return [
    'You are an assistant that extracts intent from a pharmacy user query.',
    'Return STRICT JSON only with keys: intent, drugName, needs, sources.',
    "intent must be one of: 'drug_info' | 'stock_check' | 'dosage' | 'other'",
    "drugName is a string or null (e.g., 'Paracetamol 500 mg')",
    "needs is an array of strings from: 'stock','dosage','warnings','price','expiry','local_name'",
    "sources is an array containing any of: 'internal_db','external_db','web_search'",
    'Do not include any extra fields or text. No markdown. JSON only.',
  ].join(' ');
}

export async function extractIntentLLM(
  text: string,
): Promise<IntentResult | null> {
  if (!AI_API_KEY) return null;

  const body = {
    model: AI_MODEL,
    messages: [
      { role: 'system', content: buildIntentSystemPrompt() },
      { role: 'user', content: text },
    ],
    temperature: 0,
    // OpenAI-style JSON mode; other providers may ignore
    response_format: { type: 'json_object' },
  } as const;

  const res = await fetch(`${AI_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    // Silent fallback to heuristics
    return null;
  }

  const data: ChatResponse | null = (await res
    .json()
    .catch(() => null)) as ChatResponse | null;
  const content: string | undefined = data?.choices?.[0]?.message?.content;
  if (!content) return null;

  try {
    const parsed = JSON.parse(content);
    return IntentSchema.parse(parsed);
  } catch {
    return null;
  }
}

export function isAIConfigured(): boolean {
  return Boolean(AI_API_KEY);
}
