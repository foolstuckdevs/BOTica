export function normalizeWhitespace(value: string): string {
  const normalized = value
    .replace(/\u00A0/g, ' ')
    .replace(/[\t\f\r]+/g, ' ')
    .split('\n')
    .map((line) => line.replace(/\s+$/g, '').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return repairNumericArtifacts(normalized);
}

export function compactSpaces(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function repairNumericArtifacts(text: string): string {
  let result = text;

  // Join split numeric ranges (e.g., "80\n-85" or "1\n–2")
  result = result.replace(
    /(\d+)\s*(?:\r?\n)+\s*([–-])\s*(?:\r?\n)+\s*(\d+)/g,
    '$1$2$3',
  );

  // Remove stray line breaks immediately before or after range delimiters
  result = result.replace(/(\d+)\s*(?:\r?\n)+\s*([–-])/g, '$1$2');
  result = result.replace(/([–-])\s*(?:\r?\n)+\s*(\d+)/g, '$1$2');

  // Join unit annotations split by line breaks (e.g., "100\nmg")
  result = result.replace(
    /(\d+)\s*(?:\r?\n)+\s*(mg|mcg|g|kg|iu|units?|drops?|ml|l|hours?|hrs?|times|tablets?|capsules?)/gi,
    '$1 $2',
  );

  return result;
}
