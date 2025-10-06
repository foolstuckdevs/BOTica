import type { PNFChunkMetadata } from '@/lib/rag/types';

function uniqueSortedNumbers(values: number[]): number[] {
  return Array.from(new Set(values)).sort((a, b) => a - b);
}

export function resolveEntryRange(
  metadata?: (Partial<PNFChunkMetadata> & Record<string, unknown>) | null,
): string {
  if (!metadata) {
    return 'Unknown';
  }

  const raw =
    typeof metadata.entryRange === 'string' && metadata.entryRange.trim().length
      ? metadata.entryRange.trim()
      : '';

  if (raw) {
    return raw;
  }

  const sourceEntries = Array.isArray(metadata.sourceEntries)
    ? metadata.sourceEntries
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value))
    : [];

  if (sourceEntries.length) {
    const sorted = uniqueSortedNumbers(sourceEntries);
    if (sorted.length === 1) {
      return `${sorted[0]}`;
    }
    return `${sorted[0]}-${sorted[sorted.length - 1]}`;
  }

  const fallbackEntry =
    metadata.entryNumber ??
    metadata.entryIndex ??
    metadata.pageNumber ??
    metadata.pageRange;

  if (typeof fallbackEntry === 'number' && Number.isFinite(fallbackEntry)) {
    return `${fallbackEntry}`;
  }

  if (typeof fallbackEntry === 'string' && fallbackEntry.trim().length) {
    return fallbackEntry.trim();
  }

  return 'Unknown';
}
