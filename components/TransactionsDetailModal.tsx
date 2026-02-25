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
  Ban,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { Printer } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PrintUtility } from '@/lib/PrintUtility';
import type { Pharmacy, Transaction, TransactionItem, VoidReason } from '@/types';
import { useSession } from 'next-auth/react';
import { voidSale } from '@/lib/actions/sales';
import { toast } from 'sonner';

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
    status: 'COMPLETED' | 'VOIDED';
    voidedAt?: string | Date | null;
    voidedByName?: string | null;
    voidReason?: VoidReason | null;
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
  pharmacy?: Pharmacy;
  onClose: () => void;
  onVoided?: () => void;
}

export const TransactionDetailsModal = ({
  transaction,
  pharmacy,
  onClose,
  onVoided,
}: TransactionDetailsModalProps) => {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'Admin';
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showVoidConfirm, setShowVoidConfirm] = useState(false);
  const [voidReason, setVoidReason] = useState<VoidReason | ''>('');
  const [isVoiding, setIsVoiding] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const total = parseFloat(transaction.totalAmount);
  const discount = parseFloat(transaction.discount);
  const discountedTotal = total - discount;
  const discountPercentage = (discount / total) * 100;
  const isVoided = transaction.status === 'VOIDED';

  // Check if within 24-hour void window
  const saleDate = new Date(transaction.createdAt);
  const hoursSinceSale = (Date.now() - saleDate.getTime()) / (1000 * 60 * 60);
  const canVoid = isAdmin && !isVoided && hoursSinceSale <= 24;

  const VOID_REASONS: { value: VoidReason; label: string }[] = [
    { value: 'WRONG_DRUG', label: 'Wrong drug dispensed' },
    { value: 'WRONG_STRENGTH', label: 'Wrong strength dispensed' },
    { value: 'WRONG_QUANTITY', label: 'Wrong quantity dispensed' },
  ];

  const handleVoid = async () => {
    if (!voidReason || !session?.user?.pharmacyId) return;
    setIsVoiding(true);
    try {
      const result = await voidSale(
        transaction.id,
        voidReason,
        session.user.pharmacyId,
      );
      if (result.success) {
        toast.success(result.message);
        setShowVoidConfirm(false);
        onVoided?.();
        onClose();
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error('An unexpected error occurred while voiding the sale.');
    } finally {
      setIsVoiding(false);
    }
  };

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Don't close if the void confirmation dialog is open
      if (showVoidConfirm) return;
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, showVoidConfirm]);

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
              <div className="flex items-center gap-2">
                {/* Void button — Admin only, within 24h, not already voided */}
                {canVoid && (
                  <Button
                    variant="ghost"
                    className="h-8 px-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => setShowVoidConfirm(true)}
                    title="Void this sale"
                  >
                    <Ban className="w-4 h-4 mr-1" />
                    Void Sale
                  </Button>
                )}
                {!isVoided && (
                  <Button
                    variant="ghost"
                    className="h-8 px-2 text-sm"
                    onClick={async () => {
                      const tx: Transaction = {
                        ...transaction,
                        createdAt: transaction.createdAt,
                      } as unknown as Transaction;
                      const items: TransactionItem[] = transaction.items.map(
                        (i) => ({
                          id: (Math.random() * 1e9) | 0,
                          productName: i.productName,
                          quantity: i.quantity,
                          unitPrice: i.unitPrice,
                          subtotal: i.subtotal,
                        }),
                      );
                      const ph: Pharmacy = pharmacy ?? {
                        id: session?.user?.pharmacyId ?? 0,
                        name: 'BOTica Pharmacy',
                        address: '',
                        phone: '',
                      };
                      await PrintUtility.printDynamicReceipt(tx, items, ph);
                    }}
                    title="Print receipt"
                  >
                    <Printer className="w-4 h-4 mr-1" />
                    Print receipt
                  </Button>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Voided Banner */}
            {isVoided && (
              <div className="bg-red-50 border-b border-red-200 px-4 py-3 flex items-start gap-3">
                <Ban className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold text-red-700">This sale has been voided</p>
                  <p className="text-red-600 mt-0.5">
                    Reason: {transaction.voidReason === 'WRONG_DRUG' && 'Wrong drug dispensed'}
                    {transaction.voidReason === 'WRONG_STRENGTH' && 'Wrong strength dispensed'}
                    {transaction.voidReason === 'WRONG_QUANTITY' && 'Wrong quantity dispensed'}
                  </p>
                  <p className="text-red-500 mt-0.5 text-xs">
                    Voided by {transaction.voidedByName ?? 'Admin'}
                    {transaction.voidedAt && ` on ${format(new Date(transaction.voidedAt), 'MMM d, yyyy · h:mm a')}`}
                  </p>
                </div>
              </div>
            )}

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
          </motion.div>
        </div>
      </AnimatePresence>

      {/* Void Confirmation Dialog */}
      <AnimatePresence>
        {showVoidConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200"
            >
              {/* Dialog Header */}
              <div className="bg-red-50 border-b border-red-200 p-4 flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Void Sale</h3>
                  <p className="text-sm text-gray-600">
                    Invoice #{transaction.invoiceNumber}
                  </p>
                </div>
              </div>

              <div className="p-4 space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                  <p className="font-medium">This action will:</p>
                  <ul className="list-disc ml-4 mt-1 space-y-0.5">
                    <li>Mark this sale as voided</li>
                    <li>Restore stock for all {transaction.items.length} item(s)</li>
                    <li>Refund ₱{discountedTotal.toFixed(2)} to the customer</li>
                  </ul>
                  <p className="mt-2 font-medium text-amber-900">This cannot be undone.</p>
                </div>

                {/* Reason Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for voiding <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    {VOID_REASONS.map((r) => (
                      <label
                        key={r.value}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          voidReason === r.value
                            ? 'border-red-300 bg-red-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="void-reason"
                          value={r.value}
                          checked={voidReason === r.value}
                          onChange={() => setVoidReason(r.value)}
                          className="text-red-600 focus:ring-red-500"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          {r.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dialog Actions */}
              <div className="border-t bg-gray-50 p-4 flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowVoidConfirm(false);
                    setVoidReason('');
                  }}
                  disabled={isVoiding}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleVoid}
                  disabled={!voidReason || isVoiding}
                >
                  {isVoiding ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      Voiding...
                    </>
                  ) : (
                    <>
                      <Ban className="w-4 h-4 mr-1" />
                      Confirm Void
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
