// Utility for composing standardized filter subtitles for exports
// Example output: Status=critical | Category=Vitamins | Search="paracetamol"
// If no active filters, returns 'All'
export function buildFilterSubtitle(
  parts: Array<[string, string | null | undefined | false]>,
  options?: { searchTerm?: string | null | undefined },
): string {
  const { searchTerm } = options || {};
  const tokens: string[] = [];
  for (const [label, value] of parts) {
    if (!value) continue;
    if (value === 'all') continue; // treat 'all' as not a restrictive filter
    tokens.push(`${label}=${value}`);
  }
  if (searchTerm && searchTerm.trim() !== '') {
    tokens.push(`Search="${searchTerm.trim()}"`);
  }
  return tokens.length ? tokens.join(' | ') : 'All';
}
