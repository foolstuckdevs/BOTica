import React from 'react';
import { format } from 'date-fns';
import { Button } from './ui/button';
import {
  X,
  ChevronDown,
  ChevronUp,
  Info,
  CreditCard,
  Smartphone,
  Banknote,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type PaymentMethod = 'CASH' | 'GCASH';
const paymentIcons: Record<PaymentMethod, React.JSX.Element> = {
  CASH: <Banknote className="w-4 h-4" />,
  GCASH: <Smartphone className="w-4 h-4" />,
};

const paymentColors: Record<PaymentMethod, string> = {
  CASH: 'bg-blue-100 text-blue-800',
  GCASH: 'bg-green-100 text-green-800',
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

export const TransactionDetailsModal = ({
  transaction,
  onClose,
}: TransactionDetailsModalProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const total = parseFloat(transaction.totalAmount);
  const discount = parseFloat(transaction.discount);
  const discountedTotal = total - discount;
  const discountPercentage = (discount / total) * 100;

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Animation variants
  const modalVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  return (
    <>
      {/* Main Modal */}
      <AnimatePresence>
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            ref={modalRef}
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={modalVariants}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200"
          >
            {/* Header */}
            <div className="border-b p-4 flex justify-between items-center bg-gray-50">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Transaction Details
                </h2>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  {format(
                    new Date(transaction.createdAt),
                    'MMM d, yyyy · h:mm a',
                  )}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Collapsible Header */}
            <div
              className="border-b p-3 bg-gray-50 cursor-pointer flex items-center justify-between"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`p-1.5 rounded-lg ${
                    paymentColors[transaction.paymentMethod]
                  }`}
                >
                  {paymentIcons[transaction.paymentMethod]}
                </div>
                <div>
                  <h3 className="font-medium text-sm">
                    Invoice #{transaction.invoiceNumber}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Served by {transaction.user.fullName}
                  </p>
                </div>
              </div>
              {isCollapsed ? (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              )}
            </div>

            {/* Scrollable Content */}
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-y-auto flex-1 p-4"
              >
                {/* Invoice Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                    <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2 text-sm">
                      <CreditCard className="w-3 h-3" />
                      Payment Information
                    </h4>
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-600">Method</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            paymentColors[transaction.paymentMethod]
                          } flex items-center gap-1`}
                        >
                          {paymentIcons[transaction.paymentMethod]}
                          {transaction.paymentMethod}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-600">
                          Invoice Number
                        </span>
                        <span className="font-medium text-xs">
                          {transaction.invoiceNumber}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <h4 className="font-medium text-gray-800 mb-2 text-sm">
                      Transaction Summary
                    </h4>
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-600">Date</span>
                        <span className="font-medium text-xs">
                          {format(
                            new Date(transaction.createdAt),
                            'MMM d, yyyy',
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-600">Cashier</span>
                        <span className="font-medium text-xs">
                          {transaction.user.fullName}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <div className="mb-6">
                  <h3 className="font-semibold text-base mb-3 text-gray-800 flex items-center gap-2">
                    <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
                    Items ({transaction.items.length})
                  </h3>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Item
                          </th>
                          <th className="text-center py-2 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Qty
                          </th>
                          <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Price
                          </th>
                          <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Subtotal
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {transaction.items.map((item, index) => (
                          <tr
                            key={`${transaction.id}-${item.productName}`}
                            className={
                              index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                            }
                          >
                            <td className="py-2 px-3 text-sm font-medium text-gray-900">
                              {item.productName}
                            </td>
                            <td className="py-2 px-3 text-sm text-gray-500 text-center">
                              {item.quantity}
                            </td>
                            <td className="py-2 px-3 text-sm text-gray-500 text-right">
                              ₱{parseFloat(item.unitPrice).toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-sm font-medium text-gray-900 text-right">
                              ₱{parseFloat(item.subtotal).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="font-semibold text-base mb-3 text-gray-800 flex items-center gap-2">
                    <span className="w-1 h-4 bg-green-500 rounded-full"></span>
                    Payment Summary
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between py-1">
                      <span className="text-gray-600 text-sm">Subtotal</span>
                      <span className="font-medium text-sm">
                        ₱{total.toFixed(2)}
                      </span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between py-1 bg-red-50 -mx-2 px-2 rounded">
                        <div className="text-red-600 flex items-center gap-2">
                          <span className="text-xs bg-red-100 px-2 py-0.5 rounded-full">
                            {discountPercentage.toFixed(0)}% OFF
                          </span>
                          <span className="text-sm">Discount</span>
                        </div>
                        <span className="text-red-600 font-medium text-sm">
                          -₱{discount.toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="border-t border-gray-200 pt-2 mt-2">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-base text-gray-800">
                          Total Paid
                        </span>
                        <span className="text-lg font-bold text-green-600">
                          ₱{discountedTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Footer */}
            <div className="border-t p-3 flex justify-end bg-gray-50">
              <Button
                onClick={onClose}
                className="px-4 py-2 text-sm"
                variant="outline"
              >
                Close
              </Button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    </>
  );
};
