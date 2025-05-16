// @returns Formatted date string (e.g., "Jun 15, 2023" or "Jun 15, 2023 2:30 PM")

export const formatDate = (
  date: Date | string | number | null | undefined,
  includeTime: boolean = false,
): string => {
  if (!date) return 'N/A';

  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid Date';

  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(includeTime && {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }),
  };

  return d.toLocaleString('en-US', options);
};
