import { format } from 'date-fns';
import { Button } from './ui/button';
import { X, Printer, ChevronDown, ChevronUp, Info, CreditCard, Smartphone, DollarSign } from 'lucide-react';
import { PrintService } from '@/lib/PrintService';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type PaymentMethod = 'CASH' | 'GCASH';

const paymentIcons: Record<PaymentMethod, JSX.Element> = {
  CASH: <DollarSign className="w-4 h-4" />,
  GCASH: <Smartphone className="w-4 h-4" />
};

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
  pharmacyInfo: {
    name: string;
    address: string;
    phone: string;
    logo?: string;
  };
}

export const TransactionDetailsModal = ({ 
  transaction, 
  onClose,
  pharmacyInfo 
}: TransactionDetailsModalProps) => {
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [receiptHtml, setReceiptHtml] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const total = parseFloat(transaction.totalAmount);
  const discount = parseFloat(transaction.discount);
  const discountedTotal = total - discount;
  const discountPercentage = (discount / total) * 100;

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handlePrint = () => {
    const { html } = PrintService.generateReceiptHTML(transaction, pharmacyInfo);
    setReceiptHtml(html);
    setShowReceiptPreview(true);
  };

  const confirmPrint = () => {
    setShowReceiptPreview(false);
    const success = PrintService.printReceipt(receiptHtml);
    if (!success) {
      alert('Failed to open print dialog. Please allow popups for this site.');
    }
  };

  // Animation variants
  const modalVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
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
            className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200"
          >
            {/* Header */}
            <div className="border-b p-6 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white">
              <div>
                <div className="flex items-center gap-3">
                  {pharmacyInfo.logo && (
                    <img src={pharmacyInfo.logo} alt="Pharmacy Logo" className="h-10 w-10 rounded-md object-contain" />
                  )}
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 font-serif">Transaction Details</h2>
                    <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      {format(new Date(transaction.createdAt), 'EEEE, MMMM d, yyyy · h:mm a')}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={handlePrint}
                  className="gap-2 hover:bg-gray-100 transition-all hover:shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  Print Receipt
                </Button>
                <button 
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors group"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-gray-500 group-hover:text-gray-700 transition-colors" />
                </button>
              </div>
            </div>

            {/* Collapsible Header */}
            <div 
              className="border-b p-4 bg-gray-50 cursor-pointer flex items-center justify-between"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${paymentColors[transaction.paymentMethod]}`}>
                  {paymentIcons[transaction.paymentMethod]}
                </div>
                <div>
                  <h3 className="font-medium">Invoice #{transaction.invoiceNumber}</h3>
                  <p className="text-sm text-gray-500">Processed by {transaction.user.fullName}</p>
                </div>
              </div>
              {isCollapsed ? (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              )}
            </div>

            {/* Scrollable Content */}
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-y-auto flex-1 p-6"
              >
                {/* Invoice Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                      <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        Payment Information
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Method</span>
                          <span className={`text-sm px-2.5 py-1 rounded-full ${paymentColors[transaction.paymentMethod]} flex items-center gap-1`}>
                            {paymentIcons[transaction.paymentMethod]}
                            {transaction.paymentMethod}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Invoice Number</span>
                          <span className="font-medium text-sm">{transaction.invoiceNumber}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <h4 className="font-medium text-gray-800 mb-2">Transaction Summary</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Date</span>
                          <span className="font-medium text-sm">
                            {format(new Date(transaction.createdAt), 'MMM d, yyyy')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Cashier</span>
                          <span className="font-medium text-sm">{transaction.user.fullName}</span>
                        </div>
                        {discount > 0 && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Discount</span>
                            <span className="font-medium text-sm text-red-500">
                              {discountPercentage.toFixed(0)}% (₱{discount.toFixed(2)})
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <div className="mb-8">
                  <h3 className="font-semibold text-lg mb-4 text-gray-800 flex items-center gap-2">
                    <span className="w-1 h-5 bg-blue-500 rounded-full"></span>
                    Items Purchased ({transaction.items.length})
                  </h3>
                  <div className="border rounded-lg overflow-hidden shadow-sm">
                    <table className="w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                          <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                          <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                          <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {transaction.items.map((item, index) => (
                          <tr 
                            key={`${transaction.id}-${item.productName}`}
                            className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                          >
                            <td className="py-3 px-4 text-sm font-medium text-gray-900">{item.productName}</td>
                            <td className="py-3 px-4 text-sm text-gray-500 text-center">{item.quantity}</td>
                            <td className="py-3 px-4 text-sm text-gray-500 text-right">₱{parseFloat(item.unitPrice).toFixed(2)}</td>
                            <td className="py-3 px-4 text-sm font-medium text-gray-900 text-right">₱{parseFloat(item.subtotal).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 border border-gray-200 shadow-sm">
                  <div className="space-y-3">
                    <div className="flex justify-between py-1">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-medium">₱{total.toFixed(2)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between py-1">
                        <div className="text-red-500 flex items-center gap-1">
                          <span>Discount ({discountPercentage.toFixed(0)}%)</span>
                        </div>
                        <span className="text-red-500">-₱{discount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="border-t border-gray-200 pt-3 mt-2">
                      <div className="flex justify-between">
                        <span className="font-semibold text-lg">Total Amount</span>
                        <span className="text-2xl font-bold text-blue-600">₱{discountedTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Footer */}
            <div className="border-t p-4 flex justify-end bg-gray-50">
              <Button 
                onClick={onClose}
                className="px-6 hover:shadow-md transition-all"
                variant="outline"
              >
                Close
              </Button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>

      {/* Receipt Preview Modal */}
      <AnimatePresence>
        {showReceiptPreview && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200"
            >
              <div className="border-b p-4 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white">
                <h2 className="text-xl font-bold font-serif">Receipt Preview</h2>
                <div className="flex gap-2">
                  <Button 
                    onClick={confirmPrint} 
                    className="gap-2 hover:shadow-md transition-all"
                  >
                    <Printer className="w-4 h-4" />
                    Confirm Print
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowReceiptPreview(false)}
                    className="hover:shadow-md transition-all"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
              <div className="overflow-y-auto p-6 flex justify-center">
                <div 
                  className="mx-auto border border-gray-200 shadow-sm bg-white"
                  style={{ width: '80mm', minHeight: '100mm' }}
                  dangerouslySetInnerHTML={{ __html: receiptHtml }}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};