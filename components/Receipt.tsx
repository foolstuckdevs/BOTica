'use client';

import { forwardRef, useRef, useEffect } from 'react';
import { format } from 'date-fns';

interface ReceiptProps {
  sale: {
    invoiceNumber: string;
    createdAt: string;
    totalAmount: number;
    discount: number;
    amountReceived: number;
    changeDue: number;
  };
  items: Array<{
    id: number;
    name: string;
    quantity: number;
    unitPrice: number;
  }>;
  pharmacy: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
  onPrintComplete?: () => void;
}

const Receipt = forwardRef<HTMLDivElement, ReceiptProps>(
  ({ sale, items, pharmacy, onPrintComplete }, ref) => {
    const receiptWindowRef = useRef<Window | null>(null);
    const printTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handlePrint = () => {
      // Close any existing print window
      if (receiptWindowRef.current) {
        receiptWindowRef.current.close();
      }

      // Create a new window for printing
      const printWindow = window.open('', '_blank', 'width=80mm,height=100mm');
      if (!printWindow) {
        console.error('Failed to open print window');
        return;
      }

      receiptWindowRef.current = printWindow;

      // Write the receipt content to the new window
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Receipt</title>
            <style>
              body {
                font-family: monospace;
                font-size: 12px;
                width: 80mm;
                margin: 0;
                padding: 10px;
                -webkit-print-color-adjust: exact;
              }
              .header {
                text-align: center;
                margin-bottom: 10px;
              }
              .header h1 {
                font-weight: bold;
                font-size: 14px;
                text-transform: uppercase;
                margin: 0;
              }
              .header p {
                margin: 2px 0;
              }
              .info {
                border-top: 1px solid black;
                border-bottom: 1px solid black;
                padding: 5px 0;
                margin: 5px 0;
              }
              .info div {
                display: flex;
                justify-content: space-between;
              }
              .items {
                margin-bottom: 10px;
              }
              .items-header, .item-row {
                display: grid;
                grid-template-columns: 10px 60px 20px 30px 30px;
                gap: 5px;
                padding: 2px 0;
              }
              .items-header {
                font-weight: bold;
                border-bottom: 1px solid black;
                margin-bottom: 3px;
              }
              .text-right {
                text-align: right;
              }
              .totals {
                border-top: 1px solid black;
                padding-top: 5px;
              }
              .totals div {
                display: flex;
                justify-content: space-between;
                margin: 2px 0;
              }
              .footer {
                text-align: center;
                margin-top: 15px;
                font-size: 10px;
              }
              .bold {
                font-weight: bold;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>${pharmacy.name}</h1>
              <p>${pharmacy.address}</p>
              <p>${pharmacy.phone} | ${pharmacy.email}</p>
            </div>

            <div class="info">
              <div>
                <span>Invoice:</span>
                <span>${sale.invoiceNumber}</span>
              </div>
              <div>
                <span>Date:</span>
                <span>${format(new Date(sale.createdAt), 'MMM dd, yyyy hh:mm a')}</span>
              </div>
            </div>

            <div class="items">
              <div class="items-header">
                <div>#</div>
                <div>Item</div>
                <div class="text-right">Qty</div>
                <div class="text-right">Price</div>
                <div class="text-right">Total</div>
              </div>
              ${items.map((item, index) => `
                <div class="item-row">
                  <div>${index + 1}</div>
                  <div>${item.name}</div>
                  <div class="text-right">${item.quantity}</div>
                  <div class="text-right">₱${item.unitPrice.toFixed(2)}</div>
                  <div class="text-right">₱${(item.unitPrice * item.quantity).toFixed(2)}</div>
                </div>
              `).join('')}
            </div>

            <div class="totals">
              <div>
                <span>Subtotal:</span>
                <span>₱${items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0).toFixed(2)}</span>
              </div>
              ${sale.discount > 0 ? `
                <div>
                  <span>Discount:</span>
                  <span>-₱${sale.discount.toFixed(2)}</span>
                </div>
              ` : ''}
              <div class="bold">
                <span>Total:</span>
                <span>₱${sale.totalAmount.toFixed(2)}</span>
              </div>
              <div>
                <span>Cash Received:</span>
                <span>₱${sale.amountReceived.toFixed(2)}</span>
              </div>
              <div>
                <span>Change:</span>
                <span>₱${sale.changeDue.toFixed(2)}</span>
              </div>
            </div>

            <div class="footer">
              <p>Thank you for your purchase!</p>
              <p>** This is your official receipt **</p>
              <p>${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}</p>
            </div>

            <script>
              // Automatically trigger print when window loads
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                  window.onafterprint = function() {
                    window.close();
                  };
                }, 100);
              };
            </script>
          </body>
        </html>
      `);

      printWindow.document.close();

      // Clean up after printing
      printWindow.onbeforeunload = () => {
        if (printTimeoutRef.current) {
          clearTimeout(printTimeoutRef.current);
        }
        if (onPrintComplete) {
          onPrintComplete();
        }
      };
    };

    // Auto-print when component mounts if ref is available
    useEffect(() => {
      if (ref && typeof ref !== 'function') {
        handlePrint();
      }
    }, [ref]);

    return (
      <div style={{ display: 'none' }}>
        {/* This hidden div is just to satisfy the forwardRef requirement */}
        <div ref={ref} />
      </div>
    );
  }
);

Receipt.displayName = 'Receipt';

export default Receipt;