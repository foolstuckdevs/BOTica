import { ChatOpenAI } from '@langchain/openai';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { buildPNFChatPrompt } from '@/lib/rag/prompts/pnf-chat-prompt';
import type { DocumentInterface } from '@langchain/core/documents';
import type { PNFChatResponse, PNFChatSections } from '@/lib/rag/types';
import { resolveEntryRange } from '@/lib/rag/utils/metadata';
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
  preferredDrug?: string,
): string | null {
  const candidates = uniqueDrugNames(documents);
  if (!candidates.length) {
    return null;
  }

  if (preferredDrug) {
    const normalizedPreferred = normalizeDrugName(preferredDrug);
    const preferredMatch = candidates.find(
      (candidate) => normalizeDrugName(candidate) === normalizedPreferred,
    );

    if (preferredMatch) {
      return preferredMatch;
    }
  }

  // First check if the current question mentions a drug directly
  const direct = matchDrugInText(question, candidates);
  if (direct) {
    return direct;
  }

  // Search through chat history (both user and assistant messages) from most recent to oldest
  for (let index = chatHistory.length - 1; index >= 0; index -= 1) {
    const entry = chatHistory[index];

    // Extract the actual message content (remove "user:" or "assistant:" prefix)
    const content = entry.replace(/^(user|assistant):\s*/i, '');

    const match = matchDrugInText(content, candidates);
    if (match) {
      return match;
    }
  }

  return candidates[0] ?? null;
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
    sections: ['overview', 'drugInteractions'] as Array<keyof PNFChatSections>,
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
  pregnancy: EMPTY_SECTION_VALUE,
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
    modelKwargs: {
      response_format: { type: 'json_object' },
    },
  });

  const parser = StructuredOutputParser.fromZodSchema(pnfChatResponseSchema);

  const prompt = buildPNFChatPrompt(parser.getFormatInstructions());

  const withPrompt = prompt.pipe(llm).pipe(parser);

  return withPrompt;
}

export interface PNFChatChainResult {
  response: PNFChatResponse;
  primaryDrug?: string;
  supportingDrugs: string[];
  usedDocuments: DocumentInterface[];
}

export async function runPNFChatChain({
  question,
  chatHistory,
  documents,
  chain,
  activeDrugHint,
}: {
  question: string;
  chatHistory: string[];
  documents: DocumentInterface[];
  chain?: ReturnType<typeof createPNFChatChain>;
  activeDrugHint?: string;
}): Promise<PNFChatChainResult> {
  const resolvedChain = chain ?? createPNFChatChain();

  // Detect user intent to determine which sections to return
  const requestedSections = detectIntent(question);

  const activeDrug = resolveActiveDrug(
    question,
    chatHistory,
    documents,
    activeDrugHint,
  );

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

  if (requestedSections && workingDocuments.length > 1) {
    const allowedSections = new Set<string>([...requestedSections]);
    const intentFiltered = workingDocuments.filter((doc) => {
      const sectionKey = doc.metadata?.section;
      if (!sectionKey) return true;
      return allowedSections.has(String(sectionKey));
    });

    if (intentFiltered.length) {
      workingDocuments = intentFiltered;
    }
  }

  const maxDocuments = requestedSections ? 4 : 6;
  if (workingDocuments.length > maxDocuments) {
    workingDocuments = workingDocuments.slice(0, maxDocuments);
  }

  const seenDrugSections = new Map<string, Set<string>>();
  workingDocuments = workingDocuments.filter((doc) => {
    const drugName = doc.metadata?.drugName;
    const sectionKey = doc.metadata?.section;
    if (!drugName || !sectionKey) {
      return true;
    }
    const normalizedDrug = normalizeDrugName(String(drugName));
    const normalizedSection = String(sectionKey).toLowerCase();

    if (!seenDrugSections.has(normalizedDrug)) {
      seenDrugSections.set(normalizedDrug, new Set());
    }

    const drugSections = seenDrugSections.get(normalizedDrug)!;
    if (drugSections.has(normalizedSection)) {
      return false;
    }
    drugSections.add(normalizedSection);
    return true;
  });

  const context = workingDocuments
    .map((doc, index) => {
      const citation = resolveEntryRange(doc.metadata);
      return `[#${index + 1}] Drug: ${
        doc.metadata?.drugName ?? 'Unknown'
      } | Entries: ${citation}\n${doc.pageContent}`;
    })
    .join('\n\n');

  const supportingDrugs = Array.from(
    new Set(
      workingDocuments
        .map((doc) => doc.metadata?.drugName)
        .filter((value): value is string => Boolean(value))
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );

  const resolvedPrimaryDrug =
    activeDrug ??
    (supportingDrugs.length ? supportingDrugs[0] : activeDrugHint);

  let response: PNFChatResponse | null = null;

  try {
    const rawResponse = await resolvedChain.invoke({
      question,
      context,
      chat_history: chatHistory.length
        ? chatHistory.join('\n')
        : 'No previous turns.',
    });
    response = rawResponse;
  } catch (error) {
    console.error('[pnf-chat] failed to parse LLM response', error);
  }

  if (!response || !response.sections) {
    return {
      response: {
        sections: { ...FALLBACK_SECTIONS },
        answer: FALLBACK_MESSAGE,
        notes: 'No structured answer returned by LLM',
      },
      primaryDrug: resolvedPrimaryDrug,
      supportingDrugs,
      usedDocuments: workingDocuments,
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

  return {
    response: {
      ...response,
      sections: filteredSections,
      answer: formattedAnswer,
    },
    primaryDrug: resolvedPrimaryDrug,
    supportingDrugs,
    usedDocuments: workingDocuments,
  };
}
