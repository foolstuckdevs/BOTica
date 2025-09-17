import type { Transaction, TransactionItem, Pharmacy } from '@/types';

export class PrintUtility {
  private static isPrinting = false;
  private static printCount = 0;

  static async printDynamicReceipt(
    sale: Transaction,
    items: TransactionItem[],
    pharmacy: Pharmacy,
    preOpenedWindow?: Window | null,
  ): Promise<boolean> {
    this.printCount++;
    console.log(
      `Print attempt #${this.printCount} - isPrinting: ${this.isPrinting}`,
    );

    // Prevent multiple simultaneous print calls
    if (this.isPrinting) {
      console.log('Print already in progress, skipping...');
      return false;
    }

    console.log('Starting print process...');
    this.isPrinting = true;

    try {
      const baseLines = 25; // For headers, totals, footer
      const itemLines = items.length * 4; // Rough estimate
      const contentHeight = Math.max(150, baseLines + itemLines);

      const printContent = this.generateDynamicReceipt(
        sale,
        items,
        pharmacy,
        contentHeight,
      );

      // Use a pre-opened window if provided (avoids popup blockers), else try to open now
      const printWindow =
        preOpenedWindow || window.open('', '_blank', 'width=800,height=1000');

      if (!printWindow) {
        console.warn('Could not open print window - popup may be blocked');
        this.isPrinting = false;
        return false;
      }

      try {
        printWindow.document.write(printContent);
        printWindow.document.close();
      } catch (writeError) {
        console.error('Error writing to print window:', writeError);
        printWindow.close();
        this.isPrinting = false;
        return false;
      }

      return new Promise((resolve) => {
        let hasExecuted = false;
        let timeoutId: NodeJS.Timeout | null = null;

        const executePrint = () => {
          if (hasExecuted) {
            console.log('Print already executed, skipping...');
            return;
          }
          hasExecuted = true;

          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }

          console.log('Executing print...');
          try {
            printWindow.print();
            console.log('Print dialog opened');

            setTimeout(() => {
              printWindow.close();
              console.log('Print window closed');
              this.isPrinting = false;
              resolve(true);
            }, 1500);
          } catch (printError) {
            console.error('Print execution error:', printError);
            printWindow.close();
            this.isPrinting = false;
            resolve(false);
          }
        };

        printWindow.onload = () => {
          console.log('Print window loaded, executing print...');
          executePrint();
        };

        timeoutId = setTimeout(() => {
          if (!hasExecuted) {
            console.log('Fallback timeout triggered');
            executePrint();
          }
        }, 3000);
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
    pharmacy: Pharmacy,
    contentHeight: number,
  ): string {
    const subtotal = items.reduce(
      (sum, item) => sum + parseFloat(item.unitPrice) * item.quantity,
      0,
    );
    const discountAmount = parseFloat(sale.discount ?? '0');
    const total = subtotal - discountAmount;

    return `<!DOCTYPE html>
<html>
<head>
  <title>Receipt - ${sale.invoiceNumber}</title>
  <style>
    @page {
      size: 100mm ${contentHeight}mm;
      margin: 0;
    }
    body, div, span {
      font-family: 'Courier New', monospace;
      font-size: 22px;
      font-weight: bold;
      line-height: 1.4;
      color: #000;
    }
    .header, .footer, .invoice-info, .totals, .items-container {
      font-size: 22px;
    }
    .temp-receipt {
      font-size: 20px !important;
      font-weight: bold !important;
      text-transform: uppercase;
    }
    .pharmacy-name {
      font-size: 26px !important;
    }
    .pharmacy-info {
      font-size: 20px !important;
      font-weight: bold !important;
      color: #000 !important;
    }
    .invoice-number {
      font-size: 24px !important;
    }
    .item-main {
      font-size: 22px !important;
    }
    .item-details {
      font-size: 20px !important;
      font-weight: bold !important;
      color: #000 !important;
    }
    .total-row {
      font-size: 22px !important;
    }
    .total-main {
      font-size: 26px !important;
      font-weight: bold !important;
      border-top: 2px solid #000;
      border-bottom: 2px solid #000;
    }
    .footer {
      font-size: 22px !important;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="pharmacy-name">${pharmacy.name}</div>
    <div class="pharmacy-info">${pharmacy.address ?? ''}</div>
    <div class="pharmacy-info">${pharmacy.phone ?? ''}</div>
  </div>

  <div class="temp-receipt">TEMPORARY RECEIPT</div>

  <div class="divider"></div>

  <div class="invoice-info">
    <div class="invoice-number">RECEIPT #${sale.invoiceNumber}</div>
    <div>${new Date(sale.createdAt).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })}</div>
    <div>Cashier: ${sale.user?.fullName || 'Unknown'}</div>
  </div>

  <div class="divider"></div>

  <div class="items-container">
    ${items
      .map(
        (item, index) => `
      <div class="item">
        <div class="item-main">
          <span>${index + 1}. ${item.productName}</span>
          <span>₱${(parseFloat(item.unitPrice) * item.quantity).toFixed(
            2,
          )}</span>
        </div>
        <div class="item-details">
          <span>${item.quantity} × ₱${parseFloat(item.unitPrice).toFixed(
          2,
        )}</span>
          <span>Subtotal: ₱${(
            parseFloat(item.unitPrice) * item.quantity
          ).toFixed(2)}</span>
        </div>
      </div>
    `,
      )
      .join('')}
  </div>

  <div class="divider"></div>

  <div class="totals">
    <div class="total-row">
      <span>Subtotal:</span>
      <span>₱${subtotal.toFixed(2)}</span>
    </div>
    ${
      discountAmount > 0
        ? `
      <div class="total-row">
        <span>Discount:</span>
        <span>-₱${discountAmount.toFixed(2)}</span>
      </div>`
        : ''
    }
    <div class="total-row total-main">
      <span>TOTAL:</span>
      <span>₱${total.toFixed(2)}</span>
    </div>
    
    <div class="payment-info">
      <div class="total-row">
        <span>Cash Received:</span>
        <span>₱${parseFloat(sale.amountReceived?.toString() ?? '0').toFixed(
          2,
        )}</span>
      </div>
      <div class="total-row">
        <span>Change:</span>
        <span>₱${parseFloat(sale.changeDue?.toString() ?? '0').toFixed(
          2,
        )}</span>
      </div>
    </div>
  </div>

  <div class="divider"></div>

  <div class="footer">
    <div>Thank you for your purchase!</div>
    <div style="margin: 2mm 0;">Visit us again soon!</div>
    <div>${new Date().toLocaleString()}</div>
  </div>
</body>
</html>`;
  }
}
