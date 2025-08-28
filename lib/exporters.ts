import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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

export function exportToPDF(opts: {
  title: string;
  subtitle?: string;
  tables: ExportTable[];
  filename?: string;
  orientation?: 'portrait' | 'landscape';
}): void {
  const {
    title,
    subtitle,
    tables,
    filename = 'export.pdf',
    orientation = 'landscape',
  } = opts;
  const doc = new jsPDF({ orientation, unit: 'pt', format: 'a4' });
  const marginX = 40;
  const startY = 40;

  doc.setFontSize(16);
  doc.text(title, marginX, startY);
  doc.setFontSize(10);
  if (subtitle) {
    doc.text(subtitle, marginX, startY + 14);
  }
  const generatedAt = new Date().toISOString().slice(0, 16).replace('T', ' ');
  doc.text(`Generated: ${generatedAt}`, marginX, startY + (subtitle ? 28 : 16));

  let y = startY + (subtitle ? 42 : 30);
  tables.forEach((t, idx) => {
    const head = [t.columns.map((c) => c.header)];
    const body = t.rows.map((r) =>
      t.columns.map((c) =>
        c.formatter
          ? c.formatter(r[c.key], r)
          : (r[c.key] as string | number | undefined) ?? '',
      ),
    );

    autoTable(doc, {
      startY: y,
      head,
      body,
      styles: { fontSize: 9 },
      margin: { left: marginX, right: marginX },
      headStyles: {
        fillColor: idx % 2 === 0 ? [59, 130, 246] : [16, 185, 129],
      },
      didDrawPage: () => {
        // Footer
        const pageSize = doc.internal.pageSize as unknown as {
          getHeight(): number;
          getWidth(): number;
        };
        const pageHeight = pageSize.getHeight();
        const pageWidth = pageSize.getWidth();
        doc.setFontSize(9);
        const numPages =
          (
            doc as unknown as { internal: { getNumberOfPages?: () => number } }
          ).internal.getNumberOfPages?.() ?? 1;
        doc.text(`Page ${numPages}`, pageWidth - marginX, pageHeight - 20, {
          align: 'right',
        });
      },
    });
    const last = (doc as unknown as { lastAutoTable?: { finalY: number } })
      .lastAutoTable;
    y = (last?.finalY ?? y) + 24;
  });

  doc.save(filename);
}

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
