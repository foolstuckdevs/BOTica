import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { DollarSign, Smartphone, User, Clock, Tag } from 'lucide-react';
import { JSX } from 'react';

type PaymentMethod = 'CASH' | 'GCASH';

const paymentConfig: Record<
  PaymentMethod,
  { color: string; icon: JSX.Element }
> = {
  CASH: {
    color: 'bg-blue-50 text-blue-600 border-blue-100',
    icon: <DollarSign className="w-3 h-3" />,
  },
  GCASH: {
    color: 'bg-green-50 text-green-600 border-green-100',
    icon: <Smartphone className="w-3 h-3" />,
  },
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
  index?: number;
}

export const TransactionCard = ({
  transaction,
  onClick,
  index = 0,
}: TransactionCardProps) => {
  const total = parseFloat(transaction.totalAmount);
  const discount = parseFloat(transaction.discount);
  const discountedTotal = total - discount;
  const discountPercentage = (discount / total) * 100;
  const payment = paymentConfig[transaction.paymentMethod];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold text-gray-900 text-sm sm:text-base">
              #{transaction.invoiceNumber}
            </span>
            <span
              className={`text-xs px-2 py-1 rounded-full ${payment.color} border flex items-center gap-1`}
            >
              {payment.icon}
              {transaction.paymentMethod}
            </span>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="w-3 h-3 text-gray-400" />
              {format(new Date(transaction.createdAt), 'MMM d, yyyy · h:mm a')}
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <User className="w-3 h-3 text-gray-400" />
              {transaction.user.fullName}
            </div>
            {discount > 0 && (
              <div className="flex items-center gap-1 text-xs text-red-500">
                <Tag className="w-3 h-3 text-red-400" />
                {discountPercentage.toFixed(0)}% OFF
              </div>
            )}
          </div>
        </div>

        <div className="text-right min-w-[90px]">
          <p className="text-lg font-bold text-gray-900">
            ₱{discountedTotal.toFixed(2)}
          </p>
          {discount > 0 && (
            <div className="flex flex-col mt-1">
              <p className="text-xs text-gray-400 line-through">
                ₱{total.toFixed(2)}
              </p>
              <p className="text-xs text-red-500">-₱{discount.toFixed(2)}</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
        <span className="text-xs text-gray-400 group-hover:text-gray-600 transition-colors">
          View details →
        </span>
      </div>
    </motion.div>
  );
};
