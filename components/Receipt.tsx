// components/Receipt.tsx
import React from 'react';

export const Receipt = React.forwardRef<HTMLDivElement, {
  sale: any;
  items: any[];
  pharmacy: any;
}>(({ sale, items, pharmacy }, ref) => {
  const formattedDate = new Date().toLocaleString();

  return (
    <div ref={ref} className="p-4 text-sm">
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold">{pharmacy?.name}</h2>
        <p className="text-xs">{pharmacy?.address}</p>
        <p className="text-xs mt-2">Date: {formattedDate}</p>
        <p className="text-xs">Invoice: {sale.invoiceNumber}</p>
      </div>

      <div className="border-t border-b border-black py-2 my-2">
        {items.map((item) => (
          <div key={item.id} className="flex justify-between mb-1">
            <div>
              <span className="font-medium">{item.name}</span>
              <span className="text-xs block">x{item.quantity} @ ₱{parseFloat(item.unitPrice).toFixed(2)}</span>
            </div>
            <span>₱{(parseFloat(item.unitPrice) * item.quantity).toFixed(2)}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-1">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>₱{parseFloat(sale.totalAmount).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Discount:</span>
          <span>-₱{parseFloat(sale.discount).toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-bold">
          <span>Total:</span>
          <span>₱{(parseFloat(sale.totalAmount) - parseFloat(sale.discount)).toFixed(2)}</span>
        </div>
        {sale.paymentMethod === 'CASH' && (
          <>
            <div className="flex justify-between">
              <span>Cash Received:</span>
              <span>₱{parseFloat(sale.cashReceived).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Change:</span>
              <span>₱{parseFloat(sale.change).toFixed(2)}</span>
            </div>
          </>
        )}
        <div className="flex justify-between mt-2">
          <span>Payment Method:</span>
          <span>{sale.paymentMethod}</span>
        </div>
      </div>

      <div className="text-center mt-6 text-xs">
        <p>Thank you for your purchase!</p>
        <p>This receipt serves as your official invoice</p>
      </div>
    </div>
  );
});

Receipt.displayName = 'Receipt';