'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/helpers/formatCurrency';
import { updatePurchaseOrderStatus } from '@/lib/actions/purchase-order';
import { PurchaseOrder } from '@/types';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { CreditCard } from 'lucide-react';

interface PurchaseOrderPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: PurchaseOrder;
}

export const PurchaseOrderPaymentDialog: React.FC<
  PurchaseOrderPaymentDialogProps
> = ({ open, onOpenChange, order }) => {
  const router = useRouter();
  const [amountPaid, setAmountPaid] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setAmountPaid(order.totalCost || '0');
    }
  }, [open, order.totalCost]);

  const handlePayment = async () => {
    if (!amountPaid || parseFloat(amountPaid) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await updatePurchaseOrderStatus(
        order.id,
        'COMPLETED',
        order.pharmacyId,
      );

      if (result.success) {
        toast.success('Purchase order marked as paid successfully');
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.message || 'Failed to mark as paid');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Failed to process payment');
    } finally {
      setIsProcessing(false);
    }
  };

  const totalCost = parseFloat(order.totalCost || '0');
  const enteredAmount = parseFloat(amountPaid) || 0;
  const difference = enteredAmount - totalCost;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-green-600" />
          </div>
          <DialogTitle className="text-xl font-semibold text-gray-900">
            Mark as Paid
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Enter the amount paid for this purchase order
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Order Summary */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">
                Purchase Order:
              </span>
              <span className="text-sm font-semibold text-gray-900">
                {order.orderNumber}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">
                Total Amount:
              </span>
              <span className="text-sm font-semibold text-blue-600">
                {formatCurrency(totalCost)}
              </span>
            </div>
          </div>

          {/* Payment Input */}
          <div className="space-y-2">
            <Label htmlFor="amount-paid" className="text-sm font-medium">
              Amount Paid *
            </Label>
            <Input
              id="amount-paid"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              className="text-lg font-medium"
              autoFocus
            />
            {enteredAmount > 0 && difference !== 0 && (
              <p
                className={`text-sm ${
                  difference > 0 ? 'text-amber-600' : 'text-red-600'
                }`}
              >
                {difference > 0
                  ? `Overpaid by ${formatCurrency(Math.abs(difference))}`
                  : `Short by ${formatCurrency(Math.abs(difference))}`}
              </p>
            )}
          </div>

          {/* Payment Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Marking this order as paid will complete
              the purchase order process and update your records.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            onClick={handlePayment}
            disabled={
              isProcessing || !amountPaid || parseFloat(amountPaid) <= 0
            }
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {isProcessing ? 'Processing...' : 'Mark as Paid'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
