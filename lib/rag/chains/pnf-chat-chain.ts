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

type ClassificationTag = 'Rx' | 'OTC' | 'Unknown';

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

type IntentConfig = {
  key: string;
  patterns: RegExp[];
  sections: Array<keyof PNFChatSections>;
  priority: number;
};

// Intent detection patterns
const INTENT_CONFIGS: IntentConfig[] = [
  {
    key: 'dosage',
    priority: 10,
    patterns: [
      /\b(dosage|dose|dosing|posology)\b/i,
      /\bhow\s+(?:many|much)\s+(?:mg|milligrams|tablet|tablets)\b/i,
      /\bmaintenance\s+dose\b/i,
    ],
    sections: ['overview', 'dosage', 'doseAdjustment', 'administration'],
  },
  {
    key: 'doseAdjustment',
    priority: 9,
    patterns: [
      /\b(renal|hepatic|liver|kidney)\s+(?:dose|dosing|adjustment)\b/i,
      /\b(?:adjust|modify|reduce)\s+(?:the\s+)?dose\b/i,
    ],
    sections: ['overview', 'doseAdjustment', 'dosage'],
  },
  {
    key: 'indications',
    priority: 8,
    patterns: [
      /\b(indication|indications|use|uses|used for|treat|treating|therapy for)\b/i,
      /\bwhat\s+is\s+it\s+for\b/i,
    ],
    sections: ['overview', 'indications'],
  },
  {
    key: 'contraindications',
    priority: 7,
    patterns: [
      /\bcontra[\s-]?indications?\b/i,
      /\bshould\s+not\s+(?:be\s+)?(?:use|used|take|taken)\b/i,
      /\bwhen\s+not\s+(?:to\s+)?(?:use|give|take)\b/i,
      /\bcontradictions?\b/i,
    ],
    sections: ['overview', 'contraindications'],
  },
  {
    key: 'adverseReactions',
    priority: 7,
    patterns: [
      /\b(side\s+effect|side\s+effects|adverse\s+(?:reaction|reactions|effect|effects))\b/i,
      /\b(?:reaction|reactions)\s+to\s+this\s+drug\b/i,
    ],
    sections: ['overview', 'adverseReactions'],
  },
  {
    key: 'precautions',
    priority: 6,
    patterns: [
      /\b(precaution|precautions|warning|warnings|caution|cautions)\b/i,
      /\buse\s+with\s+caution\b/i,
    ],
    sections: ['overview', 'precautions'],
  },
  {
    key: 'interactions',
    priority: 6,
    patterns: [
      /\b(drug\s+)?interactions?\b/i,
      /\binteract(?:ion)?s?\s+with\b/i,
      /\bcompatible\s+with\b/i,
    ],
    sections: ['overview', 'interactions'],
  },
  {
    key: 'formulations',
    priority: 5,
    patterns: [
      /\b(formulation|formulations|available\s+form|presentation|strengths?|dosage\s+forms?)\b/i,
    ],
    sections: ['overview', 'formulations'],
  },
  {
    key: 'administration',
    priority: 4,
    patterns: [
      /\badministration\b/i,
      /\bhow\s+(?:is|to)\s+(?:give|take|administer)\b/i,
      /\broute\s+of\s+administration\b/i,
    ],
    sections: ['overview', 'administration'],
  },
  {
    key: 'monitoring',
    priority: 3,
    patterns: [
      /\bmonitor(?:ing)?\b/i,
      /\bwhat\s+to\s+monitor\b/i,
      /\bparameters?\s+to\s+check\b/i,
    ],
    sections: ['overview', 'monitoring'],
  },
  {
    key: 'pregnancy',
    priority: 2,
    patterns: [
      /\bpregnan(?:cy|t)\b/i,
      /\blactation\b/i,
      /\bbreast\s*feeding\b/i,
    ],
    sections: ['overview', 'pregnancy'],
  },
  {
    key: 'classification',
    priority: 2,
    patterns: [
      /\bclassification\b/i,
      /\b(?:rx|otc)\b/i,
      /\bover\s+the\s+counter\b/i,
    ],
    sections: ['overview', 'classification'],
  },
  {
    key: 'notes',
    priority: 1,
    patterns: [/\bnotes?\b/i, /\badditional\s+information\b/i],
    sections: ['overview', 'notes'],
  },
];

function detectIntent(question: string): Array<keyof PNFChatSections> | null {
  const normalized = question.trim();
  if (!normalized) {
    return null;
  }

  const matches = new Set<keyof PNFChatSections>();

  INTENT_CONFIGS.forEach((config) => {
    const intentMatched = config.patterns.some((pattern) =>
      pattern.test(normalized),
    );
    if (intentMatched) {
      config.sections.forEach((section) => matches.add(section));
    }
  });

  if (matches.size === 0) {
    const isBroadQuery =
      /^(tell\s+me\s+about|info\s+on|information\s+about|what\s+is|what's)?\s*[a-z0-9\s\-\+]+$/i.test(
        normalized,
      );

    return isBroadQuery ? null : null;
  }

  const ordered = SECTION_ORDER.filter((section) => matches.has(section));
  if (!ordered.includes('overview') && matches.size > 0) {
    ordered.unshift('overview');
  }

  return ordered as Array<keyof PNFChatSections>;
}

const CHAT_TO_METADATA_SECTION: Partial<Record<keyof PNFChatSections, string>> =
  {
    interactions: 'drugInteractions',
  };

function resolveMetadataSectionKey(
  section: keyof PNFChatSections,
): string | undefined {
  const mapped = CHAT_TO_METADATA_SECTION[section];
  if (mapped === null) {
    return undefined;
  }
  return mapped ?? section;
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
  'pregnancy',
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
  classification: 'Not requested',
};

