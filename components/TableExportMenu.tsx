'use client';
import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FileDown, Loader2 } from 'lucide-react';
import {
  exportToExcel,
  exportFormatters,
  type ExportTable,
} from '@/lib/exporters';

export interface TableExportColumn {
  header: string;
  key: string;
  currency?: boolean;
  numeric?: boolean; // right align
  formatter?: (value: unknown, row: Record<string, unknown>) => string | number;
}

interface TableExportMenuProps {
  title: string;
  subtitle?: string;
  /** Optional dynamic subtitle (e.g., active filters). If provided it will be appended or used instead of the static subtitle */
  dynamicSubtitle?: string;
  filenameBase: string; // without extension
  columns: TableExportColumn[];
  rows: Array<Record<string, unknown>>;
  landscape?: boolean;
  size?: 'sm' | 'default';
  align?: 'end' | 'start';
  /** Optional override to supply multiple Excel sheets (if provided, columns/rows used only for PDF) */
  excelSheets?: ExportTable[];
  /** Sheet name for the default single-sheet Excel export */
  sheetName?: string;
}

export function TableExportMenu({
  title,
  subtitle,
  dynamicSubtitle,
  filenameBase,
  columns,
  rows,
  landscape = true,
  size = 'sm',
  align = 'end',
  excelSheets,
  sheetName,
}: TableExportMenuProps) {
  const [loading, setLoading] = React.useState<'pdf' | 'excel' | null>(null);

  const effectiveSubtitle = React.useMemo(() => {
    if (dynamicSubtitle && subtitle) {
      // Combine with a separator so both contexts appear in PDF header
      return `${subtitle} • ${dynamicSubtitle}`;
    }
    return dynamicSubtitle || subtitle || undefined;
  }, [subtitle, dynamicSubtitle]);

  const handlePDF = async () => {
    setLoading('pdf');
    try {
      const cols = columns.map((c) => ({ header: c.header, key: c.key }));
      const currencyKeys = columns.filter((c) => c.currency).map((c) => c.key);
      const numericKeys = columns
        .filter((c) => c.numeric && !c.currency)
        .map((c) => c.key);
      const res = await fetch('/api/exports/table-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          subtitle: effectiveSubtitle,
          filename: `${filenameBase}.pdf`,
          columns: cols,
          rows,
          currencyKeys,
          numericKeys,
          landscape,
        }),
      });
      if (!res.ok) throw new Error('PDF export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filenameBase}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('Failed to export PDF');
    } finally {
      setLoading(null);
    }
  };

  const handleExcel = () => {
    setLoading('excel');
    try {
      if (excelSheets && excelSheets.length > 0) {
        exportToExcel({
          filename: `${filenameBase}.xlsx`,
          sheets: excelSheets,
        });
      } else {
        const table: ExportTable = {
          name: (sheetName || title).substring(0, 30),
          columns: columns.map((c) => ({
            header: c.header,
            key: c.key,
            formatter: c.currency
              ? (v) => exportFormatters.phpCurrency(v as number)
              : c.formatter
              ? (v, row) => c.formatter!(v, row ?? {})
              : undefined,
          })),
          rows: rows as Array<Record<string, unknown>>,
        };
        exportToExcel({ filename: `${filenameBase}.xlsx`, sheets: [table] });
      }
    } finally {
      setLoading(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={size}
          className={size === 'sm' ? 'h-8 px-2.5 gap-2' : 'gap-2'}
          disabled={!!loading}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileDown className="w-4 h-4" />
          )}
          <span>Export</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-40">
        <DropdownMenuItem onClick={handlePDF} disabled={loading === 'pdf'}>
          PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExcel} disabled={loading === 'excel'}>
          Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
