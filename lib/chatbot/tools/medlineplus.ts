import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import type { MedlinePlusResponse } from '../types';

interface DrugEntry {
  title?: string;
  content?: { content?: string };
  summary?: { content?: string };
}

/**
 * OTC (Over-the-Counter) category names - drugs that don't require prescription
 */
const OTC_CATEGORIES = [
  'pain relief',
  'analgesics',
  'fever reducers',
  'paracetamol',
  'cough and cold',
  'allergy relief',
  'antihistamine',
  'antacids',
  'vitamins',
  'supplements',
  'first aid',
  'topical',
  'antiseptic',
  'digestive aids',
  'eye drops',
  'nasal spray',
  'throat lozenges',
  'cough drops',
  'oral rehydration',
  'antidiarrheal',
  'laxatives',
  'wound care',
  'muscle pain',
  'headache relief',
];

/**
 * Prescription category names - drugs that require prescription
 */
const PRESCRIPTION_CATEGORIES = [
  'antibiotics',
  'hypertension',
  'diabetes',
  'heart medication',
  'psychiatric',
  'hormones',
  'controlled substance',
  'cancer treatment',
  'blood pressure',
  'cholesterol',
  'antidepressant',
  'steroid',
  'immunosuppressant',
  'chemotherapy',
  'insulin',
  'thyroid',
  'epilepsy',
  'anticoagulant',
];

/**
 * Common prescription drugs (fallback when no category available)
 */
const PRESCRIPTION_DRUGS = [
  'amoxicillin',
  'azithromycin',
  'ciprofloxacin',
  'metronidazole',
  'doxycycline',
  'erythromycin',
  'clarithromycin',
  'levofloxacin',
  'cephalexin',
  'clindamycin',
  'tetracycline',
  'penicillin',
  'ampicillin',
  'metformin',
  'losartan',
  'amlodipine',
  'atorvastatin',
  'lisinopril',
  'simvastatin',
  'omeprazole',
  'esomeprazole',
  'pantoprazole',
  'lansoprazole',
  'warfarin',
  'digoxin',
];

/**
 * Check if a drug is prescription-only based on category or drug name
 */
function isPrescriptionDrug(drugName: string, categoryName?: string): boolean {
  // First check by category (most reliable)
  if (categoryName) {
    const categoryLower = categoryName.toLowerCase();

    // Check if it's explicitly an OTC category
    if (OTC_CATEGORIES.some((otc) => categoryLower.includes(otc))) {
      return false; // It's OTC
    }

    // Check if it's explicitly a prescription category
    if (PRESCRIPTION_CATEGORIES.some((rx) => categoryLower.includes(rx))) {
      return true; // It's prescription
    }
  }

  // Fallback to drug name patterns
  const normalizedName = drugName.toLowerCase().replace(/\s+\d+mg.*/, '');
  const isKnownPrescription = PRESCRIPTION_DRUGS.some(
    (rxDrug) =>
      normalizedName.includes(rxDrug) || rxDrug.includes(normalizedName),
  );

  if (isKnownPrescription) {
    return true;
  }

  // Conservative default: if we don't know the category and it's not a known OTC drug,
  // treat as prescription for safety
  const knownOTC = [
    'paracetamol',
    'biogesic',
    'tempra',
    'calpol',
    'ibuprofen',
    'advil',
    'midol',
    'medicol',
    'cetirizine',
    'zyrtec',
    'allerkid',
    'loratadine',
    'claritin',
    'vitamin',
    'centrum',
    'enervon',
    'berocca',
  ];

  const isKnownOTC = knownOTC.some((otc) => normalizedName.includes(otc));
  return !isKnownOTC; // If not known OTC, assume prescription
}

/**
 * Provide fallback response when MedlinePlus API fails
 */
function provideFallbackInfo(): MedlinePlusResponse {
  // When MedlinePlus API fails, we should not provide hardcoded clinical information
  // Clinical data must come from legitimate medical sources only
  return {
    found: false,
    source: 'MedlinePlus-Unavailable',
  };
}

/**
 * Parse XML response from MedlinePlus search API
 */
