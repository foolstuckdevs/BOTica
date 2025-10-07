import { Document } from '@langchain/core/documents';
import { BaseDocumentLoader } from 'langchain/document_loaders/base';
import fs from 'node:fs/promises';
import path from 'node:path';

export interface PNFTextLoaderOptions {
  /**
   * Entries shorter than this length (after trimming) will be discarded.
   * Helps drop noise such as trailing dividers.
   */
  minEntryLength?: number;
  /**
   * When true, collapses runs of blank lines to a maximum of two.
   */
  collapseEmptyLines?: boolean;
}

const DEFAULT_OPTIONS: Required<PNFTextLoaderOptions> = {
  minEntryLength: 80,
  collapseEmptyLines: true,
};

export class PNFTextLoader extends BaseDocumentLoader {
  private readonly absolutePath: string;
  private readonly options: Required<PNFTextLoaderOptions>;

  constructor(filePath: string, options: PNFTextLoaderOptions = {}) {
    super();

    this.absolutePath = path.resolve(filePath);
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
    };
  }

  async load(): Promise<Document[]> {
    const raw = await fs.readFile(this.absolutePath, 'utf8');
    const normalized = this.normalize(raw);
    const segments = this.sliceEntries(normalized);

    return segments.map(
      (segment, index) =>
        new Document({
          pageContent: segment,
          metadata: {
            entryIndex: index,
            source: `${path.basename(this.absolutePath)}#${index + 1}`,
          },
        }),
    );
  }

  private normalize(raw: string): string {
    const cleaned = raw
      .replace(/\u00a0/g, ' ')
      .replace(/\r\n?/g, '\n')
      .replace(/\t/g, ' ');

    const trimmed = cleaned
      .split('\n')
      .map((line) => line.replace(/\s+$/g, ''))
      .join('\n')
      .trim();

    if (!this.options.collapseEmptyLines) {
      return trimmed;
    }

    return trimmed.replace(/\n{3,}/g, '\n\n');
  }

  private sliceEntries(content: string): string[] {
    return content
      .split(/\n\s*-{3,}\s*\n/g)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length >= this.options.minEntryLength);
  }
}
