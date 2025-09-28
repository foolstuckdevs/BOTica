// Core types for RAG LangChain implementation

export interface UserQuery {
  text: string;
  userId?: string;
  timestamp: Date;
}

export interface DetectedIntent {
  type: 'dosage' | 'usage' | 'side-effects' | 'general' | 'unknown';
  drugName: string;
  confidence: number;
  rawQuery: string;
}

export interface InventoryMatch {
  id: string;
  name: string;
  genericName?: string;
  category: string;
  brand?: string;
  inStock: boolean;
  price?: number;
  description?: string;
}

export interface RxNormResult {
  rxcui: string;
  name: string;
  synonyms: string[];
  tty: string; // Term type
  language: string;
  suppress?: string;
  score?: string; // API confidence score
}

export interface ClinicalData {
  rxcui: string;
  drugName: string;
  sections: {
    dosage?: DosageInfo;
    usage?: UsageInfo;
    sideEffects?: SideEffectsInfo;
  };
  source: string;
  lastUpdated: Date;
}

export interface DosageInfo {
  adults?: string;
  children?: string;
  elderly?: string;
  maxDaily?: string;
  frequency?: string;
  instructions?: string;
  warnings?: string;
}

export interface UsageInfo {
  indications: string[];
  contraindications?: string[];
  interactions?: string[];
  precautions?: string[];
}

export interface SideEffectsInfo {
  common: string[];
  serious: string[];
  rare?: string[];
  allergicReactions?: string[];
}

export interface RetrievalContext {
  intent: DetectedIntent;
  inventoryMatches: InventoryMatch[];
  rxnormResults: RxNormResult[];
  clinicalData: ClinicalData[];
  errors: string[];
}

export interface RAGConfig {
  maxInventoryResults: number;
  rxnormTimeout: number;
  clinicalTimeout: number;
  enableCache: boolean;
  fallbackToGeneric: boolean;
}

// ChatbotResponse interface for API compatibility
export interface ChatbotResponse {
  ui: {
    staffMessage: string;
    detailedNotes: string;
  };
  inventory: InventoryItem[] | null;
  clinical: {
    dosage?: string;
    usage?: string;
    sideEffects?: string;
    source: string;
  } | null;
  sources: string[];
  confidence: number;
}

export interface InventoryItem {
  id: number;
  name: string;
  dosageForm: string;
  quantity: number;
  sellingPrice: string;
  inStock: boolean;
  unit: string;
  categoryName?: string;
}
