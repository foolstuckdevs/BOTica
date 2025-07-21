// components/TransactionDetailsModal.tsx
import { format } from 'date-fns';
import { Button } from './ui/button';
import { X } from 'lucide-react';

type PaymentMethod = 'CASH' | 'GCASH';

const paymentColors: Record<PaymentMethod, string> = {
  CASH: 'bg-blue-100 text-blue-800',
  GCASH: 'bg-green-100 text-green-800'
};

interface TransactionDetailsModalProps {
  transaction: {
    id: number;
    invoiceNumber: string;
    totalAmount: string;
    discount: string;
    paymentMethod: PaymentMethod;
    createdAt: Date;
    user: {
      fullName: string;
    };
    items: Array<{
      productName: string;
      quantity: number;
      unitPrice: string;
      subtotal: string;
    }>;
  };
  onClose: () => void;
}

export const TransactionDetailsModal = ({ transaction, onClose }: TransactionDetailsModalProps) => {
  const total = parseFloat(transaction.totalAmount);
  const discount = parseFloat(transaction.discount);
  const discountedTotal = total - discount;
  const discountPercentage = (discount / total) * 100;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="border-b p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Transaction Details</h2>
            <p className="text-sm text-gray-500 mt-1">
              {format(new Date(transaction.createdAt), 'EEEE, MMMM d, yyyy · h:mm a')}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 space-y-6">
          {/* Invoice Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-gray-500">Invoice Number</p>
              <p className="font-medium">{transaction.invoiceNumber}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-500">Payment Method</p>
              <span className={`text-sm px-3 py-1 rounded-full ${paymentColors[transaction.paymentMethod]}`}>
                {transaction.paymentMethod}
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-500">Cashier</p>
              <p className="font-medium">{transaction.user.fullName}</p>
            </div>
            {discount > 0 && (
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Discount Applied</p>
                <p className="font-medium text-red-500">
                  {discountPercentage.toFixed(0)}% (₱{discount.toFixed(2)})
                </p>
              </div>
            )}
          </div>

          {/* Items Table */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Items Purchased</h3>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Item</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Qty</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Price</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {transaction.items.map((item) => (
                    <tr key={`${transaction.id}-${item.productName}`}>
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">{item.productName}</td>
                      <td className="py-3 px-4 text-sm text-gray-500 text-right">{item.quantity}</td>
                      <td className="py-3 px-4 text-sm text-gray-500 text-right">₱{parseFloat(item.unitPrice).toFixed(2)}</td>
                      <td className="py-3 px-4 text-sm font-medium text-gray-900 text-right">₱{parseFloat(item.subtotal).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between py-2">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">₱{total.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between py-2">
                <div className="text-red-500">
                  <span>Discount ({discountPercentage.toFixed(0)}%)</span>
                </div>
                <span className="text-red-500">-₱{discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-gray-200 mt-2">
              <span className="font-semibold">Total</span>
              <span className="text-xl font-bold">₱{discountedTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-4 flex justify-end">
          <Button 
            onClick={onClose}
            className="px-6"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};