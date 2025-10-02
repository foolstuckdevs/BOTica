import { ChatOpenAI } from '@langchain/openai';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { buildPNFChatPrompt } from '@/lib/rag/prompts/pnf-chat-prompt';
import type { DocumentInterface } from '@langchain/core/documents';
import type { PNFChatResponse, PNFChatSections } from '@/lib/rag/types';
import {
  PNF_CHAT_SECTION_LABELS,
  pnfChatResponseSchema,
} from '@/lib/rag/types';

const FALLBACK_MESSAGE =
  'I could not locate that information in the Philippine National Formulary.';

function normalizeDrugName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s\+\-]/g, '')
    .trim();
}

function uniqueDrugNames(documents: DocumentInterface[]): string[] {
  const seen = new Set<string>();
  const results: string[] = [];

  documents.forEach((doc) => {
    const name = doc.metadata?.drugName;
    if (!name) return;
    const key = normalizeDrugName(String(name));
    if (!key || seen.has(key)) return;
    seen.add(key);
    results.push(String(name));
  });

  return results;
}

function matchDrugInText(text: string, candidates: string[]): string | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  const ordered = [...candidates].sort((a, b) => b.length - a.length);

  for (const candidate of ordered) {
    const normalized = candidate.toLowerCase();
    if (lower.includes(normalized)) {
      return candidate;
    }
  }

  const keywordMatch = text.match(
    /(?:for|about|regarding|of|on|info on|information on)\s+([a-z0-9\s\+\-]+)/i,
  );

  if (keywordMatch?.[1]) {
    const raw = keywordMatch[1].trim().toLowerCase();
    const match = ordered.find((candidate) => {
      const normalized = candidate.toLowerCase();
      return normalized.includes(raw) || raw.includes(normalized);
    });
    if (match) {
      return match;
    }
  }

  return null;
}

function resolveActiveDrug(
  question: string,
  chatHistory: string[],
  documents: DocumentInterface[],
): string | null {
  const candidates = uniqueDrugNames(documents);
  if (!candidates.length) {
    return null;
  }

  const direct = matchDrugInText(question, candidates);
  if (direct) {
    return direct;
  }

  for (let index = chatHistory.length - 1; index >= 0; index -= 1) {
    const entry = chatHistory[index].replace(/^user:\s*/i, '');
    const match = matchDrugInText(entry, candidates);
    if (match) {
      return match;
    }
  }

  return candidates[0] ?? null;
}

function buildCitations(documents: DocumentInterface[]) {
  const seen = new Set<string>();

  return documents
    .map((doc, index) => {
      const drugName = doc.metadata?.drugName ?? 'Unknown Drug';
      const section = doc.metadata?.section;
      const pageRange =
        doc.metadata?.pageRange ?? doc.metadata?.pageNumber ?? 'Unknown';
      const citationKey = `${drugName}|${section ?? 'general'}|${pageRange}`;

      if (seen.has(citationKey)) {
        return null;
      }

      seen.add(citationKey);

      return {
        chunkId: doc.metadata?.id ?? `chunk-${index}`,
        drugName,
        section,
        pageRange: typeof pageRange === 'number' ? `${pageRange}` : pageRange,
        snippet: doc.pageContent.slice(0, 200),
      };
    })
    .filter((value): value is NonNullable<typeof value> => Boolean(value));
}

