// Core chatbot types for BOTica RAG system
export interface ChatbotRequest {
  message: string;
  userId?: string;
  pharmacyId: number;
  sessionId?: string;
}

export interface ChatbotResponse {
  ui: {
    staffMessage: string; // Simple response for pharmacy staff
    detailedNotes: string; // Product details and clinical info
  };
  inventory: InventoryInfo[] | null; // Array to show multiple products
  clinical: ClinicalInfo | null;
  sources: string[];
  confidence: number; // 0-1 confidence score
}

export interface InventoryInfo {
  id: number;
  name: string;
  genericName?: string;
  brandName?: string;
  dosageForm: string;
  quantity: number;
  sellingPrice: string; // For Philippine peso pricing
  expiryDate?: string;
  inStock: boolean;
  minStockLevel?: number;
  unit: string;
  categoryName?: string; // Add category for OTC/prescription classification
}

export interface ClinicalInfo {
  dosage?: string;
  usage?: string;
  sideEffects?: string;
  contraindications?: string;
  source: string;
  rxCui?: string;
  lastUpdated?: string;
}

// Tool-specific types
export interface RxNavResponse {
  rxCui?: string;
  name: string;
  source: string;
  confidence: number;
}

export interface MedlinePlusResponse {
  dosage?: string;
  usage?: string;
  sideEffects?: string;
  contraindications?: string;
  source: string;
  found: boolean;
}

// Simplified intent classification
export type QueryIntent =
  | 'product_lookup' // Looking for a specific product
  | 'drug_info' // Want clinical information
  | 'out_of_scope';

export interface IntentClassification {
  intent: QueryIntent;
  confidence: number;
  entities: {
    drugName?: string;
    brandName?: string;
    genericName?: string;
    quantity?: number;
  };
}

// Database connection types
export interface DatabaseConfig {
  connectionString: string;
  maxConnections?: number;
  idleTimeout?: number;
}

// API configuration
export interface APIConfig {
  openai: {
    apiKey: string;
    baseUrl?: string;
    model: string;
  };
  rxnav: {
    baseUrl: string;
    timeout?: number;
  };
  medlineplus: {
    baseUrl: string;
    timeout?: number;
  };
}
