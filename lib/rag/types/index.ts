import { z } from 'zod';

export interface PNFDrugEntry {
  drugName: string;
  rawContent: string;
  normalizedContent: string;
  sections: Partial<Record<PNFSectionKey, string>>;
  pregnancyCategory?: string;
  atcCode?: string;
  entryRange: {
    start: number;
    end: number;
  };
  classification?: 'Rx' | 'OTC' | 'Unknown';
}

export type PNFSectionKey =
  | 'indications'
  | 'contraindications'
  | 'dosage'
  | 'doseAdjustment'
  | 'precautions'
  | 'adverseReactions'
  | 'drugInteractions'
  | 'administration'
  | 'formulations';

export type PNFRawChunk = {
  id: string;
  content: string;
  metadata: PNFChunkMetadata;
};

export type PNFChunkMetadata = {
  drugName: string;
  section?: string;
  sourceEntries: number[];
  entryRange: string;
  pregnancyCategory?: string;
  atcCode?: string;
  classification?: 'Rx' | 'OTC' | 'Unknown';
};

export const pnfChatSectionsSchema = z.object({
  overview: z.string().default(''),
  formulations: z.string().default(''),
  indications: z.string().default(''),
  contraindications: z.string().default(''),
  dosage: z.string().default(''),
  doseAdjustment: z.string().default(''),
  precautions: z.string().default(''),
  adverseReactions: z.string().default(''),
  interactions: z.string().default(''),
  administration: z.string().default(''),
  monitoring: z.string().default(''),
  notes: z.string().default(''),
  pregnancy: z.string().default(''),
  atcCode: z.string().default(''),
  classification: z.string().default(''),
});

export type PNFChatSections = z.infer<typeof pnfChatSectionsSchema>;

export const PNF_CHAT_SECTION_LABELS: Record<keyof PNFChatSections, string> = {
  overview: 'Overview',
  formulations: 'Formulations',
  indications: 'Indications',
  contraindications: 'Contraindications',
  dosage: 'Dosage',
  doseAdjustment: 'Dose Adjustment',
  precautions: 'Precautions',
  adverseReactions: 'Adverse Reactions',
  interactions: 'Interactions',
  administration: 'Administration',
  monitoring: 'Monitoring',
  notes: 'Notes',
  pregnancy: 'Pregnancy',
  atcCode: 'ATC Code',
  classification: 'Classification',
};

export const pnfChatResponseSchema = z.object({
  sections: pnfChatSectionsSchema,
  answer: z.string().optional(),
  followUpQuestions: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export type PNFChatResponse = z.infer<typeof pnfChatResponseSchema>;
