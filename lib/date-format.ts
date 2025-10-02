// Deterministic, timezone-stable date formatting utilities
// Use a fixed locale and fixed timeZone to avoid SSR/CSR mismatches.

const toDate = (d: Date | string | number | null | undefined): Date | null => {
  if (!d) return null;
  return d instanceof Date ? d : new Date(d);
};

export const formatDatePH = (
  d: Date | string | number | null | undefined,
): string => {
  const dt = toDate(d);
  if (!dt) return 'N/A';
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(dt);
};

export const formatDateTimePH = (
  d: Date | string | number | null | undefined,
): string => {
  const dt = toDate(d);
  if (!dt) return 'N/A';
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(dt);
};
