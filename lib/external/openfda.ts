import { TTLCache } from '@/lib/cache/ttl';

type ExternalInfo = {
  indications?: string;
  dosage?: string;
  warnings?: string;
  brandUS?: string;
  citations?: string[];
  sideEffects?: string;
};

export type OpenFDAIntentHint = 'dosage' | 'usage' | 'sideEffects' | 'general';

const BASE = 'https://api.fda.gov';
// Cache for 6 hours since drug labeling doesn't change frequently
const labelCache = new TTLCache<string, OpenFDAResult[]>(6 * 60 * 60 * 1000);

type OpenFDAMeta = {
  disclaimer: string;
  terms: string;
  license: string;
  last_updated: string;
  results: {
    skip: number;
    limit: number;
    total: number;
  };
};

type OpenFDAResult = {
  active_ingredient?: string[];
  purpose?: string[];
  indications_and_usage?: string[];
  warnings?: string[];
  dosage_and_administration?: string[];
  adverse_reactions?: string[];
  openfda?: {
    brand_name?: string;
    generic_name?: string;
    manufacturer_name?: string;
    product_type?: string;
    route?: string;
    substance_name?: string;
  };
  set_id?: string;
  id?: string;
};

type OpenFDAResponse = {
  meta: OpenFDAMeta;
  results: OpenFDAResult[];
};

function withTimeout<T>(p: Promise<T>, ms = 8000): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }).catch((e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}

async function fetchJSON<T>(url: string): Promise<T> {
  return withTimeout(
    fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    }).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
      return r.json() as Promise<T>;
    }),
  );
}

function extractDosageInfo(results: OpenFDAResult[]): string | undefined {
  for (const result of results) {
    if (
      result.dosage_and_administration &&
      result.dosage_and_administration.length > 0
    ) {
      // Clean up the dosage text and make it more generic
      let dosageText = result.dosage_and_administration[0]
        .replace(/Directions\s*/i, '')
        .replace(/\s+/g, ' ')
        .trim();

      // Remove specific dosage form references to make it more generic
      dosageText = dosageText
        .replace(/\b(gelcaps?|tablets?|capsules?|caplets?)\b/gi, 'dose')
        .replace(/take\s+\d+\s+dose/gi, 'take the appropriate dose')
        .replace(/\d+\s+dose\s+every/gi, 'the recommended dose every')
        .replace(
          /more than \d+ dose/gi,
          'more than the maximum recommended doses',
        );

      return dosageText;
    }
  }
  return undefined;
}

function extractUsageInfo(results: OpenFDAResult[]): string | undefined {
  for (const result of results) {
    if (
      result.indications_and_usage &&
      result.indications_and_usage.length > 0
    ) {
      return result.indications_and_usage[0]
        .replace(/Uses\s*/i, '')
        .replace(/\s+/g, ' ')
        .trim();
    }
    if (result.purpose && result.purpose.length > 0) {
      return result.purpose[0]
        .replace(/Purpose\s*/i, '')
        .replace(/\s+/g, ' ')
        .trim();
    }
  }
  return undefined;
}

function extractWarningsInfo(results: OpenFDAResult[]): string | undefined {
  for (const result of results) {
    if (result.warnings && result.warnings.length > 0) {
      // Get first few sentences to avoid overwhelming response
      const fullWarnings = result.warnings[0];
      const sentences = fullWarnings.split(/[.!?]+/);
      return (
        sentences.slice(0, 3).join('. ').trim() +
        (sentences.length > 3 ? '...' : '')
      );
    }
  }
  return undefined;
}

function extractSideEffectsInfo(results: OpenFDAResult[]): string | undefined {
  for (const result of results) {
    if (result.adverse_reactions && result.adverse_reactions.length > 0) {
      return result.adverse_reactions[0].replace(/\s+/g, ' ').trim();
    }
    // Also check warnings for side effect information
    if (result.warnings && result.warnings.length > 0) {
      const warnings = result.warnings[0].toLowerCase();
      if (
        warnings.includes('side effect') ||
        warnings.includes('adverse') ||
        warnings.includes('reaction')
      ) {
        const sentences = result.warnings[0].split(/[.!?]+/);
        const relevantSentences = sentences.filter(
          (s) =>
            s.toLowerCase().includes('side effect') ||
            s.toLowerCase().includes('adverse') ||
            s.toLowerCase().includes('reaction'),
        );
        if (relevantSentences.length > 0) {
          return relevantSentences.slice(0, 2).join('. ').trim();
        }
      }
    }
  }
  return undefined;
}