function normalizeClassification(value: unknown): ClassificationTag {
  return value === 'Rx' || value === 'OTC' ? value : 'Unknown';
}

function formatClassificationDetail(classification: ClassificationTag): string {
  switch (classification) {
    case 'Rx':
      return 'Rx (prescription only).';
    case 'OTC':
      return 'OTC (over the counter).';
    default:
      return 'Unknown (OTC/Rx not specified).';
  }
}

function formatClassificationSentence(
  classification: ClassificationTag,
): string {
  return `Classification: ${formatClassificationDetail(classification)}`;
}

function enforceClassificationInOverview(
  overview: string | undefined,
  classification: ClassificationTag,
): string {
  const trimmed = overview?.trim();
  const classificationSentence = formatClassificationSentence(classification);

  if (
    !trimmed ||
    trimmed === 'Not requested' ||
    trimmed === EMPTY_SECTION_VALUE
  ) {
    return classificationSentence;
  }

  const lower = trimmed.toLowerCase();
  if (
    lower.includes('classification') ||
    (classification === 'Rx' && lower.includes('rx')) ||
    (classification === 'OTC' && lower.includes('otc')) ||
    (classification === 'Unknown' && lower.includes('unknown'))
  ) {
    return trimmed;
  }

  return `${classificationSentence} ${trimmed}`.trim();
}

function resolveClassificationFromDocuments(
  documents: DocumentInterface[],
): ClassificationTag {
  for (const doc of documents) {
    const classification = normalizeClassification(
      doc.metadata?.classification,
    );
    if (classification !== 'Unknown') {
      return classification;
    }
  }

  for (const doc of documents) {
    if (doc.metadata?.classification) {
      return normalizeClassification(doc.metadata.classification);
    }
  }

  return 'Unknown';
}

function findSectionContentInDocuments(
  documents: DocumentInterface[],
  section: keyof PNFChatSections,
  fallbackDocuments?: DocumentInterface[],
): string | null {
  const metadataKey = resolveMetadataSectionKey(section);
  if (!metadataKey) {
    return null;
  }

  const search = (docs: DocumentInterface[]) => {
    for (const doc of docs) {
      if (
        doc.metadata?.section === metadataKey &&
        typeof doc.pageContent === 'string'
      ) {
        const trimmed = doc.pageContent.trim();
        if (trimmed.length) {
          return trimmed;
        }
      }
    }
    return null;
  };

  const primary = search(documents);
  if (primary) {
    return primary;
  }

  if (fallbackDocuments?.length) {
    return search(fallbackDocuments);
  }

  return null;
}

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
      const rawName = doc.metadata?.drugName;
      if (!rawName) return false;
      const normalizedCandidate = normalizeDrugName(String(rawName));
      if (!normalizedCandidate) return false;

      if (normalizedCandidate === normalizedActive) {
        return true;
      }

      // Allow partial matches for combination products and close variants
      return (
        normalizedCandidate.includes(normalizedActive) ||
        normalizedActive.includes(normalizedCandidate)
      );
    });

    if (filtered.length) {
      workingDocuments = filtered;
    }
  }

  if (requestedSections && workingDocuments.length > 1) {
    const allowedMetadataSections = new Set<string>();
    requestedSections.forEach((sectionKey) => {
      const metadataKey = resolveMetadataSectionKey(sectionKey);
      if (metadataKey) {
        allowedMetadataSections.add(metadataKey);
      }
    });

    if (allowedMetadataSections.size) {
      const intentFiltered = workingDocuments.filter((doc) => {
        const sectionKey = doc.metadata?.section;
        if (!sectionKey) return true;
        return allowedMetadataSections.has(String(sectionKey));
      });

      if (intentFiltered.length) {
        workingDocuments = intentFiltered;
      }
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
      const classification = normalizeClassification(
        doc.metadata?.classification,
      );
      return `[#${index + 1}] Drug: ${
        doc.metadata?.drugName ?? 'Unknown'
      } | Classification: ${classification} | Entries: ${citation}\n${
        doc.pageContent
      }`;
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

  const classificationTag =
    resolveClassificationFromDocuments(workingDocuments);

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

  filteredSections.overview = enforceClassificationInOverview(
    filteredSections.overview,
    classificationTag,
  );

  const classificationDetail = formatClassificationDetail(classificationTag);
  if (requestedSections?.includes('classification')) {
    filteredSections.classification = classificationDetail;
  } else {
    filteredSections.classification = 'Not requested';
  }

  const sectionsEligibleForDocFallback: Array<keyof PNFChatSections> = [
    'adverseReactions',
    'contraindications',
    'precautions',
    'interactions',
    'dosage',
    'doseAdjustment',
    'administration',
    'indications',
    'formulations',
    'notes',
    'monitoring',
  ];

  const docFallbackTargets = requestedSections
    ? requestedSections.filter((key) =>
        sectionsEligibleForDocFallback.includes(key),
      )
    : sectionsEligibleForDocFallback;

  docFallbackTargets.forEach((sectionKey) => {
    const currentValue = filteredSections[sectionKey];
    const trimmedValue =
      typeof currentValue === 'string' ? currentValue.trim() : currentValue;
    if (
      !trimmedValue ||
      trimmedValue === EMPTY_SECTION_VALUE ||
      trimmedValue === 'Not requested'
    ) {
      const fromDocs = findSectionContentInDocuments(
        workingDocuments,
        sectionKey,
        documents,
      );
      if (fromDocs) {
        filteredSections[sectionKey] = fromDocs;
      }
    }
  });

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