async function parseXMLResponse(
  xmlData: string,
  sections: string[],
  drugName: string,
): Promise<MedlinePlusResponse | null> {
  try {
    // Basic XML parsing for MedlinePlus health topics
    // Look for relevant drug information in the XML structure

    // Check if we have any relevant health topic results
    const hasResults =
      xmlData.includes('<document>') || xmlData.includes('<result>');
    if (!hasResults) {
      console.log('[MedlinePlus] No results found in XML');
      return null;
    }

    // Extract basic information from XML
    const titleMatch = xmlData.match(/<title[^>]*>([^<]+)<\/title>/i);
    const contentMatch =
      xmlData.match(/<content[^>]*>([^<]+)<\/content>/i) ||
      xmlData.match(/<summary[^>]*>([^<]+)<\/summary>/i);

    if (titleMatch || contentMatch) {
      const title = titleMatch ? titleMatch[1] : '';
      const content = contentMatch ? contentMatch[1] : '';

      // Check if this is actually about the drug we're looking for
      const relevantTerms = [
        drugName.toLowerCase(),
        'medication',
        'drug',
        'medicine',
      ];
      const combinedText = (title + ' ' + content).toLowerCase();
      const isRelevant = relevantTerms.some((term) =>
        combinedText.includes(term),
      );

      if (isRelevant) {
        console.log('[MedlinePlus] Found relevant XML content for:', drugName);
        return {
          found: true,
          source: 'MedlinePlus',
          dosage: sections.includes('dosage')
            ? extractDosageFromText(combinedText)
            : undefined,
          usage: sections.includes('usage')
            ? extractUsageFromText(combinedText)
            : undefined,
          sideEffects: sections.includes('side-effects')
            ? extractSideEffectsFromText(combinedText)
            : undefined,
        };
      }
    }

    console.log('[MedlinePlus] XML found but not relevant to:', drugName);
    return null;
  } catch (error) {
    console.error('[MedlinePlus] XML parsing error:', error);
    return null;
  }
}

/**
 * Extract dosage information from text content
 */
