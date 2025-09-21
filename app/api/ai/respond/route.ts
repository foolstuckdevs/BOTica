import { NextResponse } from 'next/server';
import { db } from '@/database/drizzle';
import { products, categories } from '@/database/schema';
import { and, desc, sql, eq } from 'drizzle-orm';

// Helper function to classify products into three tiers
function classifyProduct(
  productName: string,
  genericName: string | null,
  dosageForm: string | null,
  categoryName?: string | null,
): 'prescription' | 'otc' | 'non-medical' {
  // Non-medical products first
  const nonMedicalKeywords = [
    'toiletries',
    'cosmetics',
    'personal care',
    'baby products',
    'household',
    'accessories',
    'beauty',
    'skincare',
  ];

  if (categoryName) {
    const categoryLower = categoryName.toLowerCase();
    if (nonMedicalKeywords.some((keyword) => categoryLower.includes(keyword))) {
      return 'non-medical';
    }
  }

  // Check if it has medical dosage form
  const medicalForms = [
    'TABLET',
    'CAPSULE',
    'SYRUP',
    'SUSPENSION',
    'INJECTION',
    'OINTMENT',
    'CREAM',
    'GEL',
    'DROPS',
    'INHALER',
    'SPRAY',
    'PATCH',
    'SUPPOSITORY',
    'SOLUTION',
    'LOTION',
    'POWDER',
    'MOUTHWASH',
  ];

  const hasMedicalForm =
    dosageForm && medicalForms.includes(dosageForm.toUpperCase());

  if (!hasMedicalForm) {
    return 'non-medical';
  }

  // Now classify medical products as OTC or Prescription

  // OTC categories (commonly available without prescription in PH)
  if (categoryName) {
    const categoryLower = categoryName.toLowerCase();
    const otcCategories = [
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
    ];

    if (otcCategories.some((otc) => categoryLower.includes(otc))) {
      return 'otc';
    }

    // Prescription categories (require prescription in PH)
    const prescriptionCategories = [
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
    ];

    if (prescriptionCategories.some((rx) => categoryLower.includes(rx))) {
      return 'prescription';
    }
  }

  // Drug name pattern recognition for common Philippine drugs
  const nameLower = (productName + ' ' + (genericName || '')).toLowerCase();

  // Common OTC drugs in Philippines
  const otcPatterns = [
    /paracetamol|biogesic|tempra|calpol/,
    /ibuprofen|advil|midol|medicol/,
    /cetirizine|zyrtec|allerkid/,
    /loratadine|claritin/,
    /mefenamic|ponstan|dolfenal/,
    /aspirin|bayer/,
    /vitamin|centrum|enervon|berocca|b.?complex|multivitamin/,
    /neozep|bioflu|decolgen|tuseran/,
    /kremil|gaviscon|mylanta|antacid/,
    /betadine|povidone|hydrogen peroxide/,
    /oral rehydration|ors/,
  ];

  // Common prescription drugs
  const prescriptionPatterns = [
    /amoxicillin|augmentin|cephalexin|azithromycin/,
    /amlodipine|losartan|atenolol|metoprolol/,
    /metformin|glimepiride|insulin/,
    /omeprazole|lansoprazole|esomeprazole/,
    /atorvastatin|simvastatin|rosuvastatin/,
    /prednisone|prednisolone|dexamethasone/,
    /sertraline|fluoxetine|escitalopram/,
  ];

  if (otcPatterns.some((pattern) => pattern.test(nameLower))) {
    return 'otc';
  }

  if (prescriptionPatterns.some((pattern) => pattern.test(nameLower))) {
    return 'prescription';
  }

  // Conservative default for unknown medical products
  return 'prescription';
}

// Helper function to detect out-of-scope queries
function checkOutOfScope(text: string): boolean {
  const textLower = text.toLowerCase();

  // Out-of-scope patterns
  const outOfScopePatterns = [
    // General conversation
    /^(hi|hello|hey|good\s+morning|good\s+afternoon|good\s+evening|how\s+are\s+you|what\s+is\s+your\s+name|who\s+are\s+you)[\s\?!]*$/,

    // Gibberish or random text (3+ letter words with no clear meaning)
    /^[a-z]{3,}[\s\?!]*$/,

    // Personal health advice (not pharmacy-related)
    /\b(should\s+i\s+see\s+a\s+doctor|am\s+i\s+sick|diagnose\s+me|what\s+illness\s+do\s+i\s+have|medical\s+advice\s+for\s+me)\b/,

    // Non-pharmacy topics
    /\b(weather|sports|politics|news|cooking|travel|movies|music|games)\b/,

    // Common non-pharmaceutical items
    /\b(water|juice|soda|coffee|tea|food|snacks|candy|chocolate|bread|milk|rice|vegetables|fruits)\b/,

    // General health questions not specific to medications
    /\b(how\s+to\s+lose\s+weight|diet\s+plan|exercise\s+routine|healthy\s+lifestyle|nutrition\s+advice)\b/,

    // Technology/system questions
    /\b(how\s+does\s+this\s+work|technical\s+support|bug\s+report|feature\s+request|system\s+error)\b/,

    // Inappropriate requests
    /\b(prescription\s+without\s+doctor|illegal\s+drugs|controlled\s+substances\s+without\s+prescription)\b/,

    // Very general queries without pharmacy context
    /^(help|what\s+can\s+you\s+do|tell\s+me\s+everything|explain)[\s\?!]*$/,
  ];

  // Pharmacy-related keywords that indicate in-scope
  const pharmacyKeywords = [
    /\b(stock|inventory|price|cost|available|expiry|expire)\b/,
    /\b(dosage|dose|how\s+much|how\s+often|side\s+effects|indication|contraindication)\b/,
    /\b(tablet|capsule|syrup|suspension|injection|cream|ointment|drops)\b/,
    /\b(paracetamol|ibuprofen|amoxicillin|metformin|aspirin|vitamin|medicine|medication|drug)\b/,
    /\b(prescription|otc|over\s+the\s+counter|generic|brand)\b/,
  ];

  // If contains pharmacy keywords, it's likely in scope
  if (pharmacyKeywords.some((pattern) => pattern.test(textLower))) {
    return false;
  }

  // Check against out-of-scope patterns
  return outOfScopePatterns.some((pattern) => pattern.test(textLower));
}

import { z } from 'zod';
import {
  getDrugInfoFromOpenFDA,
  type OpenFDAIntentHint,
} from '@/lib/external/openfda';
import {
  getDrugInfoFromMedlinePlus,
  type MedlinePlusIntentHint,
} from '@/lib/external/medlineplus';
import { mapToUSGenericViaRxNorm } from '@/lib/external/rxnorm';
import { isAIMappingConfigured, mapToUSEquivalentLLM } from '@/lib/ai/mapping';
import { composeResponseLLM, isAIResponseConfigured } from '@/lib/ai/composer';
import { auth } from '@/auth';

export const runtime = 'nodejs';

// Outgoing sources will be human-friendly labels
type Sources = string[];

// Minimal external/web stubs. In a real setup, wire to trusted sources.
type ExternalInfo = {
  indications?: string;
  dosage?: string;
  brandUS?: string;
  warnings?: string;
  citations?: string[];
  sideEffects?: string;
};

type WebInfo = { recentAdvisory?: string };

