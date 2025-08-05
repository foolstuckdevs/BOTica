import type { Transaction, TransactionItem, Pharmacy } from '@/types';

export class PrintUtility {
  private static isPrinting = false;
  private static printCount = 0;

  static async printDynamicReceipt(
    sale: Transaction,
    items: TransactionItem[],
    pharmacy: Pharmacy,
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

      // Create a new window for printing instead of iframe
      const printWindow = window.open('', '_blank', 'width=800,height=1000');

      if (!printWindow) {
        this.isPrinting = false;
        throw new Error('Could not open print window - popup blocked?');
      }

      // Disable browser extension communication to prevent proxy errors
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

          // Clear any pending timeout
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }

          console.log('Executing print...');
          try {
            printWindow.print();
            console.log('Print dialog opened');

            // Close window and resolve after print dialog
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

        // Set up onload handler
        printWindow.onload = () => {
          console.log('Print window loaded, executing print...');
          executePrint();
        };

        // Set up fallback timeout only if onload hasn't fired
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
      size: 80mm ${contentHeight}mm;
      margin: 0;
    }
    body {
      font-family: 'Courier New', monospace;
      font-size: 11px;
      width: 80mm;
      height: ${contentHeight}mm;
      margin: 0;
      padding: 3mm;
      line-height: 1.2;
      display: flex;
      flex-direction: column;
    }
    .header {
      text-align: center;
      margin-bottom: 3mm;
      flex-shrink: 0;
    }
    .temp-receipt {
      border: 1px dashed #000;
      padding: 2mm;
      margin: 2mm 0;
      text-align: center;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .pharmacy-name {
      font-weight: bold;
      font-size: 14px;
      margin-bottom: 1mm;
    }
    .pharmacy-info {
      font-size: 10px;
      color: #666;
    }
    .divider {
      border-top: 1px dashed #000;
      margin: 3mm 0;
      flex-shrink: 0;
    }
    .invoice-info {
      text-align: center;
      margin: 2mm 0;
      flex-shrink: 0;
    }
    .invoice-number {
      font-weight: bold;
      font-size: 12px;
    }
    .items-container {
      flex-grow: 1;
      overflow: hidden;
    }
    .item {
      margin: 1.5mm 0;
      page-break-inside: avoid;
    }
    .item-main {
      display: flex;
      justify-content: space-between;
      font-weight: bold;
    }
    .item-details {
      display: flex;
      justify-content: space-between;
      font-size: 9px;
      color: #666;
      margin-top: 0.5mm;
      padding-left: 3mm;
    }
    .totals {
      flex-shrink: 0;
      margin-top: 2mm;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      margin: 1mm 0;
      padding: 0.5mm 0;
    }
    .total-main {
      font-weight: bold;
      font-size: 12px;
      border-top: 1px solid #000;
      border-bottom: 1px solid #000;
      padding: 1mm 0;
      margin: 1mm 0;
    }
    .payment-info {
      margin-top: 2mm;
      padding-top: 1mm;
      border-top: 1px dashed #666;
    }
    .footer {
      text-align: center;
      margin-top: 3mm;
      flex-shrink: 0;
      font-size: 10px;
    }
    .bold {
      font-weight: bold;
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
    <div style="font-size: 10px;">${new Date(sale.createdAt).toLocaleString(
      'en-US',
      {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      },
    )}</div>
    <div style="font-size: 10px;">Cashier: ${
      sale.user?.fullName || 'Unknown'
    }</div>
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
        <span style="color: #d00;">-₱${discountAmount.toFixed(2)}</span>
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
    <div class="bold">Thank you for your purchase!</div>
    <div style="margin: 2mm 0;">Visit us again soon!</div>
    <div style="font-size: 10px;">${new Date().toLocaleString()}</div>
  </div>
</body>
</html>`;
  }
}
