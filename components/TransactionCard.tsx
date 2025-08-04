import { format } from 'date-fns';
import { User, Tag, Banknote } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type PaymentMethod = 'CASH' | 'GCASH';

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
    items: Array<{
      productName: string;
      quantity: number;
      unitPrice: string;
      subtotal: string;
    }>;
  };
  onClick: () => void;
}

export const TransactionCard = ({
  transaction,
  onClick,
}: TransactionCardProps) => {
  const total = parseFloat(transaction.totalAmount);
  const discount = parseFloat(transaction.discount);
  const discountedTotal = total - discount;
  const discountPercentage = total > 0 ? (discount / total) * 100 : 0;
  const itemCount = transaction.items.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex justify-between items-center gap-3">
        {/* Left side - Transaction details */}
        <div className="flex-1">
          {/* Header - Compact inline layout */}
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-gray-100 p-1.5 rounded">
              <Banknote className="w-3 h-3 text-gray-600" />
            </div>
            <h3 className="font-semibold text-gray-900 text-sm">
              #{transaction.invoiceNumber}
            </h3>
            <span className="text-xs text-gray-500">
              {format(new Date(transaction.createdAt), 'MMM d, h:mm a')}
            </span>
          </div>

          {/* Transaction info - Compact inline layout */}
          <div className="flex items-center gap-3 text-xs text-gray-600 mb-2">
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <span>Served by {transaction.user.fullName}</span>
            </div>
            <div>
              {itemCount} item{itemCount !== 1 ? 's' : ''}
            </div>
            {discount > 0 && (
              <Badge
                variant="secondary"
                className="bg-red-50 text-red-700 border-red-200 text-xs px-1.5 py-0.5"
              >
                <Tag className="w-3 h-3 mr-1" />
                {discountPercentage.toFixed(0)}% OFF
              </Badge>
            )}
          </div>
        </div>

        {/* Right side - Amount and button */}
        <div className="text-right">
          <div className="mb-2">
            <p className="text-lg font-bold text-gray-900">
              ₱{discountedTotal.toFixed(2)}
            </p>
            {discount > 0 && (
              <p className="text-xs text-gray-400 line-through">
                ₱{total.toFixed(2)}
              </p>
            )}
          </div>

          <span className="text-xs text-gray-600 hover:text-gray-800 cursor-pointer transition-colors">
            View Details
          </span>
        </div>
      </div>
    </div>
  );
};
