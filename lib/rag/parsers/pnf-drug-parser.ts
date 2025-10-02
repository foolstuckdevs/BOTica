import { compactSpaces, normalizeWhitespace } from '@/lib/rag/utils/text';
import type { DocumentInterface } from '@langchain/core/documents';
import { v4 as uuid } from 'uuid';
import type { PNFDrugEntry, PNFSectionKey, PNFRawChunk } from '@/lib/rag/types';

const SECTION_PATTERNS: Record<PNFSectionKey, RegExp[]> = {
  indications: [/Indication[s]?/i, /Clinical Use[s]?/i],
  contraindications: [/Contraindication[s]?/i],
  dosage: [/Dose/i, /Dosage/i],
  doseAdjustment: [/Dose Adjustment/i, /Dosage Adjustment/i],
  precautions: [/Precaution[s]?/i, /Warning[s]?/i],
  adverseReactions: [/Adverse (?:Drug )?Reaction[s]?/i, /Side Effect[s]?/i],
  drugInteractions: [/Drug Interaction[s]?/i, /Interaction[s]?/i],
  administration: [/Administration/i, /Route/i],
  formulations: [/Formulation[s]?/i, /Presentation/i],
};

export interface ParseDrugEntriesOptions {
  minimumLength?: number;
}

const ENTRY_ANCHOR = /\b(?:Rx|OTC)\b/i;
const DRUG_NAME_PATTERN =
  /(?:Rx|OTC)(?:\s*\([^\n]+\))?\s*\n\s*([A-Z0-9][A-Z0-9\s\-\(\)\/\+]+)\s*/i;

interface WorkingEntry {
  drugName: string;
  startPage: number;
  endPage: number;
  chunks: string[];
  classification: 'Rx' | 'OTC' | 'Unknown';
}

export function parseDrugEntries(
  documents: DocumentInterface[],
  options: ParseDrugEntriesOptions = {},
): PNFDrugEntry[] {
  const sortedDocs = [...documents].sort(
    (a, b) => (a.metadata.pageNumber ?? 0) - (b.metadata.pageNumber ?? 0),
  );

  const entries: PNFDrugEntry[] = [];
  let current: WorkingEntry | null = null;

  for (const doc of sortedDocs) {
    const pageNumber = doc.metadata.pageNumber ?? 0;
    const pageContent = normalizeWhitespace(doc.pageContent);

    const segments = splitPageByEntry(pageContent);

    for (const segment of segments) {
      const anchorIndex = segment.search(ENTRY_ANCHOR);
      const hasAnchor = anchorIndex !== -1;

      if (hasAnchor) {
        if (current) {
          entries.push(finalizeEntry(current));
          current = null;
        }

        const match = segment.match(DRUG_NAME_PATTERN);
        if (!match) {
          continue;
        }

        const classification = extractClassification(segment);

        current = {
          drugName: compactSpaces(match[1]),
          startPage: pageNumber,
          endPage: pageNumber,
          chunks: [segment.replace(match[0], '').trim()],
          classification,
        };
        continue;
      }

      if (!current) {
        continue;
      }

      current.chunks.push(segment.trim());
      current.endPage = pageNumber;
    }
  }

  if (current) {
    entries.push(finalizeEntry(current));
  }

  return entries.filter(
    (entry) => entry.normalizedContent.length >= (options.minimumLength ?? 200),
  );
}

function splitPageByEntry(page: string): string[] {
  const normalized = page.replace(/\r/g, '\n');
  const segments: string[] = [];
  let buffer = '';

  const lines = normalized.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    const startsNewDrug = /^(?:Rx|OTC)\b/i.test(trimmed);

    if (startsNewDrug && buffer) {
      segments.push(buffer.trim());
      buffer = '';
    }

    buffer += `${line}\n`;
  }

  if (buffer.trim()) {
    segments.push(buffer.trim());
  }

  return segments;
}

