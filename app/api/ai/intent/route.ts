import { NextResponse } from 'next/server';
import { extractIntentLLM, isAIConfigured } from '@/lib/ai/client';

export const runtime = 'nodejs';

type IntentType =
  | 'drug_info'
  | 'stock_check'
  | 'dosage'
  | 'alternatives'
  | 'other';

function extractDrugName(text: string): string | null {
  const t = text.trim();
  // Try patterns like "Paracetamol 500 mg" or "Amoxicillin 250mg"
  const mg = t.match(
    /([A-Za-z][A-Za-z\s\-]{1,80}?)\s*(\d{2,4})\s?(mg|ML|ml|MG|mcg|g)\b/,
  );
  if (mg) {
    const name = `${mg[1].replace(/\s+/g, ' ').trim()} ${
      mg[2]
    } ${mg[3].toLowerCase()}`;
    return name;
  }
  // Fallback A: take 1-3 capitalized tokens as a probable brand/generic
  const caps = t.match(
    /\b([A-Z][a-zA-Z]{2,})(?:\s+([A-Z][a-zA-Z]{2,}))?(?:\s+([A-Z][a-zA-Z]{2,}))?\b/,
  );
  if (caps) {
    return [caps[1], caps[2], caps[3]].filter(Boolean).join(' ');
  }
  // Fallback B: allow lowercase generic terms (e.g., "paracetamol")
  const cleaned = t
    .toLowerCase()
    .replace(/[^a-z\s\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (cleaned) {
    const stop = new Set([
      'do',
      'we',
      'have',
      'in',
      'stock',
      'the',
      'a',
      'an',
      'is',
      'there',
      'any',
      'of',
      'for',
      'and',
      'please',
      'you',
      'how',
      'many',
      'much',
      'mg',
      'ml',
      'mcg',
      'g',
    ]);
    const words = cleaned
      .split(' ')
      .filter((w) => w.length >= 3 && !stop.has(w));
    if (words.length > 0) {
      // choose the longest token as probable drug/generic
      words.sort((a, b) => b.length - a.length);
      return words[0];
    }
  }
  return null;
}

function computeNeeds(text: string): string[] {
  const q = text.toLowerCase();
  const needs = new Set<string>();
  if (
    q.includes('stock') ||
    q.includes('available') ||
    q.includes('have in stock') ||
    q.includes('do you have')
  ) {
    needs.add('stock');
  }
  // Detect dosage/administration intent with broader phrasing
  const dosagePatterns: RegExp[] = [
    /\bdosage\b/,
    /\bdose\b/,
    /\bhow\s+much\b/,
    /\bhow\s+many\b/,
    /\bhow\s+to\s+take\b/,
    /\bhow\s+often\b/,
    /\bposology\b/,
    /\badministration\b/,
    /\buse\b.*\bdirections?\b/,
    /\bdirections?\s+for\s+use\b/,
    /\btake\b.*\b\d{2,4}\s*mg\b/,
    /\bevery\s+\d{1,2}\s*(hours|hrs|h)\b/,
  ];
  if (dosagePatterns.some((re) => re.test(q))) {
    needs.add('dosage');
  }
  if (
    q.includes('warning') ||
    q.includes('contraindication') ||
    q.includes('side effect')
  ) {
    needs.add('warnings');
  }
  if (
    q.includes('alternative') ||
    q.includes('alternatives') ||
    q.includes('substitute') ||
    q.includes('substitution') ||
    q.includes('other brand') ||
    q.includes('another brand') ||
    q.includes('generic equivalent') ||
    q.includes('equivalent')
  ) {
    needs.add('alternatives');
  }
  if (q.includes('price') || q.includes('cost')) {
    needs.add('price');
  }
  if (
    q.includes('expiry') ||
    q.includes('expire') ||
    q.includes('expiration')
  ) {
    needs.add('expiry');
  }
  if (
    q.includes('philippines') ||
    q.includes('ph ') ||
    q.includes('ph brand') ||
    q.includes('brand in ph') ||
    q.includes('local name')
  ) {
    needs.add('local_name');
  }
  return Array.from(needs);
}

function decideIntent(needs: string[]): IntentType {
  if (needs.length === 0) return 'other';
  const hasStock = needs.includes('stock');
  const hasDosage = needs.includes('dosage');
  const hasAlt = needs.includes('alternatives');
  if (hasAlt) return 'alternatives';
  if (hasStock && hasDosage) return 'drug_info';
  if (hasStock) return 'stock_check';
  if (hasDosage) return 'dosage';
  return 'drug_info';
}

function decideSources(
  needs: string[],
  text: string,
): Array<'internal_db' | 'external_db' | 'web_search'> {
  const q = text.toLowerCase();
  const out = new Set<'internal_db' | 'external_db' | 'web_search'>();
  if (needs.some((n) => ['stock', 'price', 'expiry', 'local_name'].includes(n)))
    out.add('internal_db');
  if (needs.some((n) => ['dosage', 'warnings'].includes(n)))
    out.add('external_db');
  if (needs.includes('alternatives')) out.add('internal_db');
  if (
    q.includes('advisory') ||
    q.includes('recall') ||
    q.includes('update') ||
    q.includes('ph vs us') ||
    q.includes('difference')
  )
    out.add('web_search');
  if (out.size === 0) {
    // Default to internal for general drug_info queries
    out.add('internal_db');
  }
  return Array.from(out);
}

export async function POST(req: Request) {
  try {
    const { text } = (await req.json()) as { text?: string };
    const clean = (text ?? '').trim();
    if (!clean) {
      return NextResponse.json({ error: 'Missing text' }, { status: 400 });
    }

    // Try LLM if configured
    if (isAIConfigured()) {
      const llm = await extractIntentLLM(clean);
      if (llm) {
        return NextResponse.json(llm);
      }
    }

    // Fallback heuristics
    const drugName = extractDrugName(clean);
    const needs = computeNeeds(clean);
    const intent: IntentType = decideIntent(needs);
    const sources = decideSources(needs, clean);
    return NextResponse.json({ intent, drugName, needs, sources });
  } catch {
    return NextResponse.json(
      { error: 'Failed to extract intent' },
      { status: 500 },
    );
  }
}
