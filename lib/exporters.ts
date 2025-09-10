import * as XLSX from 'xlsx';

export type ExportColumn = {
  header: string;
  key: string;
  formatter?: (
    value: unknown,
    row?: Record<string, unknown>,
  ) => string | number;
};

export type ExportTable = {
  name: string;
  columns: ExportColumn[];
  rows: Array<Record<string, unknown>>;
};

export function exportToExcel(opts: {
  filename?: string;
  sheets: ExportTable[]; // name maps to sheet name
}): void {
  const { filename = 'export.xlsx', sheets } = opts;
  const wb = XLSX.utils.book_new();
  sheets.forEach((s) => {
    // Build a plain array of objects using column mapping and formatter
    const rows = s.rows.map((r) => {
      const out: Record<string, string | number> = {};
      s.columns.forEach((c) => {
        const raw = r[c.key];
        const v = c.formatter
          ? c.formatter(raw, r)
          : (raw as string | number | undefined) ?? '';
        out[c.header] = v as string | number;
      });
      return out;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, s.name.substring(0, 31));
  });
  XLSX.writeFile(wb, filename);
}

// Common formatters
export const exportFormatters = {
  phpCurrency(value: unknown): string {
    const num = typeof value === 'number' ? value : Number(value ?? 0);
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  },
  date(value: unknown): string {
    const d = value ? new Date(String(value)) : null;
    if (!d || isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  },
};
