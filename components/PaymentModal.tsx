import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import React from 'react';

interface PaymentModalProps {
  show: boolean;
  discountedTotal: number;
  cashReceived: number;
  change: number;
  isProcessing: boolean;
  onCashChange: (amount: number) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  show,
  discountedTotal,
  cashReceived,
  change,
  isProcessing,
  onCashChange,
  onCancel,
  onConfirm,
}) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-md">
        <h3 className="text-lg font-bold mb-4">Cash Payment</h3>
        <div className="space-y-4">
          <div className="flex justify-between text-lg">
            <span>Total Amount:</span>
            <span className="font-bold">₱{discountedTotal.toFixed(2)}</span>
          </div>
          <div>
            <Label className="block mb-2">Amount Received</Label>
            <Input
              type="number"
              min={discountedTotal}
              step="0.01"
              value={cashReceived}
              onChange={(e) => onCashChange(parseFloat(e.target.value) || 0)}
              className="text-lg bg-white mb-2"
              autoFocus
            />
            <div className="grid grid-cols-3 gap-2 mt-2">
              {[20, 50, 100, 200, 500, 1000].map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() =>
                    onCashChange(
                      cashReceived < amount ? amount : cashReceived + amount,
                    )
                  }
                  className="py-2 px-3 border rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  ₱{amount}
                </button>
              ))}
              <button
                type="button"
                onClick={() => onCashChange(discountedTotal)}
                className="py-2 px-3 border rounded-md text-sm font-medium hover:bg-gray-50 transition-colors col-span-3"
              >
                Exact Amount (₱{discountedTotal.toFixed(2)})
              </button>
            </div>
          </div>
          {cashReceived > 0 && (
            <div className="flex justify-between text-lg">
              <span>Change:</span>
              <span
                className={`font-bold ${
                  change < 0 ? 'text-red-500' : 'text-green-500'
                }`}
              >
                ₱{Math.abs(change).toFixed(2)}
              </span>
            </div>
          )}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={onConfirm}
              disabled={cashReceived < discountedTotal || isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Confirm Payment'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