function extractBrandName(results: OpenFDAResult[]): string | undefined {
  for (const result of results) {
    if (result.openfda?.brand_name) {
      return result.openfda.brand_name;
    }
  }
  return undefined;
}

async function searchOpenFDA(
  drugName: string,
  limit = 5,
): Promise<OpenFDAResult[]> {
  const cacheKey = `${drugName}|${limit}`;
  const cached = labelCache.get(cacheKey);
  if (cached) {
    console.log(`[OpenFDA] Cache hit for "${drugName}"`);
    return cached;
  }

  console.log(`[OpenFDA] Searching for "${drugName}"`);

  try {
    // Search by active ingredient first
    const activeIngredientQuery = encodeURIComponent(
      `active_ingredient:"${drugName}"`,
    );
    const url = `${BASE}/drug/label.json?search=${activeIngredientQuery}&limit=${limit}`;
    console.log(`[OpenFDA] Trying active_ingredient search: ${url}`);

    const response = await fetchJSON<OpenFDAResponse>(url);

    if (response.results && response.results.length > 0) {
      console.log(
        `[OpenFDA] Found ${response.results.length} results for "${drugName}"`,
      );
      labelCache.set(cacheKey, response.results);
      return response.results;
    }
  } catch (error) {
    console.log(
      `[OpenFDA] Active ingredient search failed for "${drugName}":`,
      error,
    );
  }

  try {
    // Fallback to generic name search
    const genericQuery = encodeURIComponent(drugName);
    const url = `${BASE}/drug/label.json?search=openfda.generic_name:"${genericQuery}"&limit=${limit}`;
    console.log(`[OpenFDA] Trying generic_name search: ${url}`);

    const response = await fetchJSON<OpenFDAResponse>(url);

    if (response.results && response.results.length > 0) {
      console.log(
        `[OpenFDA] Found ${response.results.length} results via generic_name for "${drugName}"`,
      );
      labelCache.set(cacheKey, response.results);
      return response.results;
    }
  } catch (error) {
    console.log(
      `[OpenFDA] Generic name search failed for "${drugName}":`,
      error,
    );
  }

  console.log(`[OpenFDA] No results found for "${drugName}"`);
  labelCache.set(cacheKey, []);
  return [];
}

function cleanDrugNameForSearch(drugName: string): string {
  // Remove dosage forms, strengths, and other modifiers for better OpenFDA search
  return (
    drugName
      .toLowerCase()
      // Remove strengths (500mg, 80mg, etc.)
      .replace(/\b\d+\s?(mg|ml|mcg|μg|g)\b/gi, '')
      // Remove dosage forms
      .replace(
        /\b(tablet|capsule|gelcap|caplet|syrup|suspension|liquid|injection|cream|ointment|gel|patch|drops|inhaler|spray|suppository|solution|lotion|powder|mouthwash)\b/gi,
        '',
      )
      // Clean up extra whitespace
      .replace(/\s+/g, ' ')
      .trim()
  );
}

export async function getDrugInfoFromOpenFDA(
  drugName: string,
  hint: OpenFDAIntentHint = 'general',
): Promise<ExternalInfo> {
  const cleanedName = cleanDrugNameForSearch(drugName);
  console.log(
    `[OpenFDA] getDrugInfoFromOpenFDA called with "${drugName}", cleaned to "${cleanedName}", hint: ${hint}`,
  );

  try {
    const results = await searchOpenFDA(cleanedName);

    if (results.length === 0) {
      console.log(
        `[OpenFDA] No info found for "${drugName}" (searched as "${cleanedName}")`,
      );
      return {};
    }

    const info: ExternalInfo = {};

    // Extract information based on intent hint
    if (hint === 'dosage' || hint === 'general') {
      info.dosage = extractDosageInfo(results);
    }

    if (hint === 'usage' || hint === 'general') {
      info.indications = extractUsageInfo(results);
    }

    if (hint === 'sideEffects' || hint === 'general') {
      info.sideEffects = extractSideEffectsInfo(results);
    }

    // Always extract warnings and brand name
    info.warnings = extractWarningsInfo(results);
    info.brandUS = extractBrandName(results);

    // Add OpenFDA citation
    info.citations = [
      `web: OpenFDA search -> https://open.fda.gov/apis/drug/label/`,
    ];

    console.log(`[OpenFDA] Extracted info for "${drugName}":`, {
      hasIndications: !!info.indications,
      hasDosage: !!info.dosage,
      hasWarnings: !!info.warnings,
      hasSideEffects: !!info.sideEffects,
      brandUS: info.brandUS,
    });

    return info;
  } catch (error) {
    console.error(
      `[OpenFDA] Error fetching drug info for "${drugName}":`,
      error,
    );
    return {};
  }
}