// Intent detection patterns
const INTENT_PATTERNS = {
  dosage: {
    patterns: [/\b(dosage|dose|dosing|how much)\b/i],
    sections: [
      'overview',
      'dosage',
      'doseAdjustment',
      'administration',
    ] as Array<keyof PNFChatSections>,
  },
  indications: {
    patterns: [
      /\b(indication|indications|use|uses|used for|treat|treating)\b/i,
    ],
    sections: ['overview', 'indications'] as Array<keyof PNFChatSections>,
  },
  contraindications: {
    patterns: [
      /\b(contraindication|contraindications|should not|avoid|when not)\b/i,
    ],
    sections: ['overview', 'contraindications'] as Array<keyof PNFChatSections>,
  },
  adverseReactions: {
    patterns: [
      /\b(side effect|side effects|adverse|adverse reaction|adverse effect|reactions?)\b/i,
    ],
    sections: ['overview', 'adverseReactions'] as Array<keyof PNFChatSections>,
  },
  precautions: {
    patterns: [
      /\b(precaution|precautions|warning|warnings|caution|cautions)\b/i,
    ],
    sections: ['overview', 'precautions'] as Array<keyof PNFChatSections>,
  },
  interactions: {
    patterns: [/\b(interaction|interactions|drug interaction|interact)\b/i],
    sections: ['overview', 'interactions'] as Array<keyof PNFChatSections>,
  },
  formulations: {
    patterns: [
      /\b(formulation|formulations|available form|presentation|strength)\b/i,
    ],
    sections: ['overview', 'formulations'] as Array<keyof PNFChatSections>,
  },
  administration: {
    patterns: [/\b(administration|administer|how to take|how to give)\b/i],
    sections: ['overview', 'administration'] as Array<keyof PNFChatSections>,
  },
  monitoring: {
    patterns: [/\b(monitor|monitoring|watch|check)\b/i],
    sections: ['overview', 'monitoring'] as Array<keyof PNFChatSections>,
  },
};

// Detect user intent from question
function detectIntent(question: string): Array<keyof PNFChatSections> | null {
  const lowerQuestion = question.toLowerCase();

  for (const [, config] of Object.entries(INTENT_PATTERNS)) {
    for (const pattern of config.patterns) {
      if (pattern.test(lowerQuestion)) {
        return config.sections;
      }
    }
  }

  // Check if it's a broad question (just drug name or "tell me about")
  const isBroadQuery =
    /^(tell me about|info on|information about|what is|what's)?\s*[a-z0-9\s\-\+]+$/i.test(
      question.trim(),
    );

  return isBroadQuery ? null : null; // null means return all sections
}

const EMPTY_SECTION_VALUE = 'Not covered in provided context.';

const SECTION_ORDER: Array<keyof PNFChatSections> = [
  'overview',
  'formulations',
  'indications',
  'contraindications',
  'dosage',
  'doseAdjustment',
  'precautions',
  'adverseReactions',
  'interactions',
  'administration',
  'monitoring',
  'notes',
  'atcCode',
  'classification',
];

const FALLBACK_SECTIONS: PNFChatSections = {
  overview: FALLBACK_MESSAGE,
  formulations: EMPTY_SECTION_VALUE,
  indications: EMPTY_SECTION_VALUE,
  contraindications: EMPTY_SECTION_VALUE,
  dosage: EMPTY_SECTION_VALUE,
  doseAdjustment: EMPTY_SECTION_VALUE,
  precautions: EMPTY_SECTION_VALUE,
  adverseReactions: EMPTY_SECTION_VALUE,
  interactions: EMPTY_SECTION_VALUE,
  administration: EMPTY_SECTION_VALUE,
  monitoring: EMPTY_SECTION_VALUE,
  notes: EMPTY_SECTION_VALUE,
  pregnancy: 'Not requested', // Excluded from all responses
  atcCode: EMPTY_SECTION_VALUE,
  classification: EMPTY_SECTION_VALUE,
};

