import { Document } from '@langchain/core/documents';
import { randomUUID } from 'node:crypto';

import {
  PNFChunkMetadata,
  PNFDrugEntry,
  PNFSectionKey,
  PNFRawChunk,
} from '../types';
import { normalizeWhitespace } from '../utils/text';

export interface PNFTextParserOptions {
  /**
   * Sections shorter than this threshold (after normalization) are ignored.
   */
  minSectionLength?: number;
  /**
   * Emit an overview chunk that combines the drug heading and general text.
   */
  includeOverviewChunk?: boolean;
}

const DEFAULT_OPTIONS: Required<PNFTextParserOptions> = {
  minSectionLength: 120,
  includeOverviewChunk: true,
};

const SECTION_MINIMUM_LENGTHS: Partial<Record<PNFSectionKey, number>> = {
  indications: 60,
  contraindications: 60,
  dosage: 40,
  doseAdjustment: 40,
  precautions: 60,
  adverseReactions: 60,
  drugInteractions: 60,
  administration: 40,
  formulations: 60,
};

type DraftEntry = {
  drugName: string;
  classification: 'Rx' | 'OTC' | 'Unknown';
  pregnancyCategory?: string;
  atcCode?: string;
  startEntry: number;
  endEntry: number;
  generalLines: string[];
  sectionLines: Partial<Record<PNFSectionKey, string[]>>;
};

const SECTION_PATTERNS: Array<{ key: PNFSectionKey; expressions: RegExp[] }> = [
  {
    key: 'formulations',
    expressions: [
      /^formulations?(?:\s*available)?$/i,
      /^dosage\s+forms?$/i,
      /^available\s+formulations?$/i,
      /^presentations?$/i,
    ],
  },
  {
    key: 'indications',
    expressions: [
      /^indications?(?:\s+and\s+uses?)?$/i,
      /^therapeutic\s+indications?$/i,
      /^uses$/i,
    ],
  },
  {
    key: 'contraindications',
    expressions: [
      /^contra\s*-?indications?$/i,
      /^contraindications?$/i,
      /^when\s+not\s+to\s+use$/i,
    ],
  },
  {
    key: 'dosage',
    expressions: [
      /^dosage(?:\s+and\s+administration)?$/i,
      /^dose$/i,
      /^dosing$/i,
      /^recommended\s+dosage$/i,
    ],
  },
  {
    key: 'doseAdjustment',
    expressions: [
      /^dose(?:\s+)?adjustments?$/i,
      /^dose\s+modifications?$/i,
      /^ren(al|al impairment)/i,
    ],
  },
  {
    key: 'precautions',
    expressions: [
      /^precautions?$/i,
      /^warnings?/i,
      /^special\s+precautions?$/i,
    ],
  },
  {
    key: 'adverseReactions',
    expressions: [
      /^adverse\s+(drug\s+)?reactions?$/i,
      /^side\s+effects?$/i,
      /^undesirable\s+effects?$/i,
    ],
  },
  {
    key: 'drugInteractions',
    expressions: [/^drug\s+interactions?$/i, /^interactions?$/i],
  },
  {
    key: 'administration',
    expressions: [
      /^administration$/i,
      /^how\s+to\s+take$/i,
      /^directions?\s+for\s+use$/i,
    ],
  },
];

export class PNFTextParser {
  private readonly options: Required<PNFTextParserOptions>;

