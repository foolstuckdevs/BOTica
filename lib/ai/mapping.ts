import { z } from 'zod';

const AI_API_BASE = process.env.AI_API_BASE || 'https://api.openai.com/v1';
const AI_API_KEY = process.env.AI_API_KEY;
const AI_MODEL = process.env.AI_MODEL || 'gpt-4o-mini';

const MappingSchema = z.object({
  mappedName: z.string().default(''),
  confidence: z.number().min(0).max(1).default(0),
});

export type MappingResult = z.infer<typeof MappingSchema> | null;

function buildMappingSystemPrompt(): string {
  return [
    'You map PH drug names or brands to US-equivalent search terms for OpenFDA.',
    'Return STRICT JSON only with keys: mappedName, confidence.',
    'Rules:',
    '- Prefer US generic names (e.g., paracetamol -> acetaminophen).',
    '- Preserve strength if present (e.g., 500 mg).',
    '- If uncertain, set mappedName to empty string and confidence 0.',
    'No extra text; JSON only.',
  ].join(' ');
}

export async function mapToUSEquivalentLLM(
  inputName: string,
  brandPH?: string | null,
  genericName?: string,
): Promise<MappingResult> {
  if (!AI_API_KEY) return null;

  const user = [
    `Name: ${inputName}`,
    brandPH ? `PH Brand: ${brandPH}` : '',
    genericName ? `Generic (PH): ${genericName}` : '',
    'Output a US-equivalent OpenFDA search term.',
  ]
    .filter(Boolean)
    .join('\n');

  const body = {
    model: AI_MODEL,
    messages: [
      { role: 'system', content: buildMappingSystemPrompt() },
      { role: 'user', content: user },
    ],
    temperature: 0,
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
  if (!res.ok) return null;

  try {
    const data: unknown = await res.json();
    const content = (
      data as { choices?: Array<{ message?: { content?: string } }> }
    )?.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content);
    return MappingSchema.parse(parsed);
  } catch {
    return null;
  }
}

export function isAIMappingConfigured(): boolean {
  return Boolean(AI_API_KEY);
}
