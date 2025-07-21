// components/TransactionCard.tsx
import { format } from 'date-fns';
import { Button } from './ui/button';

type PaymentMethod = 'CASH' | 'GCASH';

const paymentColors: Record<PaymentMethod, string> = {
  CASH: 'bg-blue-50 text-blue-600',
  GCASH: 'bg-green-50 text-green-600'
};

interface TransactionCardProps {
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
  };
  onClick: () => void;
}

export const TransactionCard = ({ transaction, onClick }: TransactionCardProps) => {
  const total = parseFloat(transaction.totalAmount);
  const discount = parseFloat(transaction.discount);
  const discountedTotal = total - discount;

  return (
    <div 
      className="border border-gray-200 rounded-lg p-4 mb-3 shadow-xs hover:shadow-md transition-all cursor-pointer bg-white"
      onClick={onClick}
    >
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-gray-900">{transaction.invoiceNumber}</span>
            <span className={`text-xs px-2 py-1 rounded-full ${paymentColors[transaction.paymentMethod]}`}>
              {transaction.paymentMethod}
            </span>
          </div>
          <p className="text-xs text-gray-500">
            {format(new Date(transaction.createdAt), 'MMM d, yyyy · h:mm a')}
          </p>
          <p className="text-xs text-gray-600 mt-1">
            Cashier: <span className="font-medium">{transaction.user.fullName}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-gray-900">₱{discountedTotal.toFixed(2)}</p>
          {discount > 0 && (
            <div className="flex flex-col">
              <p className="text-xs text-gray-500 line-through">₱{total.toFixed(2)}</p>
              <p className="text-xs text-red-500">-{((discount / total) * 100).toFixed(0)}% (₱{discount.toFixed(2)})</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};