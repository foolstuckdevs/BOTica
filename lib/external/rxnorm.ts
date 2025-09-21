// RxNorm-based mapper: map terms like "paracetamol" to US generic "acetaminophen".
// Also preserves strength tokens from the original input (e.g., 500 mg).

export type RxNormMapping = {
  mappedName: string | null;
  confidence: number; // 0..1 roughly based on RxNorm score
  provenance: string[]; // URLs consulted for debug/logging
};

function extractStrengthTokens(input: string): string {
  const matches = input.match(/\b(\d{1,4})\s?(mg|mcg|g|ml)\b/gi) || [];
  // Also catch formulations like "500mg/5ml"
  const frac =
    input.match(
      /\b(\d{1,4}\s?(?:mg|mcg|g))\s?\/(\s?\d{1,4}\s?(?:ml|mg))\b/gi,
    ) || [];
  const tokens = [...matches, ...frac].map((s) =>
    s.replace(/\s+/g, ' ').toLowerCase(),
  );
  return Array.from(new Set(tokens)).join(' ');
}

type RxNormApproximateResponse = {
  approximateGroup?: {
    candidate?: Array<{
      rxcui?: string;
      rank?: string;
      score?: string;
      name?: string;
    }>;
  };
};

import { memoizeAsync } from '@/lib/cache/ttl';

type RxNormPropertyResponse = {
  propConceptGroup?: {
    propConcept?: Array<{
      propName?: string;
      propValue?: string;
    }>;
  };
};

async function fetchCanonicalName(
  provenance: string[],
  rxcui?: string,
): Promise<string | null> {
  if (!rxcui) return null;
  const url = `https://rxnav.nlm.nih.gov/REST/rxcui/${encodeURIComponent(
    rxcui,
  )}/property.json?propName=${encodeURIComponent('RxNorm Name')}`;
  provenance.push(url);
  try {
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) return null;
    const data: RxNormPropertyResponse = await res.json();
    const val = data?.propConceptGroup?.propConcept?.[0]?.propValue;
    return (val || null)?.toLowerCase() || null;
  } catch {
    return null;
  }
}

async function _mapToUSGenericViaRxNorm(term: string): Promise<RxNormMapping> {
  const provenance: string[] = [];
  try {
    const strengths = extractStrengthTokens(term);
    const base = term
      .toLowerCase()
      .replace(/\b\d{1,4}\s?(mg|mcg|g|ml)\b/gi, '')
      .replace(/\b\d{1,4}\s?(?:mg|mcg|g)\s?\/\s?\d{1,4}\s?(?:ml|mg)\b/gi, '')
      .replace(/[^a-z0-9\s\-]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const q = encodeURIComponent(base);
    const url = `https://rxnav.nlm.nih.gov/REST/approximateTerm.json?term=${q}&maxEntries=3`;
    provenance.push(url);
    console.log(`[RxNorm] Mapping "${term}" -> base "${base}" -> URL ${url}`);
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) {
      console.log(`[RxNorm] HTTP ${res.status} for ${url}`);
      return { mappedName: null, confidence: 0, provenance };
    }
    const data: RxNormApproximateResponse = await res.json();
    const cands = data?.approximateGroup?.candidate || [];
    console.log(
      `[RxNorm] Found ${cands.length} candidates:`,
      cands.map((c) => ({ name: c.name, score: c.score, rxcui: c.rxcui })),
    );
    if (!cands.length) return { mappedName: null, confidence: 0, provenance };

    // Choose highest score; prefer IN (ingredient) types when available
    cands.sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));
    const top = cands[0];
    const name = (top?.name as string | undefined) || null;
    const scoreNum = Number(top?.score) || 0;
    if (!name) return { mappedName: null, confidence: 0, provenance };

    // Prefer canonical US RxNorm Name when available
    const canonical = await fetchCanonicalName(provenance, top?.rxcui);
    let mapped = (canonical || name).toLowerCase();
    console.log(
      `[RxNorm] Top candidate: "${name}", canonical: "${canonical}", mapped: "${mapped}"`,
    );
    // Preserve strength tokens from original if present and not already in name
    if (
      strengths &&
      !new RegExp(
        `\\b${strengths.replace(/[-/\\^$*+?.()|[\]{}]/g, '.')}\\b`,
        'i',
      ).test(mapped)
    ) {
      mapped = `${mapped} ${strengths}`.trim();
    }

    const result = {
      mappedName: mapped,
      confidence: Math.max(0, Math.min(1, scoreNum / 100)),
      provenance,
    };
    console.log(`[RxNorm] Final result:`, result);
    return result;
  } catch (error) {
    console.log(`[RxNorm] Error mapping "${term}":`, error);
    return { mappedName: null, confidence: 0, provenance };
  }
}

// Cache for 24 hours
const mapToUSGenericViaRxNormCached = memoizeAsync(
  _mapToUSGenericViaRxNorm,
  24 * 60 * 60 * 1000,
  (term: string) => term.trim().toLowerCase(),
);

export async function mapToUSGenericViaRxNorm(
  term: string,
): Promise<RxNormMapping> {
  return mapToUSGenericViaRxNormCached(term);
}