function extractDosageFromText(text: string): string | undefined {
  const dosagePatterns = [
    /(?:dose|dosage|take)[\s:]+([^.!?]+(?:mg|ml|tablet|capsule)[^.!?]*)/i,
    /(?:usual|recommended|typical)\s+(?:dose|dosage)[\s:]+([^.!?]+)/i,
    /(\d+\s*(?:mg|ml|tablet|capsule)[\s\w]*(?:every|per|daily|twice)[^.!?]*)/i,
  ];

  for (const pattern of dosagePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return undefined;
}

/**
 * Extract usage information from text content
 */
function extractUsageFromText(text: string): string | undefined {
  const usagePatterns = [
    /(?:used|prescribed|indicated)\s+(?:to|for)[\s:]+([^.!?]+)/i,
    /(?:treats|treatment|therapy)\s+(?:for|of)[\s:]+([^.!?]+)/i,
    /(?:helps|relief|reduce)[\s:]+([^.!?]+)/i,
  ];

  for (const pattern of usagePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return undefined;
}

/**
 * Extract side effects information from text content
 */
function extractSideEffectsFromText(text: string): string | undefined {
  const sideEffectsPatterns = [
    /(?:side effects?|adverse|reactions?)[\s:]+([^.!?]+)/i,
    /(?:may cause|can cause|might cause)[\s:]+([^.!?]+)/i,
    /(?:common|possible)\s+(?:side effects?|reactions?)[\s:]+([^.!?]+)/i,
  ];

  for (const pattern of sideEffectsPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return undefined;
}

const MedlinePlusSearchSchema = z.object({
  rxCui: z.string().optional().describe('RxCUI from RxNav normalization'),
  drugName: z.string().describe('Drug name to search when RxCUI not available'),
  sections: z
    .array(z.enum(['dosage', 'usage', 'side-effects', 'warnings']))
    .default(['dosage', 'usage', 'side-effects'])
    .describe('Information sections to retrieve'),
  categoryName: z
    .string()
    .optional()
    .describe('Product category for OTC/prescription classification'),
});

/**
 * MedlinePlus Tool for Clinical Drug Information
 *
 * This tool fetches clinical information about medications from MedlinePlus API.
 * It provides dosage information, usage instructions, side effects, and warnings
 * for both prescription and OTC medications.
 *
 * Features:
 * - Multiple information sections (dosage, usage, side effects, warnings)
 * - RxCUI-based lookup for standardized results
 * - Fallback to drug name search
 * - Structured clinical data extraction
 * - OTC vs Prescription classification
 */
export const medlineplusTool = new DynamicStructuredTool({
  name: 'medlineplus_drug_info',
  description: `Get clinical information about medications including dosage, usage, side effects, and warnings from MedlinePlus. Use AFTER getting RxCUI from rxnav_normalize tool for best results.`,
  schema: MedlinePlusSearchSchema,
  func: async ({ rxCui, drugName, sections, categoryName }) => {
    try {
      console.log(
        `[MedlinePlusTool] Getting info for "${drugName}" (RxCUI: ${rxCui}, Category: ${categoryName})`,
      );

      let clinicalInfo: Partial<MedlinePlusResponse> = {
        found: false,
        source: 'MedlinePlus',
      };

      // Strategy 1: Use RxCUI if available (most reliable)
      if (rxCui) {
        clinicalInfo = await fetchByRxCui(rxCui, sections);
      }

      // Strategy 2: Fallback to drug name search if RxCUI failed or not available
      if (!clinicalInfo.found && drugName) {
        clinicalInfo = await fetchByDrugName(drugName, sections);
      }

      // Strategy 3: Try FDA drug label API for better clinical data
      if (!clinicalInfo.found && (rxCui || drugName)) {
        clinicalInfo = await fetchFromFDA(
          rxCui,
          drugName,
          sections,
          categoryName,
        );
      }

      // Strategy 4: Try generic name variants
      if (!clinicalInfo.found && drugName) {
        clinicalInfo = await tryGenericVariants(drugName, sections);
      }

      const response = {
        ...clinicalInfo,
        searchQuery: drugName,
        rxCui: rxCui || undefined,
        sectionsRequested: sections,
        timestamp: new Date().toISOString(),
      };

      console.log(
        `[MedlinePlusTool] Result: ${
          clinicalInfo.found ? 'Found clinical info' : 'No clinical info found'
        }`,
      );
      return JSON.stringify(response, null, 2);
    } catch (error) {
      console.error('[MedlinePlusTool] Error:', error);

      return JSON.stringify({
        found: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        source: 'MedlinePlus',
        searchQuery: drugName,
        rxCui: rxCui || undefined,
      });
    }
  },
});

/**
 * Fetch drug information using RxCUI
 */
async function fetchByRxCui(
  rxCui: string,
  sections: string[],
): Promise<MedlinePlusResponse> {
  try {
    // MedlinePlus Connect API endpoint
    const baseUrl = 'https://connect.medlineplus.gov/service';
    const url = `${baseUrl}?mainSearchCriteria.v.cs=2.16.840.1.113883.6.88&mainSearchCriteria.v.c=${rxCui}&knowledgeResponseType=application/json`;

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'BOTica-Pharmacy-Assistant/1.0',
      },
      signal: AbortSignal.timeout(15000), // 15s timeout
    });

    if (!response.ok) {
      console.warn(
        `[MedlinePlus] RxCUI lookup failed: HTTP ${response.status}`,
      );
      return { found: false, source: 'MedlinePlus' };
    }

    const data = await response.json();
    return parseMedlinePlusResponse(data, sections);
  } catch (error) {
    console.warn('[MedlinePlus] RxCUI fetch error:', error);
    return { found: false, source: 'MedlinePlus' };
  }
}

/**
 * Fetch drug information from FDA Drug Label API
 */