async function fetchExternal(
  drugName?: string,
  brandPH?: string | undefined | null,
  sourcesAgg?: string[],
  hint: OpenFDAIntentHint = 'general',
  genericName?: string | undefined | null,
): Promise<ExternalInfo> {
  if (!drugName) return {};
  // AI-only mapping; fallback to original term if AI unavailable
  let mapped = drugName;
  let mappingConfidence = 0;
  if (isAIMappingConfigured()) {
    const ai = await mapToUSEquivalentLLM(
      drugName,
      brandPH,
      genericName || undefined,
    );
    if (ai?.mappedName) {
      mapped = ai.mappedName;
      mappingConfidence = ai.confidence ?? 0;
      sourcesAgg?.push(
        `web: OpenFDA search for ${mapped} -> https://open.fda.gov/apis/drug/label/`,
      );
    }
  }
  // If AI mapping was not available or has low confidence, try RxNorm mapping
  if (!mappingConfidence || mappingConfidence < 0.5) {
    const rx = await mapToUSGenericViaRxNorm(mapped);
    if (rx.mappedName) {
      mapped = rx.mappedName;
      mappingConfidence = Math.max(mappingConfidence, rx.confidence);
      // Add RxNorm provenance links (for internal logging/provenance aggregation)
      rx.provenance.forEach((u) => sourcesAgg?.push(`web: RxNorm -> ${u}`));
      sourcesAgg?.push(
        `web: OpenFDA search for ${mapped} -> https://open.fda.gov/apis/drug/label/`,
      );
    }
  }

  // Primary: Try OpenFDA first
  console.log(`[External] Trying OpenFDA for "${mapped}"`);
  let info = await getDrugInfoFromOpenFDA(mapped, hint);

  // Secondary: If OpenFDA doesn't have sufficient info, try MedlinePlus
  if (
    !info.indications &&
    !info.dosage &&
    !info.warnings &&
    !info.sideEffects
  ) {
    console.log(
      `[External] OpenFDA insufficient, trying MedlinePlus for "${mapped}"`,
    );
    const medlinePlusInfo = await getDrugInfoFromMedlinePlus(
      mapped,
      hint as MedlinePlusIntentHint,
    );

    // Merge the information, preferring OpenFDA but filling gaps with MedlinePlus
    info = {
      indications: info.indications || medlinePlusInfo.indications,
      dosage: info.dosage || medlinePlusInfo.dosage,
      warnings: info.warnings || medlinePlusInfo.warnings,
      sideEffects: info.sideEffects || medlinePlusInfo.sideEffects,
      brandUS: info.brandUS || medlinePlusInfo.brandUS,
      citations: [
        ...(info.citations || []),
        ...(medlinePlusInfo.citations || []),
      ],
    };
  }

  // If we failed to get useful external info or mapping confidence is low, add MIMS Philippines as provenance link
  const mimsQuery = encodeURIComponent(drugName);
  if (
    (!info.indications && !info.dosage && !info.warnings) ||
    mappingConfidence < 0.4
  ) {
    // MIMS Philippines only (PH-oriented)
    sourcesAgg?.push(
      `web: MIMS Philippines search -> https://www.mims.com/philippines/search?q=${mimsQuery}`,
    );
  }
  return info;
}

async function fetchWeb(): Promise<WebInfo> {
  // Placeholder for advisories or local updates
  return {};
}