  constructor(options: PNFTextParserOptions = {}) {
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
    };
  }

  parse(documents: Document[]): PNFDrugEntry[] {
    const entries: PNFDrugEntry[] = [];

    documents.forEach((document, index) => {
      const content = String(document.pageContent ?? '').trim();
      if (!content) {
        return;
      }

      const lines = content.split('\n');
      const { headingText, nextIndex } = this.extractHeading(lines);
      const drugName = this.deriveDrugName(headingText) || `Entry ${index + 1}`;
      const classification = this.deriveClassification(headingText, content);

      const draft: DraftEntry = {
        drugName,
        classification,
        startEntry: Number(document.metadata?.entryIndex ?? index) + 1,
        endEntry: Number(document.metadata?.entryIndex ?? index) + 1,
        generalLines: [drugName],
        sectionLines: {},
      };

      this.processBodyLines(lines.slice(nextIndex), draft);

      const entry = this.finalizeEntry(draft);
      entries.push(entry);
    });

    return entries;
  }

  toRawChunks(entries: PNFDrugEntry[]): PNFRawChunk[] {
    return entries.flatMap((entry) => this.entryToChunks(entry));
  }

  private extractHeading(lines: string[]) {
    const headingLines: string[] = [];
    let index = 0;

    while (index < lines.length) {
      const rawLine = lines[index];
      const trimmed = rawLine.trim();

      if (!trimmed) {
        if (headingLines.length === 0) {
          index += 1;
          continue;
        }
        index += 1;
        break;
      }

      if (/^-{3,}$/.test(trimmed)) {
        index += 1;
        continue;
      }

      headingLines.push(trimmed.replace(/\s+/g, ' '));

      if (headingLines.length >= 3) {
        index += 1;
        break;
      }

      index += 1;
    }

    const headingText = headingLines.join(' ').trim();

    return { headingText, nextIndex: index };
  }

  private deriveDrugName(headingText: string): string {
    if (!headingText) {
      return '';
    }

    const withoutTags = headingText
      .replace(/\b(?:OTC|Rx)\b/gi, ' ')
      .replace(/\([^)]*\)/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return withoutTags.toUpperCase();
  }

  private deriveClassification(
    headingText: string,
    fullContent: string,
  ): 'Rx' | 'OTC' | 'Unknown' {
    const haystack = `${headingText}\n${fullContent}`.toLowerCase();

    if (haystack.includes('rx')) {
      return 'Rx';
    }

    if (haystack.includes('otc')) {
      return 'OTC';
    }

    return 'Unknown';
  }

  private processBodyLines(lines: string[], draft: DraftEntry) {
    let currentSection: PNFSectionKey | null = null;

    lines.forEach((line) => {
      const trimmed = line.trim();
      const normalizedHeading = trimmed
        .replace(/:.*$/, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (!trimmed) {
        this.pushLine(draft, currentSection, '');
        return;
      }

      if (this.captureMetadata(draft, trimmed)) {
        return;
      }

      const sectionKey = this.detectSection(normalizedHeading);

      if (sectionKey) {
        currentSection = sectionKey;
        const remainder = trimmed.includes(':')
          ? trimmed.slice(trimmed.indexOf(':') + 1).trim()
          : '';
        if (remainder) {
          this.pushLine(draft, currentSection, remainder);
        }
        return;
      }

      this.pushLine(draft, currentSection, trimmed);
    });
  }

  private captureMetadata(draft: DraftEntry, line: string): boolean {
    if (!draft.pregnancyCategory) {
      const pregnancyMatch = line.match(
        /pregnancy\s*category\s*[:\-]\s*([A-Z\/]*)/i,
      );
      if (pregnancyMatch && pregnancyMatch[1]) {
        draft.pregnancyCategory = pregnancyMatch[1].trim().toUpperCase();
        return true;
      }
    }

    if (!draft.atcCode) {
      const atcMatch = line.match(/ATC\s*code\s*[:\-]\s*([A-Z0-9\.\-]+)/i);
      if (atcMatch && atcMatch[1]) {
        draft.atcCode = atcMatch[1].trim().toUpperCase();
        return true;
      }
    }

    return false;
  }

  private detectSection(candidate: string): PNFSectionKey | null {
    if (!candidate) {
      return null;
    }

    for (const { key, expressions } of SECTION_PATTERNS) {
      if (expressions.some((expression) => expression.test(candidate))) {
        return key;
      }
    }

    return null;
  }

  private pushLine(
    draft: DraftEntry,
    section: PNFSectionKey | null,
    line: string,
  ) {
    if (section) {
      if (!draft.sectionLines[section]) {
        draft.sectionLines[section] = [];
      }
      draft.sectionLines[section]!.push(line);
    } else {
      draft.generalLines.push(line);
    }
  }

  private finalizeEntry(draft: DraftEntry): PNFDrugEntry {
    const sections: Partial<Record<PNFSectionKey, string>> = {};

    (Object.entries(draft.sectionLines) as [PNFSectionKey, string[]][]).forEach(
      ([key, lines]) => {
        const normalized = normalizeWhitespace(lines.join('\n'));
        const threshold =
          SECTION_MINIMUM_LENGTHS[key] ?? this.options.minSectionLength;
        if (normalized.length >= threshold) {
          sections[key] = normalized;
        }
      },
    );

    const rawContent = normalizeWhitespace(
      [draft.drugName, ...draft.generalLines.filter(Boolean), '']
        .concat(...Object.values(draft.sectionLines))
        .filter(Boolean)
        .join('\n'),
    );

    const normalizedContent = normalizeWhitespace(
      draft.generalLines.join('\n'),
    );

    return {
      drugName: draft.drugName,
      rawContent,
      normalizedContent,
      sections,
      pregnancyCategory: draft.pregnancyCategory,
      atcCode: draft.atcCode,
      entryRange: {
        start: draft.startEntry,
        end: draft.endEntry,
      },
      classification: draft.classification,
    };
  }

  private entryToChunks(entry: PNFDrugEntry): PNFRawChunk[] {
    const metadata: PNFChunkMetadata = {
      drugName: entry.drugName,
      entryRange: this.formatEntryRange(
        entry.entryRange.start,
        entry.entryRange.end,
      ),
      sourceEntries: this.expandEntryRange(
        entry.entryRange.start,
        entry.entryRange.end,
      ),
      pregnancyCategory: entry.pregnancyCategory,
      atcCode: entry.atcCode,
      classification: entry.classification,
    };

    const chunks: PNFRawChunk[] = [];

    if (this.options.includeOverviewChunk && entry.normalizedContent.length) {
      chunks.push({
        id: randomUUID(),
        content: entry.normalizedContent,
        metadata,
      });
    }

    (Object.entries(entry.sections) as [PNFSectionKey, string][]).forEach(
      ([section, content]) => {
        chunks.push({
          id: randomUUID(),
          content,
          metadata: {
            ...metadata,
            section,
          },
        });
      },
    );

    return chunks;
  }

  private expandEntryRange(start: number, end: number): number[] {
    const safeStart = Number.isFinite(start) ? start : end;
    const safeEnd = Number.isFinite(end) ? end : safeStart;

    if (!safeStart || !safeEnd) {
      return [];
    }

    const result: number[] = [];
    for (
      let value = Math.min(safeStart, safeEnd);
      value <= Math.max(safeStart, safeEnd);
      value += 1
    ) {
      result.push(value);
    }
    return result;
  }

  private formatEntryRange(start: number, end: number): string {
    if (!Number.isFinite(start) && !Number.isFinite(end)) {
      return '';
    }

    if (start === end) {
      return `${start}`;
    }

    return `${Math.min(start, end)}-${Math.max(start, end)}`;
  }
}