function formatAnswerFromSections(
  sections?: PNFChatSections,
  fallback?: string,
  requestedSections?: Array<keyof PNFChatSections>,
) {
  if (!sections) {
    return fallback ?? '';
  }

  // If specific sections were requested, only show those
  const sectionsToShow = requestedSections || SECTION_ORDER;

  const parts = sectionsToShow
    .map((key) => {
      const label = PNF_CHAT_SECTION_LABELS[key];
      const raw = sections[key]?.trim();
      const content = raw?.length ? raw : EMPTY_SECTION_VALUE;

      // Skip sections marked as "Not requested" or empty
      if (content === 'Not requested' || content === EMPTY_SECTION_VALUE) {
        return null;
      }

      return `${label}:\n${content}`;
    })
    .filter(Boolean);

  // If no relevant content found, return fallback
  if (parts.length === 0) {
    return fallback ?? FALLBACK_MESSAGE;
  }

  return parts.join('\n\n');
}

export interface CreatePNFChatChainArgs {
  responseModel?: string;
  temperature?: number;
}

export function createPNFChatChain({
  responseModel = process.env.AI_RESPONSE_MODEL ?? 'gpt-4o-mini',
  temperature = 0,
}: CreatePNFChatChainArgs = {}) {
  if (!process.env.AI_API_KEY) {
    throw new Error('AI_API_KEY is required to run the chat chain');
  }

  const llm = new ChatOpenAI({
    apiKey: process.env.AI_API_KEY,
    model: responseModel,
    temperature,
  });

  const parser = StructuredOutputParser.fromZodSchema(pnfChatResponseSchema);

  const prompt = buildPNFChatPrompt(parser.getFormatInstructions());

  const withPrompt = prompt.pipe(llm).pipe(parser);

  return withPrompt;
}

export async function runPNFChatChain({
  question,
  chatHistory,
  documents,
  chain,
}: {
  question: string;
  chatHistory: string[];
  documents: DocumentInterface[];
  chain?: ReturnType<typeof createPNFChatChain>;
}): Promise<PNFChatResponse> {
  const resolvedChain = chain ?? createPNFChatChain();

  // Detect user intent to determine which sections to return
  const requestedSections = detectIntent(question);
  const activeDrug = resolveActiveDrug(question, chatHistory, documents);

  let workingDocuments = documents;

  if (activeDrug) {
    const normalizedActive = normalizeDrugName(activeDrug);
    const filtered = documents.filter((doc) => {
      if (!doc.metadata?.drugName) return false;
      return (
        normalizeDrugName(String(doc.metadata.drugName)) === normalizedActive
      );
    });

    if (filtered.length) {
      workingDocuments = filtered;
    }
  }

  const context = workingDocuments
    .map((doc, index) => {
      const citation = doc.metadata?.pageRange ?? doc.metadata?.pageNumber;
      return `[#${index + 1}] Drug: ${
        doc.metadata?.drugName ?? 'Unknown'
      } | Pages: ${citation}\n${doc.pageContent}`;
    })
    .join('\n\n');

  const response = await resolvedChain.invoke({
    question,
    context,
    chat_history: chatHistory.length
      ? chatHistory.join('\n')
      : 'No previous turns.',
  });

  if (!response || !response.sections) {
    return {
      sections: { ...FALLBACK_SECTIONS },
      answer: FALLBACK_MESSAGE,
      citations: [],
      notes: 'No structured answer returned by LLM',
    };
  }

  // Filter sections based on detected intent
  const filteredSections = { ...response.sections };
  filteredSections.pregnancy = 'Not requested';
  if (requestedSections) {
    // Only keep requested sections, mark others as "Not requested"
    const allSectionKeys = Object.keys(filteredSections) as Array<
      keyof PNFChatSections
    >;
    allSectionKeys.forEach((key) => {
      if (!requestedSections.includes(key)) {
        filteredSections[key] = 'Not requested';
      }
    });
  }

  const formattedAnswer = formatAnswerFromSections(
    filteredSections,
    response.answer,
    requestedSections ?? undefined,
  );

  const derivedCitations = buildCitations(workingDocuments);
  const finalCitations =
    response.citations && response.citations.length
      ? response.citations
      : derivedCitations;

  return {
    ...response,
    sections: filteredSections,
    answer: formattedAnswer,
    citations: finalCitations,
  };
}
