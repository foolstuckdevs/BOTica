import type { Transaction, TransactionItem, Pharmacy } from '@/types';

export class PrintUtility {
  static async printDynamicReceipt(
    sale: Transaction,
    items: TransactionItem[],
    pharmacy: Pharmacy,
  ): Promise<boolean> {
    const baseLines = 20; // For headers, totals, footer
    const itemLines = items.length * 3; // Rough estimate
    const contentHeight = baseLines + itemLines;
    const printContent = this.generateDynamicReceipt(
      sale,
      items,
      pharmacy,
      contentHeight,
    );

    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '80mm';
      iframe.style.height = `${contentHeight}mm`;
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);

      if (iframe.contentDocument) {
        iframe.contentDocument.open();
        iframe.contentDocument.write(printContent);
        iframe.contentDocument.close();
      }

      return new Promise((resolve) => {
        iframe.onload = () => {
          setTimeout(() => {
            (iframe.contentWindow as Window).print();
            setTimeout(() => {
              document.body.removeChild(iframe);
              resolve(true);
            }, 1000);
          }, 200);
        };
      });
    } catch (error) {
      console.error('Print error:', error);
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
  <title>Receipt</title>
  <style>
    @page {
      size: 80mm ${contentHeight}mm;
      margin: 0;
    }
    body {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      width: 80mm;
      height: ${contentHeight}mm;
      margin: 0;
      padding: 2mm;
      display: flex;
      flex-direction: column;
    }
    .header {
      text-align: center;
      margin-bottom: 2mm;
      flex-shrink: 0;
    }
    .divider {
      border-top: 1px dashed #000;
      margin: 2mm 0;
      flex-shrink: 0;
    }
    .items-container {
      flex-grow: 1;
      overflow: hidden;
    }
    .item {
      margin: 1mm 0;
    }
    .item-main {
      display: flex;
      justify-content: space-between;
    }
    .item-details {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      padding-left: 5mm;
    }
    .totals {
      flex-shrink: 0;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      margin: 1mm 0;
    }
    .footer {
      text-align: center;
      margin-top: 2mm;
      flex-shrink: 0;
    }
    .bold {
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="bold">${pharmacy.name}</div>
    <div>${pharmacy.address ?? ''}</div>
    <div>${pharmacy.phone ?? ''}</div>
  </div>

  <div class="divider"></div>

  <div class="bold" style="text-align: center;">
    <div>INVOICE: ${sale.invoiceNumber}</div>
    <div>${new Date(sale.createdAt).toLocaleString()}</div>
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
    <div class="total-row bold">
      <span>TOTAL:</span>
      <span>₱${total.toFixed(2)}</span>
    </div>
    <div class="total-row">
      <span>Cash Received:</span>
      <span>₱${parseFloat(sale.amountReceived?.toString() ?? '0').toFixed(
        2,
      )}</span>
    </div>
    <div class="total-row">
      <span>Change:</span>
      <span>₱${parseFloat(sale.changeDue?.toString() ?? '0').toFixed(2)}</span>
    </div>
  </div>

  <div class="divider"></div>

  <div class="footer">
    <div>Thank you for your purchase!</div>
    <div class="bold">** TEMPORARY RECEIPT **</div>
    <div>${new Date().toLocaleString()}</div>
  </div>

  <script>
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        window.close();
      }, 100);
    }, 200);
  </script>
</body>
</html>`;
  }
}
