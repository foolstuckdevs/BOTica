import { TTLCache } from '@/lib/cache/ttl';

type ExternalInfo = {
  indications?: string;
  dosage?: string;
  warnings?: string;
  brandUS?: string;
  citations?: string[];
  sideEffects?: string;
};

export type MedlinePlusIntentHint = 'dosage' | 'usage' | 'sideEffects' | 'general';

// Cache for 12 hours since MedlinePlus content is stable
const medlinePlusCache = new TTLCache<string, ExternalInfo>(12 * 60 * 60 * 1000);

// For now, we'll provide basic fallback information
// TODO: Implement XML parsing for MedlinePlus search API in future
const COMMON_DRUG_INFO: Record<string, ExternalInfo> = {
  acetaminophen: {
    indications: 'Used to treat pain and reduce fever. Commonly used for headaches, muscle aches, arthritis, backaches, toothaches, colds, and fevers.',
    dosage: 'Adults and children 12 years and older: Take 325-650 mg every 4-6 hours as needed. Do not exceed 3,000 mg in 24 hours.',
    warnings: 'Do not exceed recommended dose. Severe liver damage may occur if you take more than 4,000 mg in 24 hours. Do not use with other drugs containing acetaminophen.',
    sideEffects: 'Rare side effects may include skin rash, allergic reactions. Overdose can cause serious liver damage.',
    citations: ['web: MedlinePlus Drug Information -> https://medlineplus.gov/druginfo/'],
  },
  ibuprofen: {
    indications: 'Used to reduce fever and treat pain or inflammation caused by conditions such as headache, toothache, back pain, arthritis, menstrual cramps, or minor injury.',
    dosage: 'Adults: Take 200-400 mg every 4-6 hours as needed. Do not exceed 1,200 mg in 24 hours unless directed by a doctor.',
    warnings: 'May increase risk of serious cardiovascular and gastrointestinal events. Do not use if you have heart disease, high blood pressure, or stomach ulcers.',
    sideEffects: 'Common side effects include stomach upset, nausea, vomiting, headache, diarrhea, constipation, dizziness, or drowsiness.',
    citations: ['web: MedlinePlus Drug Information -> https://medlineplus.gov/druginfo/'],
  },
  aspirin: {
    indications: 'Used to treat pain, reduce fever, and reduce inflammation. Also used to prevent heart attack and stroke in certain people.',
    dosage: 'For pain/fever: Adults take 325-650 mg every 4 hours as needed. For heart protection: Usually 81 mg daily as directed by doctor.',
    warnings: 'Do not give to children or teenagers with viral infections due to risk of Reye syndrome. May increase bleeding risk.',
    sideEffects: 'Common side effects include stomach irritation, heartburn, nausea. Serious side effects include bleeding, allergic reactions.',
    citations: ['web: MedlinePlus Drug Information -> https://medlineplus.gov/druginfo/'],
  },
};

function normalizeGenericName(drugName: string): string {
  return drugName.toLowerCase()
    .replace(/\b\d+\s?(mg|ml|mcg|g)\b/gi, '') // Remove dosage
    .replace(/\s+/g, ' ')
    .trim();
}

export async function getDrugInfoFromMedlinePlus(
  drugName: string,
  hint: MedlinePlusIntentHint = 'general'
): Promise<ExternalInfo> {
  console.log(`[MedlinePlus] getDrugInfoFromMedlinePlus called with "${drugName}", hint: ${hint}`);
  
  const normalizedName = normalizeGenericName(drugName);
  const cacheKey = `${normalizedName}|${hint}`;
  
  const cached = medlinePlusCache.get(cacheKey);
  if (cached) {
    console.log(`[MedlinePlus] Cache hit for "${drugName}"`);
    return cached;
  }

  // Check if we have predefined information for this drug
  const predefinedInfo = COMMON_DRUG_INFO[normalizedName];
  if (predefinedInfo) {
    console.log(`[MedlinePlus] Found predefined info for "${drugName}"`);
    
    // Filter information based on intent hint
    const result: ExternalInfo = {
      citations: predefinedInfo.citations,
    };
    
    if (hint === 'dosage' || hint === 'general') {
      result.dosage = predefinedInfo.dosage;
    }
    
    if (hint === 'usage' || hint === 'general') {
      result.indications = predefinedInfo.indications;
    }
    
    if (hint === 'sideEffects' || hint === 'general') {
      result.sideEffects = predefinedInfo.sideEffects;
    }
    
    if (hint === 'general') {
      result.warnings = predefinedInfo.warnings;
    }
    
    medlinePlusCache.set(cacheKey, result);
    return result;
  }

  // If no predefined info available, return basic guidance
  console.log(`[MedlinePlus] No predefined info for "${drugName}", returning basic guidance`);
  
  const basicInfo: ExternalInfo = {
    citations: ['web: MedlinePlus Drug Information -> https://medlineplus.gov/druginfo/'],
  };
  
  if (hint === 'dosage') {
    basicInfo.dosage = 'For specific dosage information, please consult your healthcare provider or pharmacist.';
  } else if (hint === 'usage') {
    basicInfo.indications = 'For detailed usage information, please consult your healthcare provider or the medication package insert.';
  } else if (hint === 'sideEffects') {
    basicInfo.sideEffects = 'For side effect information, please consult your healthcare provider or the medication package insert.';
  } else {
    basicInfo.indications = 'For detailed drug information, please consult your healthcare provider or visit MedlinePlus.';
  }
  
  medlinePlusCache.set(cacheKey, basicInfo);
  return basicInfo;
}

// Export the predefined drugs list for reference
export const SUPPORTED_DRUGS = Object.keys(COMMON_DRUG_INFO);