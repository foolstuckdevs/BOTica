import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  CreditCard,
  Calculator,
  X,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-blue-900">
                  Cash Payment
                </h3>
                <p className="text-sm text-blue-700">
                  Complete your transaction
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Total Amount Card */}
          <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
            <div className="flex justify-between items-center">
              <span className="text-green-800 font-medium">Total Amount:</span>
              <span className="text-2xl font-bold text-green-900">
                ₱{discountedTotal.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Amount Received Section */}
          <div className="space-y-4">
            <div>
              <Label className="flex items-center gap-2 text-sm font-medium mb-3 text-gray-700">
                <Calculator className="w-4 h-4" />
                Amount Received
              </Label>
              <Input
                type="number"
                min={discountedTotal}
                step="0.01"
                value={cashReceived || ''}
                onChange={(e) => onCashChange(parseFloat(e.target.value) || 0)}
                className="text-xl h-12 bg-gray-50 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                placeholder="0.00"
                autoFocus
              />
            </div>

            {/* Quick Amount Buttons */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">
                Quick amounts:
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[20, 50, 100, 200, 500, 1000].map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() =>
                      onCashChange(
                        cashReceived < amount ? amount : cashReceived + amount,
                      )
                    }
                    className="py-3 px-4 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all duration-200 transform hover:scale-105"
                  >
                    ₱{amount}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => onCashChange(discountedTotal)}
                className="w-full py-3 px-4 bg-amber-50 border border-amber-300 rounded-lg text-sm font-medium text-amber-800 hover:bg-amber-100 hover:border-amber-400 transition-all duration-200"
              >
                Exact Amount (₱{discountedTotal.toFixed(2)})
              </button>
            </div>
          </div>

          {/* Change Display */}
          {cashReceived > 0 && (
            <div
              className={`rounded-xl p-4 border ${
                change < 0
                  ? 'bg-red-50 border-red-200'
                  : 'bg-green-50 border-green-200'
              }`}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  {change < 0 ? (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  )}
                  <span
                    className={`font-medium ${
                      change < 0 ? 'text-red-800' : 'text-green-800'
                    }`}
                  >
                    {change < 0 ? 'Insufficient Amount:' : 'Change:'}
                  </span>
                </div>
                <span
                  className={`text-xl font-bold ${
                    change < 0 ? 'text-red-900' : 'text-green-900'
                  }`}
                >
                  ₱{Math.abs(change).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              className="flex-1 h-12 text-base rounded-lg border-gray-300 hover:bg-gray-50"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 h-12 text-base bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
              onClick={onConfirm}
              disabled={cashReceived < discountedTotal || isProcessing}
            >
              {isProcessing ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Confirm Payment
                </div>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
