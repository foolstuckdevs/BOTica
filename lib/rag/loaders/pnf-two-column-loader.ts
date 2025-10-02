import path from 'node:path';
import { promises as fs } from 'node:fs';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import type { DocumentInterface } from '@langchain/core/documents';
import { normalizeWhitespace } from '../utils/text';

export interface PNFTwoColumnLoaderOptions {
  splitPages?: boolean;
  ensureEvenColumns?: boolean;
}

export class PNFTwoColumnLoader {
  constructor(
    private readonly filePath: string,
    private readonly options: PNFTwoColumnLoaderOptions = {},
  ) {}

  async load(): Promise<DocumentInterface[]> {
    const resolvedPath = path.isAbsolute(this.filePath)
      ? this.filePath
      : path.resolve(process.cwd(), this.filePath);

    await fs.access(resolvedPath);

    const loader = new PDFLoader(resolvedPath, {
      splitPages: this.options.splitPages ?? true,
      parsedItemSeparator: '\n',
    });

    const docs = await loader.load();

    return docs.map((doc) => ({
      ...doc,
      pageContent: this.normalizePage(doc.pageContent),
      metadata: {
        ...doc.metadata,
        pageNumber: doc.metadata?.loc?.pageNumber ?? doc.metadata?.pageNumber,
      },
    }));
  }

  private normalizePage(text: string): string {
    const sanitized = text.replace(/\u00A0/g, ' ').replace(/[\t\f\r]+/g, ' ');

    if (!this.options.ensureEvenColumns) {
      return this.postProcessText(sanitized);
    }

    const rawLines = sanitized
      .split('\n')
      .map((line) => line.replace(/\s+$/g, ''));

    const columnBoundary = this.estimateColumnBoundary(rawLines);

    if (!columnBoundary) {
      return this.postProcessText(sanitized);
    }

    const left: string[] = [];
    const right: string[] = [];

    for (const line of rawLines) {
      const trimmed = line.trim();
      if (!trimmed) {
        left.push('');
        right.push('');
        continue;
      }

      const leftSlice = line.slice(0, columnBoundary).trim();
      const rightSlice = line.slice(columnBoundary).trim();

      if (leftSlice) {
        left.push(leftSlice);
      }

      if (rightSlice) {
        right.push(rightSlice);
      }

      if (!leftSlice && !rightSlice) {
        left.push(trimmed);
      }
    }

    const leftColumn = normalizeWhitespace(left.join('\n'));
    const rightColumn = normalizeWhitespace(right.join('\n'));

    const segments = [leftColumn, rightColumn].filter(Boolean);
    if (!segments.length) {
      return this.postProcessText(sanitized);
    }

    return this.postProcessText(segments.join('\n'));
  }

  private estimateColumnBoundary(lines: string[]): number | null {
    const gaps: number[] = [];

    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }

      for (const match of line.matchAll(/\s{6,}/g)) {
        const index = match.index ?? 0;
        if (index < 10) {
          continue;
        }

        const midpoint = index + Math.floor(match[0].length / 2);
        gaps.push(midpoint);
        break;
      }
    }

    if (!gaps.length) {
      return null;
    }

    gaps.sort((a, b) => a - b);
    return gaps[Math.floor(gaps.length / 2)];
  }

  private postProcessText(raw: string): string {
    let text = normalizeWhitespace(raw);

    if (!text) {
      return text;
    }

    text = text
      .replace(/([\p{L}\p{N}])-\s*\n([\p{L}\p{N}])/gu, '$1$2')
      .replace(/([a-z0-9,;:])\n([a-z0-9])/giu, '$1 $2')
      .replace(/([a-z0-9])\n(\()/giu, '$1 $2')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return text;
  }
}