async function fetchFromFDA(
  rxCui: string | undefined,
  drugName: string,
  sections: string[],
  categoryName?: string,
): Promise<MedlinePlusResponse> {
  try {
    // OpenFDA Drug Label API
    const baseUrl = 'https://api.fda.gov/drug/label.json';

    // Try searching by RxCUI first, then by drug name
    let searchTerm = drugName;
    if (rxCui) {
      // FDA API uses generic name, so we use the drug name from RxNav
      searchTerm = drugName;
    }

    const params = new URLSearchParams({
      search: `openfda.generic_name:"${searchTerm}" OR openfda.brand_name:"${searchTerm}"`,
      limit: '1',
    });

    console.log(`[MedlinePlus] Trying FDA API for: "${searchTerm}"`);

    const response = await fetch(`${baseUrl}?${params}`, {
      headers: {
        'User-Agent': 'BOTica-Pharmacy-Assistant/1.0',
      },
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (!response.ok) {
      console.log(`[MedlinePlus] FDA API failed: HTTP ${response.status}`);
      return { found: false, source: 'MedlinePlus' };
    }

    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const drugLabel = data.results[0];
      console.log('[MedlinePlus] Found FDA drug label data');

      return {
        found: true,
        source: 'FDA Drug Labels',
        dosage: sections.includes('dosage')
          ? extractFDADosage(drugLabel, drugName, categoryName)
          : undefined,
        usage: sections.includes('usage')
          ? extractFDAUsage(drugLabel, drugName, categoryName)
          : undefined,
        sideEffects: sections.includes('side-effects')
          ? extractFDASideEffects(drugLabel, drugName, categoryName)
          : undefined,
      };
    }

    console.log('[MedlinePlus] No results found in FDA API');

    // Fallback: If FDA API fails but we know it's a prescription drug, still block dosage
    if (
      sections.includes('dosage') &&
      drugName &&
      isPrescriptionDrug(drugName, categoryName)
    ) {
      return {
        found: true,
        source: 'MedlinePlus Drug Classification',
        dosage:
          'This is a prescription medication. Consult your doctor for proper dosing instructions.',
        usage: undefined,
        sideEffects: undefined,
      };
    }

    return { found: false, source: 'MedlinePlus' };
  } catch (error) {
    console.warn('[MedlinePlus] FDA API error:', error);
    return { found: false, source: 'MedlinePlus' };
  }
}

/**
 * Extract dosage information from FDA drug label
 */
function extractFDADosage(
  drugLabel: Record<string, unknown>,
  drugName?: string,
  categoryName?: string,
): string | undefined {
  // Check if this is a prescription drug - don't provide dosing for Rx drugs
  if (drugName && isPrescriptionDrug(drugName, categoryName)) {
    return 'This is a prescription medication. Consult your doctor for proper dosing instructions.';
  }

  // FDA labels have structured dosage information
  const dosageSections = [
    drugLabel.dosage_and_administration,
    drugLabel.dosage_and_administration_table,
    drugLabel.pediatric_use,
    drugLabel.geriatric_use,
  ].filter(Boolean);

  for (const section of dosageSections) {
    if (Array.isArray(section) && section.length > 0) {
      // Take first meaningful dosage info
      const dosageText = section[0];
      if (dosageText && dosageText.length > 10) {
        return dosageText; // Return full text without truncation
      }
    }
  }
  return undefined;
}

/**
 * Extract usage information from FDA drug label
 */
function extractFDAUsage(
  drugLabel: Record<string, unknown>,
  drugName?: string,
  categoryName?: string,
): string | undefined {
  // Check if this is a prescription drug - don't provide detailed usage for Rx drugs
  if (drugName && isPrescriptionDrug(drugName, categoryName)) {
    return 'This is a prescription medication. Consult your doctor for proper usage instructions.';
  }

  // FDA labels have indication and usage information
  const usageSections = [
    drugLabel.indications_and_usage,
    drugLabel.purpose,
    drugLabel.when_using,
  ].filter(Boolean);

  for (const section of usageSections) {
    if (Array.isArray(section) && section.length > 0) {
      const usageText = section[0];
      if (usageText && usageText.length > 10) {
        return usageText; // Return full text without truncation
      }
    }
  }
  return undefined;
}

/**
 * Extract side effects from FDA drug label
 */
function extractFDASideEffects(
  drugLabel: Record<string, unknown>,
  drugName?: string,
  categoryName?: string,
): string | undefined {
  // Check if this is a prescription drug - don't provide detailed side effects for Rx drugs
  if (drugName && isPrescriptionDrug(drugName, categoryName)) {
    return 'This is a prescription medication. Consult your doctor for side effects and safety information.';
  }

  // FDA labels have adverse reactions and warnings
  const sideEffectsSections = [
    drugLabel.adverse_reactions,
    drugLabel.warnings,
    drugLabel.warnings_and_cautions,
    drugLabel.when_using,
  ].filter(Boolean);

  for (const section of sideEffectsSections) {
    if (Array.isArray(section) && section.length > 0) {
      const sideEffectsText = section[0];
      if (sideEffectsText && sideEffectsText.length > 10) {
        return sideEffectsText; // Return full text without truncation
      }
    }
  }
  return undefined;
}

/**
 * Fetch drug information using drug name
 */
async function fetchByDrugName(
  drugName: string,
  sections: string[],
): Promise<MedlinePlusResponse> {
  try {
    // MedlinePlus Drug Information API
    const baseUrl = 'https://wsearch.nlm.nih.gov/ws/query';
    const params = new URLSearchParams({
      db: 'healthTopics',
      term: `${drugName} medication`,
      retmax: '3',
      rettype: 'brief',
      sort: 'relevance',
    });

    const response = await fetch(`${baseUrl}?${params}`, {
      headers: {
        Accept: 'application/json, application/xml, text/xml',
        'User-Agent': 'BOTica-Pharmacy-Assistant/1.0',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.warn(`[MedlinePlus] Name search failed: HTTP ${response.status}`);
      return { found: false, source: 'MedlinePlus' };
    }

    // Handle both JSON and XML responses
    const contentType = response.headers.get('content-type') || '';
    let data: Record<string, unknown>;

    if (contentType.includes('application/json')) {
      data = (await response.json()) as Record<string, unknown>;
    } else if (contentType.includes('xml')) {
      // Let's see what the XML actually contains
      const xmlData = await response.text();
      console.log('[MedlinePlus] Received XML response');
      console.log('[MedlinePlus] XML preview:', xmlData.substring(0, 500));
      console.log('[MedlinePlus] XML length:', xmlData.length);

      // Try to parse basic XML for drug information
      const parsedData = await parseXMLResponse(xmlData, sections, drugName);
      if (parsedData && parsedData.found) {
        return parsedData;
      }

      // If XML parsing fails, use fallback
      console.log('[MedlinePlus] XML parsing failed, using fallback');
      return provideFallbackInfo();
    } else {
      const textData = await response.text();
      console.log('[MedlinePlus] Unknown content type:', contentType);
      console.log(
        '[MedlinePlus] Response preview:',
        textData.substring(0, 200),
      );
      return provideFallbackInfo();
    }

    return parseDrugSearchResponse(data, sections, drugName);
  } catch (error) {
    console.warn('[MedlinePlus] Name fetch error:', error);
    return { found: false, source: 'MedlinePlus' };
  }
}

/**
 * Try generic name variants (remove brand info, common suffixes)
 */
async function tryGenericVariants(
  drugName: string,
  sections: string[],
): Promise<MedlinePlusResponse> {
  const variants = generateDrugNameVariants(drugName);

  for (const variant of variants) {
    try {
      const result = await fetchByDrugName(variant, sections);
      if (result.found) {
        return result;
      }
    } catch (error) {
      console.warn(`[MedlinePlus] Variant "${variant}" failed:`, error);
    }
  }

  return { found: false, source: 'MedlinePlus' };
}

/**
 * Parse MedlinePlus Connect API response
 */
function parseMedlinePlusResponse(
  data: unknown,
  sections: string[],
): MedlinePlusResponse {
  try {
    if (!data || typeof data !== 'object') {
      return { found: false, source: 'MedlinePlus' };
    }

    const response = data as Record<string, unknown>;
    const summary = response.feed as Record<string, unknown>;

    if (!summary || !summary.entry) {
      return { found: false, source: 'MedlinePlus' };
    }

    const entries = Array.isArray(summary.entry)
      ? summary.entry
      : [summary.entry];
    const drugEntry = entries.find(
      (entry: DrugEntry) => entry.title && entry.content,
    );

    if (!drugEntry) {
      return { found: false, source: 'MedlinePlus' };
    }

    const content = String(
      drugEntry.content?.content || drugEntry.summary?.content || '',
    );

    return {
      dosage: sections.includes('dosage')
        ? extractDosageInfo(content)
        : undefined,
      usage: sections.includes('usage') ? extractUsageInfo(content) : undefined,
      sideEffects: sections.includes('side-effects')
        ? extractSideEffects(content)
        : undefined,
      contraindications: sections.includes('warnings')
        ? extractWarnings(content)
        : undefined,
      source: 'MedlinePlus',
      found: true,
    };
  } catch (error) {
    console.error('[MedlinePlus] Parse error:', error);
    return { found: false, source: 'MedlinePlus' };
  }
}

/**
 * Parse drug search response
 */
function parseDrugSearchResponse(
  data: unknown,
  sections: string[],
  drugName: string,
): MedlinePlusResponse {
  try {
    if (!data || typeof data !== 'object') {
      return { found: false, source: 'MedlinePlus' };
    }

    const response = data as Record<string, unknown>;
    const results = response.list as Record<string, unknown>[];

    if (!results || !Array.isArray(results) || results.length === 0) {
      return { found: false, source: 'MedlinePlus' };
    }

    // Find most relevant result
    const relevantResult = results.find(
      (result) =>
        result.title &&
        typeof result.title === 'string' &&
        result.title.toLowerCase().includes(drugName.toLowerCase()),
    );

    const result = relevantResult || results[0];
    const content = String(result.content || result.snippet || '');

    return {
      dosage: sections.includes('dosage')
        ? extractDosageInfo(content)
        : undefined,
      usage: sections.includes('usage') ? extractUsageInfo(content) : undefined,
      sideEffects: sections.includes('side-effects')
        ? extractSideEffects(content)
        : undefined,
      contraindications: sections.includes('warnings')
        ? extractWarnings(content)
        : undefined,
      source: 'MedlinePlus',
      found: !!content,
    };
  } catch (error) {
    console.error('[MedlinePlus] Search parse error:', error);
    return { found: false, source: 'MedlinePlus' };
  }
}

/**
 * Generate drug name variants for better matching
 */
function generateDrugNameVariants(drugName: string): string[] {
  const variants: string[] = [];
  const name = drugName.toLowerCase().trim();

  // Remove common brand indicators
  variants.push(
    name
      .replace(
        /\b(tablet|capsule|mg|ml|g|cream|ointment|syrup|suspension)\b/gi,
        '',
      )
      .trim(),
  );

  // Remove dosage information
  variants.push(name.replace(/\d+\s*(mg|ml|g|mcg|%)/gi, '').trim());

  // Remove parenthetical information
  variants.push(name.replace(/\([^)]*\)/g, '').trim());

  // Get first word (often the generic name)
  const firstWord = name.split(/\s+/)[0];
  if (firstWord.length > 3) {
    variants.push(firstWord);
  }

  // Remove duplicates and empty strings
  return [...new Set(variants)].filter((v) => v.length > 2);
}

/**
 * Extract dosage information from content
 */
function extractDosageInfo(content: string): string {
  const dosagePatterns = [
    /(?:dosage|dose|recommended dose|typical dose)[:\s]*([^.]*\.)/gi,
    /(?:take|administer)[:\s]*([^.]*\.)/gi,
    /(?:\d+\s*(?:mg|ml|g|mcg|%)[^.]*\.)/gi,
  ];

  for (const pattern of dosagePatterns) {
    const match = content.match(pattern);
    if (match) {
      return match.join(' ').trim();
    }
  }

  return 'Consult healthcare provider for proper dosage information.';
}

/**
 * Extract usage information from content
 */
function extractUsageInfo(content: string): string {
  const usagePatterns = [
    /(?:used for|treats|indicated for|prescribed for)[:\s]*([^.]*\.)/gi,
    /(?:this medication|this drug)[^.]*(?:is used|treats|helps)[^.]*\./gi,
  ];

  for (const pattern of usagePatterns) {
    const match = content.match(pattern);
    if (match) {
      return match.join(' ').trim();
    }
  }

  return 'Consult healthcare provider or product labeling for usage information.';
}

/**
 * Extract side effects from content
 */
function extractSideEffects(content: string): string {
  const sideEffectPatterns = [
    /(?:side effects?|adverse effects?)[:\s]*([^.]*\.)/gi,
    /(?:may cause|can cause|common effects)[:\s]*([^.]*\.)/gi,
  ];

  for (const pattern of sideEffectPatterns) {
    const match = content.match(pattern);
    if (match) {
      return match.join(' ').trim();
    }
  }

  return 'Consult healthcare provider or product information for side effects.';
}

/**
 * Extract warnings and contraindications from content
 */
function extractWarnings(content: string): string {
  const warningPatterns = [
    /(?:warning|caution|contraindication)[:\s]*([^.]*\.)/gi,
    /(?:do not|avoid|should not)[^.]*\./gi,
  ];

  for (const pattern of warningPatterns) {
    const match = content.match(pattern);
    if (match) {
      return match.join(' ').trim();
    }
  }

  return 'Consult healthcare provider for warnings and contraindications.';
}
