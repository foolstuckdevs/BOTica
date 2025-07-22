export class PrintService {
  static generateReceiptHTML(
    transaction: {
      invoiceNumber: string;
      createdAt: Date;
      totalAmount: string;
      discount: string;
      paymentMethod: 'CASH' | 'GCASH';
      user: { fullName: string };
      items: Array<{
        productName: string;
        quantity: number;
        unitPrice: string;
        subtotal: string;
      }>;
    },
    pharmacyInfo: {
      name: string;
      address: string;
      phone: string;
    }
  ): { html: string, height: number } {
    // Calculate values
    const total = parseFloat(transaction.totalAmount);
    const discount = parseFloat(transaction.discount);
    const discountPercentage = (discount / total) * 100;
    const subtotal = total - discount;

    // Calculate approximate height in mm (5mm per line)
    const itemLines = transaction.items.length * 3; // 3 lines per item
    const baseLines = 20; // Header, info, totals, footer
    const totalLines = baseLines + itemLines;
    const heightMm = totalLines * 5;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Receipt - ${transaction.invoiceNumber}</title>
  <style>
    @page {
      size: 80mm ${heightMm}mm;
      margin: 0;
    }
    body {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      width: 80mm;
      margin: 0;
      padding: 2mm;
      -webkit-print-color-adjust: exact;
      background-color: white;
    }
    .header {
      text-align: center;
      margin-bottom: 3mm;
    }
    .header h1 {
      font-weight: bold;
      font-size: 14px;
      margin: 0;
      padding: 0;
      text-transform: uppercase;
    }
    .header p {
      margin: 1px 0;
      padding: 0;
      font-size: 10px;
    }
    .divider {
      border-top: 1px dashed #000;
      margin: 3mm 0;
    }
    .info {
      margin-bottom: 2mm;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin: 1mm 0;
    }
    .items {
      margin-bottom: 3mm;
    }
    .item {
      margin: 2mm 0;
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
      margin-top: 3mm;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      margin: 1mm 0;
    }
    .bold {
      font-weight: bold;
    }
    .footer {
      text-align: center;
      margin-top: 5mm;
      font-size: 10px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${pharmacyInfo.name}</h1>
    <p>${pharmacyInfo.address}</p>
    <p>${pharmacyInfo.phone}</p>
  </div>

  <div class="divider"></div>

  <div class="info">
    <div class="info-row">
      <span>Invoice:</span>
      <span>${transaction.invoiceNumber}</span>
    </div>
    <div class="info-row">
      <span>Date:</span>
      <span>${new Date(transaction.createdAt).toLocaleString()}</span>
    </div>
    <div class="info-row">
      <span>Cashier:</span>
      <span>${transaction.user.fullName}</span>
    </div>
  </div>

  <div class="divider"></div>

  <div class="items">
    ${transaction.items.map((item, index) => `
      <div class="item">
        <div class="item-main">
          <span>${index + 1}. ${item.productName}</span>
          <span>₱${parseFloat(item.subtotal).toFixed(2)}</span>
        </div>
        <div class="item-details">
          <span>${item.quantity} × ₱${parseFloat(item.unitPrice).toFixed(2)}</span>
          <span></span>
        </div>
      </div>
    `).join('')}
  </div>

  <div class="divider"></div>

  <div class="totals">
    <div class="total-row">
      <span>Subtotal:</span>
      <span>₱${total.toFixed(2)}</span>
    </div>
    ${discount > 0 ? `
      <div class="total-row">
        <span>Discount (${discountPercentage.toFixed(0)}%):</span>
        <span>-₱${discount.toFixed(2)}</span>
      </div>
    ` : ''}
    <div class="total-row bold">
      <span>TOTAL:</span>
      <span>₱${subtotal.toFixed(2)}</span>
    </div>
    <div class="total-row">
      <span>Payment Method:</span>
      <span>${transaction.paymentMethod}</span>
    </div>
  </div>

  <div class="divider"></div>

  <div class="footer">
    <p>Thank you for your purchase!</p>
    <p class="bold">** OFFICIAL RECEIPT **</p>
    <p>${new Date().toLocaleString()}</p>
  </div>
</body>
</html>`;

    return { html, height: heightMm };
  }

  static printReceipt(html: string): boolean {
    try {
      const printWindow = window.open('', '_blank', 'width=380,height=600');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        
        // Wait for content to load before printing
        setTimeout(() => {
          printWindow.print();
          // Close after printing (with delay for print dialog)
          setTimeout(() => {
            printWindow.close();
          }, 1000);
        }, 200);
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Print error:', error);
      return false;
    }
  }
}