function finalizeEntry(entry: WorkingEntry): PNFDrugEntry {
  const rawContent = entry.chunks.join('\n').trim();
  const normalizedContent = ensureTerminated(rawContent);
  const sections = extractSections(normalizedContent);
  const pregnancyCategory = extractSingleValue(
    normalizedContent,
    /Pregnancy\s*Category[:\s]+([^\n]+)/i,
  );
  const atcCode = extractSingleValue(
    normalizedContent,
    /ATC\s*Code[:\s]+([^\n]+)/i,
  );

  return {
    drugName: entry.drugName,
    rawContent,
    normalizedContent,
    sections,
    pregnancyCategory,
    atcCode,
    pageRange: {
      start: entry.startPage,
      end: entry.endPage,
    },
    classification: entry.classification,
  };
}

function ensureTerminated(content: string): string {
  const hasPregnancy = /Pregnancy\s*Category/i.test(content);
  const hasAtc = /ATC\s*Code/i.test(content);
  if (hasPregnancy || hasAtc) {
    return content;
  }
  return `${content}\n\n[Information beyond standard sections not available in source page]`;
}

function extractSections(content: string): PNFDrugEntry['sections'] {
  const sections: PNFDrugEntry['sections'] = {};
  for (const [key, patterns] of Object.entries(SECTION_PATTERNS) as [
    PNFSectionKey,
    RegExp[],
  ][]) {
    sections[key] = extractSection(content, patterns) ?? undefined;
  }
  return sections;
}

function extractSection(content: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const regex = new RegExp(
      `${pattern.source}[^\n]*\n([\s\S]*?)(?=\n[A-Z][A-Za-z\s]{3,}:|\n[A-Z]{2,}[\sA-Z]{2,}\n|$)`,
      'i',
    );
    const match = content.match(regex);
    if (match?.[1]) {
      const value = normalizeWhitespace(match[1]);
      if (value.length > 20) {
        return value;
      }
    }
  }

  return null;
}

function extractSingleValue(
  content: string,
  regex: RegExp,
): string | undefined {
  const match = content.match(regex);
  return match?.[1] ? compactSpaces(match[1]) : undefined;
}

export function toRawChunks(entries: PNFDrugEntry[]): PNFRawChunk[] {
  const chunks: PNFRawChunk[] = [];

  for (const entry of entries) {
    chunks.push({
      id: uuid(),
      content: `${entry.classification ?? 'Rx'}\n${entry.drugName}\n${
        entry.normalizedContent
      }`,
      metadata: {
        drugName: entry.drugName,
        atcCode: entry.atcCode,
        pregnancyCategory: entry.pregnancyCategory,
        sourcePages: range(entry.pageRange.start, entry.pageRange.end),
        pageRange: `${entry.pageRange.start}-${entry.pageRange.end}`,
        classification: entry.classification,
      },
    });

    for (const [section, value] of Object.entries(entry.sections)) {
      if (!value) continue;
      chunks.push({
        id: uuid(),
        content: `${entry.drugName} - ${section}\n${value}`,
        metadata: {
          drugName: entry.drugName,
          section,
          atcCode: entry.atcCode,
          pregnancyCategory: entry.pregnancyCategory,
          sourcePages: range(entry.pageRange.start, entry.pageRange.end),
          pageRange: `${entry.pageRange.start}-${entry.pageRange.end}`,
          classification: entry.classification,
        },
      });
    }
  }

  return chunks;
}

function extractClassification(segment: string): 'Rx' | 'OTC' | 'Unknown' {
  const match = segment.match(/^(Rx|OTC)\b/i);
  if (!match) {
    return 'Unknown';
  }

  const value = match[1].toUpperCase();
  return value === 'OTC' ? 'OTC' : 'Rx';
}

function range(start: number, end: number): number[] {
  const values: number[] = [];
  for (let i = start; i <= end; i += 1) {
    values.push(i);
  }
  return values;
}
