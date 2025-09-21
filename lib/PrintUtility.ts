// PrintUtility.ts
// POS-style receipt printing (browser)

export type TransactionItem = {
  productId?: string;
  productName: string;
  unitPrice: string;
  quantity: number;
};

export type UserInfo = {
  id?: string;
  fullName?: string;
};

export type Transaction = {
  invoiceNumber: string;
  createdAt: string | number | Date;
  discount?: string;
  amountReceived?: number | string;
  changeDue?: number | string;
  user?: UserInfo;
};

export type Pharmacy = {
  name: string;
  address?: string;
  phone?: string;
  tin?: string;
};

export class PrintUtility {
  private static isPrinting = false;
  private static printCount = 0;

  static async printDynamicReceipt(
    sale: Transaction,
    items: TransactionItem[],
    pharmacy: Pharmacy, // unused, since header is hardcoded
    preOpenedWindow?: Window | null,
  ): Promise<boolean> {
    this.printCount++;
    if (this.isPrinting) return false;
    this.isPrinting = true;

    try {
      const baseLines = 25;
      const itemLines = items.length * 4;
      const contentHeight = Math.max(150, baseLines + itemLines);

      const printContent = this.generateDynamicReceipt(sale, items, contentHeight);

      const printWindow =
        preOpenedWindow || window.open('', '_blank', 'width=800,height=1000');

      if (!printWindow) {
        this.isPrinting = false;
        return false;
      }

      printWindow.document.open();
      printWindow.document.write(printContent);
      printWindow.document.close();

      return new Promise((resolve) => {
        let finished = false;
        const finish = (ok: boolean) => {
          if (!finished) {
            finished = true;
            try {
              printWindow.close();
            } catch {}
            this.isPrinting = false;
            resolve(ok);
          }
        };

        printWindow.onload = () => {
          try {
            printWindow.focus();
            printWindow.print();
            setTimeout(() => finish(true), 1500);
          } catch {
            finish(false);
          }
        };

        setTimeout(() => finish(true), 3000);
      });
    } catch (error) {
      console.error('Print error:', error);
      this.isPrinting = false;
      return false;
    }
  }

  private static generateDynamicReceipt(
    sale: Transaction,
    items: TransactionItem[],
    contentHeight: number,
  ): string {
    const parseNumber = (v: any) => {
      const n = typeof v === 'number' ? v : parseFloat(String(v ?? '0'));
      return isNaN(n) ? 0 : n;
    };

    const subtotal = items.reduce(
      (sum, item) => sum + parseNumber(item.unitPrice) * (item.quantity ?? 0),
      0,
    );

    const discountAmount = parseNumber(sale.discount ?? '0');
    const total = subtotal - discountAmount;
    const amountReceived = parseNumber(sale.amountReceived ?? '0');
    const change = parseNumber(sale.changeDue ?? amountReceived - total);

    const formatCurrency = (n: number) =>
      `₱${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

    const safe = (v: any) =>
      v == null
        ? ''
        : String(v)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;');

    const createdAt = new Date(sale.createdAt ?? Date.now());
    const createdAtStr = createdAt.toLocaleString('en-PH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    const itemsHtml = items
      .map((item) => {
        const lineTotal = parseNumber(item.unitPrice) * (item.quantity ?? 0);
        return `
          <div class="item-row">
            <div class="item-left">
              <div class="item-title">${safe(item.productName)}</div>
              <div class="item-meta">${item.quantity} × ${formatCurrency(
          parseNumber(item.unitPrice),
        )}</div>
            </div>
            <div class="item-right">${formatCurrency(lineTotal)}</div>
          </div>`;
      })
      .join('');

    return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Receipt - ${safe(sale.invoiceNumber)}</title>
<style>
.divider {
  border-top: 1px dashed #000;
  margin: 2mm 0;
}

  @page { size: 100mm ${contentHeight}mm; margin: 0; }
  body { font-family: 'Courier New', monospace; font-size: 22px; margin: 0; padding: 4mm; }
  .header { text-align: center; margin-bottom: 4mm; }
  .pharmacy-name { font-size: 26px; font-weight: bold; }
  .pharmacy-info { font-size: 20px; }
  .divider { border-top: 1px dashed #000; margin: 2mm 0; }
  .invoice-info { margin-bottom: 4mm; }
  .item-row { display: flex; justify-content: space-between; margin-bottom: 2mm; }
  .item-left { max-width: 65mm; }
  .item-title { font-weight: bold; }
  .item-meta { font-size: 20px; }
  .item-right { text-align: right; min-width: 28mm; }
  .totals { margin-top: 4mm; }
  .total-row { display: flex; justify-content: space-between; margin: 2mm 0; }
  .total-main { font-size: 24px; font-weight: bold; border-top: 2px solid #000; border-bottom: 2px solid #000; }
  .footer { text-align: center; margin-top: 6mm; font-size: 20px; }
</style>
</head>
<body>
  <div class="header">
   <div class="divider">----------------------------------------</div>

    <div class="pharmacy-name"><h1>PHARMACIA DULNUAN</h1></div>
    <div class="pharmacy-info">Kasibu Nueva Vizcaya Purok 5</div>
    <div class="pharmacy-info">Tel: (074) 123-4567 / Mobile: 0917-123-4567</div>
    <div class="pharmacy-info">TIN: 123-456-789-000</div>
    <div class="pharmacy-info">VAT Reg TIN: 123-456-789-001</div>
    <div class="pharmacy-info">Permit No: 2025-123456789</div>
  </div>

  <div class="divider"></div>

  <div class="invoice-info">
    <div>Receipt #: ${safe(sale.invoiceNumber)}</div>
    <div>Date: ${safe(createdAtStr)}</div>
    <div>Cashier: ${safe(sale.user?.fullName ?? 'Unknown')}</div>
  </div>

  <div class="divider"></div>

  <div class="items">${itemsHtml}</div>

  <div class="divider"></div>

  <div class="totals">
    <div class="total-row"><span>Subtotal:</span><span>${formatCurrency(subtotal)}</span></div>
    ${
      discountAmount > 0
        ? `<div class="total-row"><span>Discount:</span><span>- ${formatCurrency(discountAmount)}</span></div>`
        : ''
    }
    <div class="total-row total-main"><span>TOTAL:</span><span>${formatCurrency(total)}</span></div>
    <div class="total-row"><span>Cash:</span><span>${formatCurrency(amountReceived)}</span></div>
    <div class="total-row"><span>Change:</span><span>${formatCurrency(change)}</span></div>
  </div>

  <div class="divider"></div>

  <div class="footer">
    <div>*** Thank you for your purchase! ***</div>
    <div>Please come again.</div>
  </div>
</body>
</html>`;
  }
}
