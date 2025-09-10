import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { launchBrowser } from '@/lib/launchBrowser';
import type { Browser } from 'puppeteer-core';
import { exportFormatters } from '@/lib/exporters';

interface ColumnDef {
  header: string;
  key: string;
}

interface TablePdfRequestBody {
  title: string;
  subtitle?: string;
  filename?: string; // suggested filename
  columns: ColumnDef[];
  rows: Array<Record<string, string | number>>;
  currencyKeys?: string[]; // keys to format as PHP currency
  numericKeys?: string[]; // keys to right-align (if not currency)
  landscape?: boolean;
  note?: string; // optional footer note
}

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function buildHtml(
  payload: Required<Omit<TablePdfRequestBody, 'landscape' | 'filename'>> & {
    generatedAt: string;
  },
) {
  const {
    title,
    subtitle,
    columns,
    rows,
    currencyKeys,
    numericKeys,
    note,
    generatedAt,
  } = payload;

  const headerRow = columns.map((c) => `<th>${c.header}</th>`).join('');
  const bodyRows = rows
    .map((r) => {
      const tds = columns
        .map((c) => {
          const raw = r[c.key];
          let text: string;
          if (currencyKeys.includes(c.key)) {
            text = exportFormatters.phpCurrency(raw);
          } else {
            text = raw == null ? '' : String(raw);
          }
          const isNumeric =
            currencyKeys.includes(c.key) || numericKeys.includes(c.key);
          return `<td class="${isNumeric ? 'num' : ''}">${text}</td>`;
        })
        .join('');
      return `<tr>${tds}</tr>`;
    })
    .join('');

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    body { font-family: Arial, system-ui, sans-serif; margin:32px; color:#111; }
    h1 { margin:0 0 4px; font-size:20px; }
    p.meta { margin:0 0 12px; font-size:11px; color:#555; }
    table { border-collapse: collapse; width:100%; font-size:11px; }
    th, td { border:1px solid #ccc; padding:4px 6px; }
    th { background:#f3f4f6; text-align:left; }
    td.num { text-align:right; font-variant-numeric: tabular-nums; }
    tfoot { font-size:10px; color:#555; margin-top:24px; }
  </style></head><body>
  <header>
    <h1>${title}</h1>
    <p class="meta">${
      subtitle ? subtitle + ' | ' : ''
    }Generated: ${generatedAt}</p>
  </header>
  <table>
    <thead><tr>${headerRow}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
  ${note ? `<footer><p class="meta">${note}</p></footer>` : ''}
  </body></html>`;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json()) as TablePdfRequestBody;
    if (
      !body?.title ||
      !Array.isArray(body.columns) ||
      !Array.isArray(body.rows)
    ) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const currencyKeys = body.currencyKeys ?? [];
    const numericKeys = body.numericKeys ?? [];
    const filename = sanitizeFilename(body.filename || 'table-export.pdf');

    const html = buildHtml({
      title: body.title,
      subtitle: body.subtitle ?? '',
      columns: body.columns,
      rows: body.rows,
      currencyKeys,
      numericKeys,
      note: body.note ?? '',
      generatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    });

    let browser: Browser | null = null;
    try {
      browser = await launchBrowser();
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        landscape: !!body.landscape,
        margin: { top: '20px', right: '16px', bottom: '24px', left: '16px' },
      });

      const uint8 = pdf instanceof Uint8Array ? pdf : new Uint8Array(pdf);
      return new NextResponse(
        new ReadableStream({
          start(controller) {
            controller.enqueue(uint8);
            controller.close();
          },
        }),
        {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': String(uint8.byteLength),
            'Cache-Control': 'no-store',
          },
        },
      );
    } finally {
      if (browser) await browser.close();
    }
  } catch (err) {
    console.error('table-pdf export error', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
