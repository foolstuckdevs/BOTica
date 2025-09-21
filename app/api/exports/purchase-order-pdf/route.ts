import { NextRequest, NextResponse } from 'next/server';
import { launchBrowser } from '@/lib/launchBrowser';
import type { Browser } from 'puppeteer-core';
import { z } from 'zod';

const PurchaseOrderPDFSchema = z.object({
  filename: z.string().optional(),
  order: z.object({
    id: z.number(),
    orderNumber: z.string(),
    orderDate: z.string(),
    status: z.string(),
    notes: z.string().optional().nullable(),
    totalCost: z.string().optional(),
    supplierName: z.string().optional(),
    userName: z.string().optional(),
  }),
  supplier: z
    .object({
      name: z.string(),
      contactPerson: z.string(),
      phone: z.string().optional().nullable(),
      email: z.string().optional().nullable(),
      address: z.string().optional().nullable(),
    })
    .optional(),
  items: z.array(
    z.object({
      productName: z.string(),
      quantity: z.number(),
      unitCost: z.string().optional().nullable(),
      productUnit: z.string().optional().nullable(),
      brandName: z.string().optional().nullable(),
    }),
  ),
  pharmacy: z
    .object({
      name: z.string().optional(),
      address: z.string().optional(),
      phone: z.string().optional(),
    })
    .optional(),
});

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-z0-9._-]/gi, '_');
}

function buildHtml(data: z.infer<typeof PurchaseOrderPDFSchema>) {
  const pharmacy = data.pharmacy || {};
  const supplier = data.supplier;

  // Generate item rows
  const itemRows = data.items
    .map((item, index) => {
      const unitCost = parseFloat(item.unitCost || '0');
      const itemTotal = unitCost * item.quantity;

      const bgColor = index % 2 === 0 ? '#f9fafb' : '#ffffff';
      return `
      <tr style="background-color: ${bgColor};">
        <td style="padding: 8px; border: 1px solid #e5e7eb;">${
          item.productName
        }</td>
        <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">${
          item.brandName || '-'
        }</td>
        <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">${
          item.quantity
        }</td>
        <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">${
          item.productUnit || '-'
        }</td>
        <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">${
          unitCost > 0 ? `₱${unitCost.toFixed(2)}` : 'TBD'
        }</td>
        <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">${
          unitCost > 0 ? `₱${itemTotal.toFixed(2)}` : 'TBD'
        }</td>
      </tr>
    `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Purchase Order ${data.order.orderNumber}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 40px;
          color: #374151;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .header h1 {
          color: #1f2937;
          font-size: 24px;
          margin: 0;
        }
        .company-info {
          margin-bottom: 30px;
        }
        .company-info h2 {
          color: #1f2937;
          font-size: 16px;
          margin: 0 0 10px 0;
        }
        .order-details {
          border: 2px solid #e5e7eb;
          padding: 20px;
          margin: 30px 0;
          border-radius: 8px;
          background-color: #f9fafb;
        }
        .order-details h3 {
          color: #1f2937;
          margin-top: 0;
          font-size: 16px;
        }
        .detail-row {
          display: flex;
          margin-bottom: 8px;
        }
        .detail-label {
          font-weight: bold;
          min-width: 120px;
        }
        .supplier-section {
          background-color: #f3f4f6;
          padding: 15px;
          margin: 20px 0;
          border-radius: 8px;
        }
        .supplier-section h3 {
          color: #1f2937;
          margin-top: 0;
          font-size: 16px;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        .items-table th {
          background-color: #1f2937;
          color: white;
          padding: 12px 8px;
          border: 1px solid #374151;
          font-weight: bold;
        }
        .total-section {
          margin-top: 20px;
          text-align: right;
        }
        .total-amount {
          font-size: 18px;
          font-weight: bold;
          color: #1f2937;
        }
        .notes-section {
          margin-top: 30px;
          padding: 20px;
          background-color: #f9fafb;
          border-left: 4px solid #3b82f6;
        }
        .notes-section h3 {
          color: #1f2937;
          margin-top: 0;
        }
        .footer {
          margin-top: 50px;
          text-align: center;
          color: #6b7280;
          font-style: italic;
        }
        @media print {
          body { margin: 20px; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>PURCHASE ORDER</h1>
      </div>

      <div class="company-info">
        <h2>${pharmacy.name || 'BOTica Pharmacy'}</h2>
        ${pharmacy.address ? `<p>${pharmacy.address}</p>` : ''}
        ${pharmacy.phone ? `<p>Phone: ${pharmacy.phone}</p>` : ''}
      </div>

      <div class="order-details">
        <h3>Purchase Order Details</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div>
            <div class="detail-row">
              <span class="detail-label">PO Number:</span>
              <span>${data.order.orderNumber}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Date:</span>
              <span>${new Date(data.order.orderDate).toLocaleDateString(
                'en-US',
              )}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Status:</span>
              <span>${data.order.status}</span>
            </div>
            ${
              data.order.userName
                ? `
            <div class="detail-row">
              <span class="detail-label">Created By:</span>
              <span>${data.order.userName}</span>
            </div>`
                : ''
            }
          </div>
          ${
            supplier
              ? `
          <div>
            <div class="detail-row">
              <span class="detail-label">Supplier:</span>
              <span>${supplier.name}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Contact Person:</span>
              <span>${supplier.contactPerson}</span>
            </div>
            ${
              supplier.phone
                ? `
            <div class="detail-row">
              <span class="detail-label">Phone:</span>
              <span>${supplier.phone}</span>
            </div>`
                : ''
            }
            ${
              supplier.email
                ? `
            <div class="detail-row">
              <span class="detail-label">Email:</span>
              <span>${supplier.email}</span>
            </div>`
                : ''
            }
          </div>`
              : ''
          }
        </div>
      </div>

      <h3 style="color: #1f2937; margin-top: 30px;">Items</h3>
      <table class="items-table">
        <thead>
          <tr>
            <th>Product Name</th>
            <th>Brand</th>
            <th>Quantity</th>
            <th>Unit</th>
            <th>Unit Cost</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>

      ${
        data.order.totalCost && parseFloat(data.order.totalCost) > 0
          ? `
      <div class="total-section">
        <div class="total-amount">Total Amount: ₱${parseFloat(
          data.order.totalCost,
        ).toFixed(2)}</div>
      </div>`
          : ''
      }

      ${
        data.order.notes
          ? `
      <div class="notes-section">
        <h3>Notes</h3>
        <p>${data.order.notes}</p>
      </div>`
          : ''
      }

      <div class="footer">
        <p>Generated on ${new Date().toLocaleString()}</p>
        <p>Thank you for your business!</p>
      </div>
    </body>
    </html>
  `;
}

export async function POST(request: NextRequest) {
  let browser: Browser | undefined;

  try {
    const body = await request.json();
    const data = PurchaseOrderPDFSchema.parse(body);

    const filename = sanitizeFilename(
      data.filename || `purchase-order-${data.order.orderNumber}.pdf`,
    );

    // Generate HTML
    const html = buildHtml(data);

    // Launch browser and create PDF
    browser = await launchBrowser();
    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm',
      },
      printBackground: true,
    });

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('PDF export error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 },
    );
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