export async function POST(req: Request) {
  try {
    // Get user session for role-based responses (internal users only: Admin or Pharmacist)
    const session = await auth();
    const userRole = session?.user?.role || 'Pharmacist'; // Default to Pharmacist for internal users

    const InputSchema = z.object({
      intent: z
        .enum(['drug_info', 'stock_check', 'dosage', 'alternatives', 'other'])
        .default('other'),
      drugName: z.string().trim().min(1).optional().nullable(),
      text: z.string().optional(),
      needs: z.array(z.string()).optional().default([]),
      sources: z
        .array(z.enum(['internal_db', 'external_db', 'web_search']))
        .optional()
        .default([]),
      sessionContext: z
        .object({
          lastDrugName: z.string().nullable().optional(),
          lastIntent: z.string().nullable().optional(),
          recentDrugs: z.array(z.string()).optional().default([]),
          patientContext: z.string().nullable().optional(),
        })
        .optional(),
    });
    const body = InputSchema.parse(await req.json());

    // Handle patient context responses FIRST (when user just says "for adult" etc.)
    if (body.intent === 'other') {
      const hasPatientInfo =
        /\b(adult|child|elderly|baby|infant|teenager|pregnant)\b/i.test(
          body.text || '',
        );

      if (hasPatientInfo && body.sessionContext?.lastDrugName?.trim()) {
        // User is providing patient context for a previous drug inquiry
        console.log(
          '[Patient Context] Processing patient context for previous drug',
        );

        // Update the body to process as a dosage request
        body.intent = 'dosage';
        body.drugName = body.sessionContext.lastDrugName.trim();
      } else {
        // Check if this is an out-of-scope query
        const isOutOfScope = checkOutOfScope(body.text || '');

        // Enhanced session awareness: if no recent drugs and query is greeting/gibberish, use out-of-scope
        const hasRecentDrugs =
          body.sessionContext?.recentDrugs &&
          body.sessionContext.recentDrugs.length > 0;
        const isGreetingOrGibberish =
          /^(hi|hello|hey|good\s+morning|good\s+afternoon|good\s+evening|what's\s+up|sup|yo|test|testing|\?\?\?|\.\.\.|\w{1,3})[\s\?!]*$/i.test(
            (body.text || '').trim(),
          );

        if (isOutOfScope || (!hasRecentDrugs && isGreetingOrGibberish)) {
          console.log(
            '[Out of Scope] Detected non-pharmacy query or greeting without context',
          );
          return NextResponse.json(
            {
              response: `I'm a pharmacy assistant. How can I help with inventory or drug information today?

Sources: BOTica System`,
              sources: ['BOTica System'],
            },
            { status: 200 },
          );
        }
      }
    }
    const textLower = (body.text || '').toLowerCase();

    // Enhanced pattern matching for different query variations
    const sideEffectsOnly =
      /(side\s?effects?|adverse\s?reactions?|undesirable\s?effects?|adverse\s?events?|what\s+(are\s+the\s+)?side\s?effects?|side\s?effects?\s+of|any\s+side\s?effects?|risks?|dangerous)/.test(
        textLower,
      );

    // Detect usage/indications-only queries with comprehensive patterns
    const usageOnly =
      /(usage|indications?|what\s+is\s+.*used\s+for|what\s+is\s+this\s+for|what\s+is\s+it\s+for|what\s+does\s+.*do|what\s+is\s+the\s+use\s+of|use\s+of|used\s+for|.*\sused\sfor\s*\??\s*$)/.test(
        textLower,
      );

    // Detect dosage-only queries with comprehensive patterns
    const dosageOnlyQuery =
      /(dosage|dose|how\s+much|how\s+many|dosing|what\s+is\s+the\s+dose|what\s+dose|recommended\s+dose|daily\s+dose|how\s+to\s+take|how\s+should\s+i\s+take|take\s+how\s+much|dosage\s+of|dose\s+of)/.test(
        textLower,
      );

    // Detect alternatives queries
    const alternativesOnly =
      /\b(alternative|alternatives|substitute|substitutes|replacement|replacements|similar)\b/.test(
        textLower,
      );

    // AUTO-DETECT INTENT: When user asks specific questions but intent is 'other'
    if (body.intent === 'other' && body.drugName) {
      if (alternativesOnly) {
        console.log(
          '[Auto-Intent] Detected alternatives query, setting intent to alternatives',
        );
        body.intent = 'alternatives';
      } else if (dosageOnlyQuery) {
        console.log(
          '[Auto-Intent] Detected dosage query, setting intent to dosage',
        );
        body.intent = 'dosage';
      } else if (usageOnly) {
        console.log(
          '[Auto-Intent] Detected usage query, setting intent to drug_info with usage focus',
        );
        body.intent = 'drug_info';
      } else if (sideEffectsOnly) {
        console.log(
          '[Auto-Intent] Detected side effects query, setting intent to drug_info with side effects focus',
        );
        body.intent = 'drug_info';
      }
    }

    // UNIVERSAL SESSION CONTEXT: Handle follow-up queries without drug names
    console.log(
      `[Session Debug] drugName: "${body.drugName}", sessionContext:`,
      body.sessionContext,
    );

    if (!body.drugName && body.sessionContext?.lastDrugName?.trim()) {
      // For queries that would benefit from drug context (usage, side effects, dosage, etc.)
      const needsDrugContext =
        /\b(usage|dosage|side\s?effects?|indications?|what\s+is\s+it|for\s+it|about\s+it)\b/.test(
          textLower,
        );

      // Also detect dosage-specific follow-up queries like "500mg tablet", "250mg capsule", etc.
      const isDosageFollowUp =
        /\b\d+\s?(mg|ml|mcg|μg|g|gram|milligram|microgram|milliliter)\s*(tablet|capsule|syrup|suspension|liquid|injection|cream|ointment|gel|patch|drops|inhaler|spray|suppository|solution|lotion|powder|mouthwash)?\b/i.test(
          textLower,
        );

      console.log(
        `[Session Debug] needsDrugContext: ${needsDrugContext}, isDosageFollowUp: ${isDosageFollowUp}, lastDrugName: "${body.sessionContext.lastDrugName}"`,
      );

      if (needsDrugContext || isDosageFollowUp) {
        console.log(
          `[Session Context] Using last drug: ${body.sessionContext.lastDrugName}`,
        );
        body.drugName = body.sessionContext.lastDrugName.trim();

        // Auto-adjust intent for specific query types
        if (usageOnly) {
          body.intent = 'drug_info';
        } else if (sideEffectsOnly) {
          body.intent = 'drug_info';
        } else if (/\b(dosage|dose)\b/.test(textLower) || isDosageFollowUp) {
          body.intent = 'dosage';
        }

        console.log(
          `[Session Context] Updated drugName to: "${body.drugName}", intent to: "${body.intent}"`,
        );
      }
    }

    // FOLLOW-UP QUERY DETECTION: Handle "how about [drug]?" or "what about [drug]?" queries
    if (
      body.intent === 'other' &&
      body.drugName &&
      body.sessionContext?.lastIntent &&
      body.sessionContext.recentDrugs &&
      body.sessionContext.recentDrugs.length > 0
    ) {
      // Check if this looks like a follow-up query asking for the same information about a different drug
      const followUpPatterns = [
        /\b(how|what)\s+about\b/i,
        /\b(and|also)\s+\w+\?*$/i,
        /\b(what\s+about|how\s+about)\b/i,
      ];

      const isFollowUpQuery = followUpPatterns.some((pattern) =>
        pattern.test(body.text || ''),
      );

      if (isFollowUpQuery) {
        console.log(
          `[Follow-up Query] Detected follow-up question, inheriting intent "${body.sessionContext.lastIntent}"`,
        );

        // Safely cast the intent to the expected type
        const validIntents = [
          'drug_info',
          'stock_check',
          'dosage',
          'alternatives',
          'other',
        ];
        if (validIntents.includes(body.sessionContext.lastIntent)) {
          body.intent = body.sessionContext.lastIntent as
            | 'drug_info'
            | 'stock_check'
            | 'dosage'
            | 'alternatives'
            | 'other';
        }

        console.log(
          `[Follow-up Query] Updated intent from "other" to "${body.intent}" for drug "${body.drugName}"`,
        );
      }
    }

    // AUTO-DETECT DOSAGE INTENT: When user provides drug name + strength + form
    if (
      (body.intent === 'other' || body.intent === 'drug_info') &&
      body.drugName
    ) {
      const queryText = (body.text || '') + ' ' + (body.drugName || '');
      const hasStrengthAndForm =
        /\b\d+\s?(mg|ml|mcg|μg|g|gram|milligram|microgram|milliliter)\b/i.test(
          queryText,
        ) &&
        /\b(tablet|capsule|gelcap|caplet|syrup|suspension|liquid|injection|cream|ointment|gel|patch|drops|inhaler|spray|suppository|solution|lotion|powder|mouthwash)\b/i.test(
          queryText,
        );

      // Enhanced context-aware intent detection
      const isFollowUpToDosageQuery =
        body.sessionContext?.lastIntent === 'dosage' ||
        (body.sessionContext?.recentDrugs &&
          body.sessionContext.recentDrugs.length > 0);

      if (hasStrengthAndForm && !usageOnly && !sideEffectsOnly) {
        // If this looks like a complete drug specification following a dosage-related query, treat as dosage
        if (isFollowUpToDosageQuery || body.intent === 'drug_info') {
          console.log(
            '[Auto-Intent] Detected complete drug specification after dosage context, assuming dosage query',
          );
          body.intent = 'dosage';
        } else {
          console.log(
            '[Auto-Intent] Detected drug name with strength and form, assuming dosage query',
          );
          body.intent = 'dosage';
        }
      }
    }

    // MEDICAL SAFETY: Check if dosage question lacks dosage form and strength specification
    if (body.intent === 'dosage') {
      // If no drug name but we have session context, use it
      if (!body.drugName && body.sessionContext?.lastDrugName?.trim()) {
        console.log(
          `[Dosage Session Context] Using lastDrugName: "${body.sessionContext.lastDrugName}"`,
        );
        body.drugName = body.sessionContext.lastDrugName.trim();
      }

      // If still no drug name, can't proceed with dosage query
      if (!body.drugName?.trim()) {
        console.log(
          `[Dosage Error] No drug name available - drugName: "${body.drugName}", sessionContext:`,
          body.sessionContext,
        );
        return NextResponse.json(
          {
            response: `I need to know which medication you're asking about for dosage information. Could you please specify the drug name?

Sources: BOTica System`,
            sources: ['BOTica System'],
          },
          { status: 200 },
        );
      }

      // PRESCRIPTION COMPLIANCE: Block dosage requests for prescription drugs (FIRST PRIORITY - before any safety checks)
      const productType = classifyProduct(
        body.drugName,
        null, // no generic name available
        null, // no dosage form from DB
        null, // no category from DB
      );

      if (productType === 'prescription') {
        console.log(
          '[Prescription Product] Blocking dosage request - compliance mode (FIRST PRIORITY)',
        );

        const drugName = body.drugName || 'this medication';

        return NextResponse.json(
          {
            response: `${drugName} is a prescription-only medication. For your safety, I cannot provide dosage information without a valid prescription from a physician.

Prescription-only medications require professional medical supervision and should only be used as directed by a licensed healthcare provider.

Please consult your physician or pharmacist for proper guidance.

Sources: BOTica Clinical Database, FDA Guidelines`,
            sources: ['BOTica Clinical Database', 'FDA Guidelines'],
          },
          { status: 200 },
        );
      }

      // Enhanced form detection using DOSAGE_FORM_ENUM values
      const queryText = (body.text || '') + ' ' + (body.drugName || '');
      const hasSpecificForm =
        /\b(tablet|capsule|gelcap|caplet|syrup|suspension|liquid|injection|cream|ointment|gel|patch|drops|inhaler|spray|suppository|solution|lotion|powder|mouthwash)\b/i.test(
          queryText,
        );

      // Enhanced strength detection (mg, ml, mcg, g)
      const hasSpecificStrength =
        /\b\d+\s?(mg|ml|mcg|μg|g|gram|milligram|microgram|milliliter)\b/i.test(
          queryText,
        );

      // Check if dosage form was specified in recent session context
      const hasFormInContext = !!(
        body.sessionContext?.lastDrugName?.trim() &&
        (body.sessionContext.lastDrugName.toLowerCase().includes('tablet') ||
          body.sessionContext.lastDrugName.toLowerCase().includes('capsule') ||
          body.sessionContext.lastDrugName.toLowerCase().includes('syrup') ||
          body.sessionContext.lastDrugName
            .toLowerCase()
            .includes('suspension') ||
          body.sessionContext.lastDrugName.toLowerCase().includes('injection'))
      );

      // Check if strength was specified in recent session context
      const hasStrengthInContext = !!(
        body.sessionContext?.lastDrugName?.trim() &&
        /\b\d+\s?(mg|ml|mcg|μg|g)\b/i.test(body.sessionContext.lastDrugName)
      );

      console.log(
        `[Form Validation] queryText: "${queryText}", hasSpecificForm: ${hasSpecificForm}, hasFormInContext: ${hasFormInContext}`,
      );
      console.log(
        `[Strength Validation] hasSpecificStrength: ${hasSpecificStrength}, hasStrengthInContext: ${hasStrengthInContext}`,
      );

      // If asking "dosage for adults?" or similar without drug name, check if we can use context
      if (!body.drugName && body.sessionContext?.lastDrugName?.trim()) {
        // Use the drug from context for subsequent dosage questions
        body.drugName = body.sessionContext.lastDrugName.trim();
      }

      // Only require form specification if the user hasn't provided patient context
      // If they've provided patient context (adult/child), they're clearly asking for dosage
      const hasPatientContext = !!body.sessionContext?.patientContext;

      if (!hasSpecificForm && !hasFormInContext && !hasPatientContext) {
        console.log(
          `[Medical Safety] Dosage question without specific dosage form - hasSpecificForm: ${hasSpecificForm}, hasFormInContext: ${hasFormInContext}, hasPatientContext: ${hasPatientContext}`,
        );
        console.log(
          `[Medical Safety] Failed form validation for drugName: "${body.drugName}", sessionContext.lastDrugName: "${body.sessionContext?.lastDrugName}"`,
        );
        return NextResponse.json(
          {
            response: `For safety reasons, I need more specific information to provide accurate dosage guidance. Could you please specify the strength and dosage form of ${body.drugName}? (e.g., 500mg tablet, 250mg capsule, 5ml syrup, etc.)

Sources: BOTica System`,
            sources: ['BOTica System'],
          },
          { status: 200 },
        );
      }

      if (!hasSpecificStrength && !hasStrengthInContext) {
        console.log(
          `[Medical Safety] Dosage question without specific strength - hasSpecificStrength: ${hasSpecificStrength}, hasStrengthInContext: ${hasStrengthInContext}`,
        );
        return NextResponse.json(
          {
            response: `For safety reasons, I need the specific strength to provide accurate dosage guidance. Could you please specify the strength of ${body.drugName}? (e.g., 500mg, 250mg, 5ml, etc.)

Sources: BOTica System`,
            sources: ['BOTica System'],
          },
          { status: 200 },
        );
      }

      // MEDICAL SAFETY: Check if patient context is missing for dosage questions
      if (!body.sessionContext?.patientContext) {
        const hasPatientInfo =
          /\b(adult|child|elderly|baby|infant|teenager|pregnant)\b/i.test(
            body.text || '',
          );
        if (!hasPatientInfo) {
          console.log(
            '[Medical Safety] Dosage question without patient context',
          );
          return NextResponse.json(
            {
              response: `For safety, may I know if this ${body.drugName} dosage is for an adult, elderly patient, or child? This helps me provide appropriate guidance.`,
              sources: ['BOTica Inventory'],
            },
            { status: 200 },
          );
        } else {
          // Extract patient context from text and continue processing
          console.log(
            '[Medical Safety] Patient context found in text, proceeding with dosage query',
          );
        }
      }

      // MEDICAL SAFETY: Check for potential drug interactions if multiple recent drugs
      if (
        body.sessionContext?.recentDrugs &&
        body.sessionContext.recentDrugs.length > 0
      ) {
        const currentDrug = body.drugName.toLowerCase();
        const recentDrugs = body.sessionContext.recentDrugs.map((d) =>
          d.toLowerCase(),
        );

        // Basic interaction warnings for common drug combinations
        const warningCombinations = [
          // Blood thinners + NSAIDs
          {
            drugs: ['warfarin', 'aspirin'],
            warning: 'increased bleeding risk',
          },
          {
            drugs: ['warfarin', 'ibuprofen'],
            warning: 'increased bleeding risk',
          },
          // Paracetamol/Acetaminophen with itself
          {
            drugs: ['paracetamol', 'acetaminophen'],
            warning: 'potential overdose - same active ingredient',
          },
          // ACE inhibitors + Potassium
          {
            drugs: ['lisinopril', 'potassium'],
            warning: 'possible hyperkalemia',
          },
          // Antacids + certain medications
          { drugs: ['omeprazole', 'calcium'], warning: 'reduced absorption' },
        ];

        for (const combo of warningCombinations) {
          const currentDrugMatches = combo.drugs.filter((drug) =>
            currentDrug.includes(drug),
          );
          const recentDrugMatches = combo.drugs.filter((drug) =>
            recentDrugs.some((recent) => recent.includes(drug)),
          );

          // Check if we have different drugs from the combination
          const hasCurrentDrug = currentDrugMatches.length > 0;
          const hasRecentDrug = recentDrugMatches.length > 0;

          // Avoid false positives: don't warn if it's the same drug being discussed
          const isDifferentDrugs =
            currentDrugMatches.some(
              (current) => !recentDrugMatches.includes(current),
            ) ||
            recentDrugMatches.some(
              (recent) => !currentDrugMatches.includes(recent),
            );

          if (hasCurrentDrug && hasRecentDrug && isDifferentDrugs) {
            console.log('[Medical Safety] Potential drug interaction detected');
            return NextResponse.json(
              {
                response: `⚠️ CLINICAL ALERT: Potential drug interaction detected between ${
                  body.drugName
                } and recently discussed medications.\n\nInteraction Level: ${
                  combo.warning
                }\n\nRecommendation: Review patient medication profile and assess clinical significance. Consider alternative therapy, dosage adjustment, or enhanced monitoring as appropriate.\n\nRecent medications in session: ${recentDrugMatches.join(
                  ', ',
                )}\n\nSources: BOTica Clinical Database`,
                sources: ['BOTica Inventory'],
              },
              { status: 200 },
            );
          }
        }
      }
    }

    // Decide sources from PASS 1 or infer a sensible default
    const providedSources = body.sources ?? [];
    const wantInternal =
      providedSources.includes('internal_db') || !!body.drugName;
    // Ensure we fetch external info when needed for clinical queries
    const wantExternal =
      providedSources.includes('external_db') ||
      body.intent === 'dosage' ||
      sideEffectsOnly ||
      usageOnly;
    const wantWeb = providedSources.includes('web_search');

    // Helpers
    const toISODate = (d: unknown): string | undefined => {
      if (!d) return undefined;
      try {
        const dt = typeof d === 'string' ? new Date(d) : (d as Date);
        if (Number.isNaN(dt.getTime())) return undefined;
        return dt.toISOString().split('T')[0];
      } catch {
        return undefined;
      }
    };

    // Converters for unknown types coming from DB
    const toNumber = (v: unknown): number | null => {
      if (v === null || v === undefined) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const toString = (v: unknown): string | null => {
      if (v === null || v === undefined) return null;
      const s = String(v).trim();
      return s.length ? s : null;
    };
    const getField = (
      obj: Record<string, unknown> | undefined,
      key: string,
    ): unknown => (obj ? obj[key] : undefined);

    // INTERNAL DB lookup across name, brand, and generic
    let internal: {
      stock?: number;
      sellingPrice?: number;
      expiry?: string;
      brandPH?: string;
      dosageForm?: string;
      unit?: string;
    } = {};
    let productType: 'prescription' | 'otc' | 'non-medical' | null = null;
    let internalList: Array<{
      id: number;
      name: string;
      brandPH: string | null;
      stock: number | null;
      sellingPrice: number | null;
      expiry: unknown;
      generic: string | null;
      dosageForm: string | null;
      unit: string | null;
    }> = [];
    const alternativesList: Array<{
      id: number;
      name: string;
      brandPH: string | null;
      stock: number | null;
      sellingPrice: number | null;
      expiry: unknown;
      dosageForm: string | null;
      unit: string | null;
    }> = [];
    if (wantInternal && body.drugName) {
      const original = body.drugName.trim();
      const baseTerm = original
        .toLowerCase()
        .replace(/\b\d{1,4}\s?(mg|ml|mcg|g)\b/gi, '')
        .replace(/[^a-z0-9\s\-]/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const selectProducts = async (
        needle: string,
        limit = 8,
      ): Promise<Array<Record<string, unknown>>> => {
        const rows = await db
          .select({
            id: products.id,
            name: products.name,
            brandPH: products.brandName,
            sellingPrice: products.sellingPrice,
            stock: products.quantity,
            expiry: products.expiryDate,
            generic: products.genericName,
            categoryId: products.categoryId,
            categoryName: categories.name,
            dosageForm: products.dosageForm,
            unit: products.unit,
          })
          .from(products)
          .leftJoin(categories, eq(products.categoryId, categories.id))
          .where(
            and(
              sql`${products.deletedAt} IS NULL`,
              sql`${products.quantity} > 0`,
              sql`(${products.expiryDate} IS NULL OR ${products.expiryDate} >= CURRENT_DATE)`,
              sql`(${products.name} ILIKE ${'%' + needle + '%'} OR ${
                products.brandName
              } ILIKE ${'%' + needle + '%'} OR ${products.genericName} ILIKE ${
                '%' + needle + '%'
              })`,
            ),
          )
          .orderBy(desc(products.updatedAt))
          .limit(limit);
        return rows as Array<Record<string, unknown>>;
      };

      // First try the full normalized term, then fallback to tokens
      let hits = await selectProducts(baseTerm || original, 8);
      let hit: Record<string, unknown> | undefined = hits[0];
      if (!hit && baseTerm) {
        const stop = new Set([
          'mg',
          'ml',
          'mcg',
          'g',
          'tablet',
          'capsule',
          'cap',
          'tab',
        ]);
        const tokens = baseTerm
          .split(' ')
          .filter((w) => w.length >= 3 && !stop.has(w));
        tokens.sort((a, b) => b.length - a.length);
        for (const w of tokens) {
          hits = await selectProducts(w, 8);
          hit = hits[0];
          if (hit) break;
        }

        // TYPO TOLERANCE: Try common drug name corrections if still no match
        if (!hit) {
          const typoCorrections: Record<string, string> = {
            aspiring: 'aspirin',
            paracetomol: 'paracetamol',
            ibruprofen: 'ibuprofen',
            amoxycilin: 'amoxicillin',
            metformin: 'metformin', // keep as-is for classification
            amlodipine: 'amlodipine', // keep as-is for classification
          };

          for (const [typo, correct] of Object.entries(typoCorrections)) {
            if (original.toLowerCase().includes(typo)) {
              console.log(
                `[Typo Correction] Correcting "${typo}" to "${correct}"`,
              );
              hits = await selectProducts(correct, 8);
              hit = hits[0];
              if (hit) {
                // Update drugName to use corrected spelling for downstream processing
                body.drugName =
                  body.drugName?.replace(new RegExp(typo, 'gi'), correct) ||
                  correct;
                break;
              }
            }
          }
        }
      }

      if (hit) {
        internal = {
          stock: toNumber(getField(hit, 'stock')) ?? undefined,
          sellingPrice: toNumber(getField(hit, 'sellingPrice')) ?? undefined,
          expiry: toISODate(getField(hit, 'expiry')),
          brandPH: toString(getField(hit, 'brandPH')) ?? undefined,
          dosageForm: toString(getField(hit, 'dosageForm')) ?? undefined,
          unit: toString(getField(hit, 'unit')) ?? undefined,
        };

        // Classify the product using three-tier system
        productType = classifyProduct(
          toString(getField(hit, 'name')) || '',
          toString(getField(hit, 'generic')) ?? null,
          toString(getField(hit, 'dosageForm')) ?? null,
          toString(getField(hit, 'categoryName')) ?? null,
        );

        // Handle different product types
        if (productType === 'non-medical') {
          const productName = toString(getField(hit, 'name')) || 'Product';
          const stock = toNumber(getField(hit, 'stock')) ?? 0;
          const price = toNumber(getField(hit, 'sellingPrice'));

          let inventoryResponse = `${productName} - `;
          if (stock > 0) {
            inventoryResponse += `In stock (${stock} ${
              toString(getField(hit, 'unit'))?.toLowerCase() || 'units'
            })`;
            if (price) {
              inventoryResponse += `, ₱${price.toFixed(2)} each`;
            }
          } else {
            inventoryResponse += 'Currently out of stock';
          }

          // For non-medical products, we don't provide medical advice
          if (body.intent === 'dosage' || body.intent === 'drug_info') {
            inventoryResponse +=
              '. As this is a non-medical product, please refer to the product label for usage instructions.';
          }

          // For non-medical products, only respond to inventory queries
          if (body.intent !== 'stock_check' && body.intent !== 'alternatives') {
            return NextResponse.json(
              {
                response: `${productName} is available in our inventory. For specific product information, please ask about stock availability or pricing.

Sources: BOTica Inventory`,
                sources: ['BOTica Inventory'],
              },
              { status: 200 },
            );
          }

          return NextResponse.json(
            {
              response: inventoryResponse,
              sources: ['BOTica Inventory'],
            },
            { status: 200 },
          );
        }

        // For OTC products, provide basic medical information with safety warnings
        if (productType === 'otc' && body.intent === 'dosage') {
          // Continue to external API for dosage information but add OTC context
          console.log(
            '[OTC Product] Providing OTC dosage information with safety warnings',
          );
        }

        // PRESCRIPTION COMPLIANCE: Block clinical information requests for prescription drugs
        if (
          productType === 'prescription' &&
          (body.intent === 'dosage' || body.intent === 'drug_info')
        ) {
          console.log(
            '[Prescription Product] Blocking clinical information request - compliance mode',
          );

          const drugName = body.drugName || 'this medication';

          // Enhanced inventory formatting with expiry dates
          const stockInfo =
            internalList.length > 0
              ? `\n\n📦 Inventory: ${internalList
                  .slice(0, 3)
                  .map((p) => {
                    let expiryDate = 'N/A';
                    if (p.expiry) {
                      try {
                        const date = new Date(p.expiry as string);
                        if (!isNaN(date.getTime())) {
                          expiryDate = date.toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          });
                        }
                      } catch {
                        expiryDate = 'N/A';
                      }
                    }
                    return `${p.brandPH || p.name} — ${
                      p.stock
                    } units available at ₱${
                      p.sellingPrice?.toFixed(2) || 'N/A'
                    } each (expiry: ${expiryDate})`;
                  })
                  .join('.\n')}.`
              : '';

          return NextResponse.json(
            {
              response: `${drugName} is a prescription-only medication. For your safety, I cannot provide clinical information including dosage, usage, or side effects without a valid prescription from a physician.${stockInfo}

Please consult your physician or pharmacist for proper guidance.

Sources: BOTica Inventory`,
              sources: ['BOTica Inventory'],
            },
            { status: 200 },
          );
        }

        internalList = (hits || []).map((r) => ({
          id: Number(r.id),
          name: String(r.name),
          brandPH: toString(r.brandPH),
          stock: toNumber(r.stock),
          sellingPrice: toNumber(r.sellingPrice),
          expiry: r.expiry,
          generic: toString(r.generic),
          dosageForm: toString(r.dosageForm),
          unit: toString(r.unit),
        }));

        // If alternatives intent, find by same generic first; fallback to same category
        if (body.intent === 'alternatives') {
          const seen = new Set<number>(internalList.map((r) => r.id));
          const genericVal = toString(getField(hit, 'generic'));
          if (genericVal) {
            const altByGeneric = await db
              .select({
                id: products.id,
                name: products.name,
                brandPH: products.brandName,
                sellingPrice: products.sellingPrice,
                stock: products.quantity,
                expiry: products.expiryDate,
                dosageForm: products.dosageForm,
                unit: products.unit,
              })
              .from(products)
              .leftJoin(categories, eq(products.categoryId, categories.id))
              .where(
                and(
                  sql`${products.deletedAt} IS NULL`,
                  sql`${products.quantity} > 0`,
                  sql`(${products.expiryDate} IS NULL OR ${products.expiryDate} >= CURRENT_DATE)`,
                  sql`LOWER(${products.genericName}) = LOWER(${genericVal})`,
                ),
              )
              .orderBy(desc(products.updatedAt))
              .limit(10);
            for (const r of altByGeneric) {
              if (!seen.has(r.id)) {
                alternativesList.push({
                  id: r.id,
                  name: r.name,
                  brandPH: r.brandPH,
                  stock: r.stock,
                  sellingPrice:
                    r.sellingPrice != null ? Number(r.sellingPrice) : null,
                  expiry: r.expiry,
                  dosageForm: r.dosageForm,
                  unit: r.unit,
                });
                seen.add(r.id);
              }
            }
          }
          const categoryIdVal = toNumber(getField(hit, 'categoryId'));
          if (alternativesList.length === 0 && categoryIdVal != null) {
            const altByCategory = await db
              .select({
                id: products.id,
                name: products.name,
                brandPH: products.brandName,
                sellingPrice: products.sellingPrice,
                stock: products.quantity,
                expiry: products.expiryDate,
                dosageForm: products.dosageForm,
                unit: products.unit,
              })
              .from(products)
              .leftJoin(categories, eq(products.categoryId, categories.id))
              .where(
                and(
                  sql`${products.deletedAt} IS NULL`,
                  sql`${products.quantity} > 0`,
                  sql`(${products.expiryDate} IS NULL OR ${products.expiryDate} >= CURRENT_DATE)`,
                  sql`${products.categoryId} = ${categoryIdVal}`,
                ),
              )
              .orderBy(desc(products.updatedAt))
              .limit(10);
            const seen2 = new Set<number>([
              ...internalList.map((r) => r.id),
              ...alternativesList.map((r) => r.id),
            ]);
            for (const r of altByCategory) {
              if (!seen2.has(r.id)) {
                alternativesList.push({
                  id: r.id,
                  name: r.name,
                  brandPH: r.brandPH,
                  stock: r.stock,
                  sellingPrice:
                    r.sellingPrice != null ? Number(r.sellingPrice) : null,
                  expiry: r.expiry,
                  dosageForm: r.dosageForm,
                  unit: r.unit,
                });
              }
            }
          }
        }
      }
    }

    // INVENTORY VALIDATION: Check if product exists in inventory before processing
    if (body.drugName && wantInternal && internalList.length === 0) {
      // Product not found in inventory - check if it's a valid pharmacy query
      const isPharmacyRelated =
        /\b(tablet|capsule|syrup|suspension|injection|cream|ointment|drops|medicine|medication|drug|prescription|otc|generic|brand|mg|ml|mcg|dosage|dose)\b/i.test(
          body.text || '',
        );

      if (!isPharmacyRelated) {
        // Not pharmacy-related and not in inventory - treat as out of scope
        console.log(
          '[Inventory Validation] Product not found in inventory and not pharmacy-related, treating as out of scope',
        );
        return NextResponse.json(
          {
            response: `I'm a pharmacy assistant. How can I help with inventory or drug information today?

Sources: BOTica System`,
            sources: ['BOTica System'],
          },
          { status: 200 },
        );
      } else {
        // Product appears to be pharmaceutical but not in inventory
        console.log(
          '[Inventory Validation] Pharmaceutical product not found in inventory',
        );
        return NextResponse.json(
          {
            response: `${body.drugName} is not available in our current inventory. I can only provide information about products we have in stock.

Sources: BOTica Inventory`,
            sources: ['BOTica Inventory'],
          },
          { status: 200 },
        );
      }
    }

    // FALLBACK CLASSIFICATION: For drugs not found in inventory but still need classification
    if (
      !productType &&
      body.drugName &&
      (body.intent === 'dosage' || body.intent === 'drug_info') &&
      internalList.length > 0 // Only classify if we found products in inventory
    ) {
      console.log(
        '[Fallback Classification] Classifying drug not found in inventory',
      );
      productType = classifyProduct(
        body.drugName,
        null, // no generic name available
        null, // no dosage form from DB
        null, // no category from DB
      );
    }

    // PRESCRIPTION COMPLIANCE: Block ALL clinical information requests for prescription drugs (early check)
    if (
      productType === 'prescription' &&
      (body.intent === 'dosage' || body.intent === 'drug_info')
    ) {
      console.log(
        '[Prescription Product] Blocking clinical information request - compliance mode (early)',
      );

      const drugName = body.drugName || 'this medication';

      return NextResponse.json(
        {
          response: `${drugName} is a prescription-only medication. For your safety, I cannot provide clinical information including dosage, usage, or side effects without a valid prescription from a physician.

Prescription-only medications require professional medical supervision and should only be used as directed by a licensed healthcare provider.

Please consult your physician or pharmacist for proper guidance.

Sources: BOTica Clinical Database, FDA Guidelines`,
          sources: ['BOTica Clinical Database', 'FDA Guidelines'],
        },
        { status: 200 },
      );
    }

    // EXTERNAL DB lookup
    const sourcesListAgg: string[] = [];
    const external = wantExternal
      ? await fetchExternal(
          body.drugName ?? undefined,
          internal.brandPH,
          sourcesListAgg,
          ((): OpenFDAIntentHint => {
            if (body.intent === 'dosage') return 'dosage';
            const textLower = (body.text || '').toLowerCase();
            if (
              /\b(side\s?effects?|adverse\s?reactions?|undesirable\s?effects?|adverse\s?events?)\b/.test(
                textLower,
              )
            )
              return 'sideEffects';
            if (
              /\b(usage|indications?|what\s+is\s+it\s+used\s+for|what\s+is\s+this\s+for|what\s+is\s+it\s+for)\b/.test(
                textLower,
              )
            )
              return 'usage';
            return 'general';
          })(),
          ((): string | undefined => {
            // best-effort: pass internal generic if we have a single clear hit
            if (internalList.length === 1)
              return internalList[0].generic ?? undefined;
            return undefined;
          })(),
        )
      : {};

    // WEB lookup
    const web = wantWeb ? await fetchWeb() : {};

    // Build friendly sources list (never return raw labels like internal_db/external_db/web_search)
    const friendly: string[] = [];
    if (wantInternal) friendly.push('BOTica Inventory');
    // Only include OpenFDA if it actually provided data (not just search attempts)
    if (external.citations?.some((c) => c.toLowerCase().includes('openfda'))) {
      if (!friendly.includes('OpenFDA')) friendly.push('OpenFDA');
    }
    // Include MedlinePlus if used
    if (sourcesListAgg.some((s) => s.toLowerCase().includes('medlineplus'))) {
      if (!friendly.includes('MedlinePlus')) friendly.push('MedlinePlus');
    }
    // Include MIMS Philippines if used
    if (
      sourcesListAgg.some((s) => s.toLowerCase().includes('mims philippines'))
    ) {
      friendly.push('MIMS Philippines');
    }
    // Include FDA Philippines if present in citations or provenance
    const fdaPhRegex = /fda\.gov\.ph|doh\.gov\.ph|ph\.gov\.ph\/(?:fda|doh)/i;
    if (
      external.citations?.some((c) => fdaPhRegex.test(c)) ||
      sourcesListAgg.some((s) => fdaPhRegex.test(s))
    ) {
      friendly.push('FDA Philippines');
    }
    // Include web sources if used
    if (wantWeb && web.recentAdvisory) {
      friendly.push('Health Advisories');
    }
    const sources = friendly as Sources;

    // Special case: dosage intent with missing external dosage
    if (
      body.intent === 'dosage' &&
      wantExternal &&
      (!external.dosage || !external.dosage.trim())
    ) {
      // Show "not available" message for all drugs when no external data exists
      const noInfoSources = ['OpenFDA'];
      if (sourcesListAgg.some((s) => s.toLowerCase().includes('medlineplus'))) {
        noInfoSources.push('MedlinePlus');
      }
      const responseText = `Clinical details for this drug are not available from approved sources right now.

Sources: ${noInfoSources.join(', ')}`;
      return NextResponse.json(
        {
          response: responseText,
          sources: noInfoSources,
        },
        { status: 200 },
      );
    }

    // Special case: side-effects intent with missing data
    if (
      sideEffectsOnly &&
      wantExternal &&
      (!external.sideEffects || !external.sideEffects.trim())
    ) {
      console.log('[Debug] Side effects query with no external data:', {
        drugName: body.drugName,
        productType,
        hasExternalSideEffects: !!(
          external.sideEffects && external.sideEffects.trim()
        ),
      });

      // For prescription drugs, show "not available" message
      if (productType === 'prescription') {
        const noInfoSources = ['OpenFDA'];
        if (
          sourcesListAgg.some((s) => s.toLowerCase().includes('medlineplus'))
        ) {
          noInfoSources.push('MedlinePlus');
        }
        const responseText = `Clinical details for this drug are not available from approved sources.

Sources: ${noInfoSources.join(', ')}`;
        return NextResponse.json(
          {
            response: responseText,
            sources: noInfoSources,
          },
          { status: 200 },
        );
      }

      // For OTC drugs, also show "not available" - rely only on external sources
      // No hardcoded information should be provided
    }

    // Special case: usage-only with missing indications
    if (
      usageOnly &&
      wantExternal &&
      (!external.indications || !external.indications.trim())
    ) {
      console.log('[Debug] Usage query with no external data:', {
        drugName: body.drugName,
        usageOnly,
        productType,
        hasExternalIndications: !!(
          external.indications && external.indications.trim()
        ),
      });

      // For prescription drugs, show "not available" message
      if (productType === 'prescription') {
        const noInfoSources = ['OpenFDA'];
        if (
          sourcesListAgg.some((s) => s.toLowerCase().includes('medlineplus'))
        ) {
          noInfoSources.push('MedlinePlus');
        }
        const responseText = `Clinical details for this drug are not available from approved sources right now.

Sources: ${noInfoSources.join(', ')}`;
        return NextResponse.json(
          {
            response: responseText,
            sources: noInfoSources,
          },
          { status: 200 },
        );
      }

      // For OTC drugs, also show "not available" - rely only on external sources
      // No hardcoded information should be provided
    }

    // Check if AI response composition is available
    if (isAIResponseConfigured()) {
      try {
        // Reconstruct query context from available data
        const reconstructedQuery =
          body.text && body.text.trim().length
            ? body.text
            : body.drugName
            ? `${body.intent.replace('_', ' ')} for ${body.drugName}`
            : `${body.intent.replace('_', ' ')} information`;

        console.log('Attempting AI response with:', {
          reconstructedQuery,
          intent: body.intent,
          drugName: body.drugName,
          hasInternalData: !!internalList.length,
          hasExternalData: wantExternal && !!external,
        });

        // Determine if this is a dosage-only request (no stock/price/expiry info requested)
        const dosageOnly =
          body.intent === 'dosage' &&
          !(body.needs || []).some((n) =>
            ['stock', 'price', 'expiry'].includes(n),
          );

        // Compose dynamic response using AI based on user prompt and gathered data
        const aiResponse = await composeResponseLLM({
          userQuery: reconstructedQuery,
          intent: body.intent,
          drugName: body.drugName,
          productType: productType,
          internalData:
            dosageOnly || sideEffectsOnly || usageOnly
              ? undefined // Don't provide inventory data for dosage-only requests
              : {
                  products: internalList.slice(0, 5).map((p) => ({
                    id: p.id,
                    name: p.name,
                    brand: p.brandPH,
                    stock: p.stock,
                    price: p.sellingPrice,
                    expiry: toISODate(p.expiry),
                    dosageForm: p.dosageForm,
                    unit: p.unit,
                  })),
                  alternatives:
                    body.intent === 'alternatives'
                      ? alternativesList.slice(0, 5).map((alt) => ({
                          id: alt.id,
                          name: alt.name,
                          brand: alt.brandPH,
                          stock: alt.stock,
                          price: alt.sellingPrice,
                          expiry: toISODate(alt.expiry),
                          dosageForm: alt.dosageForm,
                          unit: alt.unit,
                        }))
                      : undefined,
                },
          externalData: wantExternal
            ? { ...external, sideEffects: external.sideEffects }
            : undefined,
          // Provide friendly source labels to the AI so it cites professionally
          sources: sources,
          sessionContext: body.sessionContext,
          userRole: userRole,
        });

        console.log('AI Response received:', aiResponse);

        // Extract the actual response text from the AI response object
        const responseText = aiResponse?.response || null;

        if (responseText) {
          console.log('Returning AI response:', responseText);

          // Check if AI response already includes sources
          const hasSourcesInResponse = /Sources:\s*/.test(responseText);
          const finalResponse = hasSourcesInResponse
            ? responseText
            : responseText + `\n\nSources: ${sources.join(', ')}`;

          return NextResponse.json(
            {
              response: finalResponse,
              sources,
            },
            { status: 200 },
          );
        } else {
          console.error(
            'AI response was null or empty, falling back to static response',
          );
          // Fall back to static response if AI returns null
        }
      } catch (error) {
        console.error('AI response composition failed:', error);
        // Fall back to static response if AI fails
      }
    } else {
      console.log('AI response not configured, using static response');
    }

    // Fallback to template-based response if AI is not configured or fails
    // Build clean response using our templates instead of legacy format

    let response: string;

    // Handle different query types with proper templates
    if (body.intent === 'stock_check' && internalList.length > 0) {
      // Inventory template - show multiple products when available
      if (internalList.length === 1) {
        const product = internalList[0];
        response = `${product.name}: ${product.stock} units at ₱${
          product.sellingPrice?.toFixed(2) || 'N/A'
        } (exp: ${toISODate(product.expiry) || 'N/A'}).`;
      } else {
        response = `Found ${internalList.length} products matching "${
          body.drugName
        }":\n\n${internalList
          .slice(0, 5)
          .map(
            (product, index) =>
              `${index + 1}. ${product.name}: ${product.stock} units at ₱${
                product.sellingPrice?.toFixed(2) || 'N/A'
              } (exp: ${toISODate(product.expiry) || 'N/A'})`,
          )
          .join('\n')}${
          internalList.length > 5
            ? `\n\n...and ${internalList.length - 5} more`
            : ''
        }`;
      }
    } else if (body.intent === 'dosage' && productType === 'otc') {
      // OTC dosage template - follow composer rules for clean formatting
      if (external.dosage && external.dosage.trim()) {
        // Clean and format external dosage data according to composer template
        const cleanDosage = external.dosage
          .replace(/\s+/g, ' ') // normalize whitespace
          .replace(/([.!?])\s*([A-Z])/g, '$1 $2') // proper sentence spacing
          .trim();

        // Extract key dosage info and format according to template
        let formattedResponse = `${body.drugName}: `;

        // Try to extract adult and pediatric dosing if available
        const adultMatch = cleanDosage.match(/adult[s]?\s*:?\s*([^.]+)/i);
        const pediatricMatch = cleanDosage.match(
          /pediatric|children|child[s]?\s*:?\s*([^.]+)/i,
        );

        if (adultMatch && adultMatch[1]) {
          formattedResponse += `Adult ${adultMatch[1].trim()}. `;
        } else {
          formattedResponse += `${cleanDosage.substring(0, 100)}... `;
        }

        if (pediatricMatch && pediatricMatch[1]) {
          formattedResponse += `Pediatric: ${pediatricMatch[1].trim()}. `;
        }

        // Add warnings if available
        if (external.warnings && external.warnings.trim()) {
          const cleanWarnings = external.warnings.substring(0, 150).trim();
          formattedResponse += `⚠️ Warning: ${cleanWarnings}... `;
        }

        formattedResponse +=
          'Consult a licensed healthcare professional before use.';
        response = formattedResponse;
      } else {
        // When no external data available, show "not available" message
        response = `Clinical details for this drug are not available from approved sources right now.

Sources: OpenFDA, MedlinePlus`;
      }
    } else if (body.intent === 'dosage' && productType === 'prescription') {
      // Prescription block template
      response = `${body.drugName} is prescription-only. Cannot provide dosage without valid physician prescription. Prescription required from physician.`;
    } else if (sideEffectsOnly || usageOnly) {
      // Handle side effects and usage with external sources only
      const intentLabel = sideEffectsOnly
        ? 'side effects'
        : 'usage information';
      response = `Clinical details for ${intentLabel} are not available from approved sources right now.

Sources: OpenFDA, MedlinePlus`;
    } else if (body.intent === 'alternatives') {
      // Alternatives template
      if (alternativesList.length > 0) {
        if (alternativesList.length === 1) {
          const alt = alternativesList[0];
          response = `Alternative to ${body.drugName}: ${alt.name} - ${
            alt.stock
          } units at ₱${alt.sellingPrice?.toFixed(2) || 'N/A'} (exp: ${
            toISODate(alt.expiry) || 'N/A'
          }).`;
        } else {
          response = `Alternatives to ${body.drugName}:\n\n${alternativesList
            .slice(0, 5)
            .map(
              (alt, index) =>
                `${index + 1}. ${alt.name}: ${alt.stock} units at ₱${
                  alt.sellingPrice?.toFixed(2) || 'N/A'
                } (exp: ${toISODate(alt.expiry) || 'N/A'})`,
            )
            .join('\n')}${
            alternativesList.length > 5
              ? `\n\n...and ${alternativesList.length - 5} more alternatives`
              : ''
          }`;
        }
      } else {
        response = `No alternatives found for ${body.drugName} in our current inventory.`;
      }
    } else {
      // Generic fallback
      response = `I don't have that information right now.`;
    }

    // Enhanced session context suggestions for better follow-up queries
    let suggestedSessionContext:
      | {
          lastDrugName: string;
          lastIntent: string;
          productType?: string;
        }
      | undefined = undefined;

    if (
      body.intent === 'stock_check' &&
      internalList.length > 0 &&
      body.drugName
    ) {
      // For stock queries, suggest the most complete drug specification available
      const firstProduct = internalList[0];
      const enhancedDrugName = firstProduct.name || body.drugName;

      // Be conservative about appending dosage forms - only do it if explicitly needed
      const suggestedDrugName = enhancedDrugName || body.drugName;
      // Don't auto-append tablet form for stock queries to avoid confusion
      // Let the user specify the exact form when they ask for dosage information

      suggestedSessionContext = {
        lastDrugName: suggestedDrugName,
        lastIntent: body.intent,
        productType: productType || undefined,
      };
    } else if (body.intent === 'dosage' && body.drugName) {
      // For dosage queries, preserve the exact specification
      suggestedSessionContext = {
        lastDrugName: body.drugName,
        lastIntent: body.intent,
        productType: productType || undefined,
      };
    }

    const responseData: {
      response: string;
      sources: string[];
      suggestedSessionContext?: {
        lastDrugName: string;
        lastIntent: string;
        productType?: string;
      };
    } = {
      response: response + `\n\nSources: ${sources.join(', ')}`,
      sources,
    };

    if (suggestedSessionContext) {
      responseData.suggestedSessionContext = suggestedSessionContext;
    }

    return NextResponse.json(responseData, { status: 200 });
  } catch (error) {
    console.error('Error in response composition:', error);
    return NextResponse.json(
      {
        error: 'Failed to compose response',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
