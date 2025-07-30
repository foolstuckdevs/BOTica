import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import React from 'react';
import type { Product } from '@/types';
import { getExpiryUrgency } from '@/lib/helpers/fefo-utils';

export interface CartItem {
  id: number;
  name: string;
  brandName?: string | null;
  lotNumber: string;
  expiryDate: string;
  unitPrice: number;
  quantity: number;
}

interface CartProps {
  cart: CartItem[];
  products: Product[];
  discountPercentage: number;
  isProcessing: boolean;
  totalAmount: number;
  discountAmount: number;
  discountedTotal: number;
  onRemoveFromCart: (productId: number) => void;
  onQuantityChange: (productId: number, newQuantity: number) => void;
  onDiscountChange: (discount: number) => void;
  onCheckout: () => void;
}

export const Cart: React.FC<CartProps> = ({
  cart,
  products,
  discountPercentage,
  isProcessing,
  totalAmount,
  discountAmount,
  discountedTotal,
  onRemoveFromCart,
  onQuantityChange,
  onDiscountChange,
  onCheckout,
}) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border sticky top-4 h-fit">
      <h2 className="text-lg font-bold mb-4">Cart ({cart.length})</h2>
      <div className="space-y-4 mb-4 max-h-[400px] overflow-y-auto">
        {cart.length > 0 ? (
          cart.map((item) => {
            const product = products.find((p) => p.id === item.id);
            const maxQuantity = product?.quantity || 1;
            const urgency = getExpiryUrgency(item.expiryDate);

            return (
              <div key={item.id} className="border-b pb-3 group">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium truncate">{item.name}</h4>
                    </div>
                    {product && (
                      <div className="text-xs text-gray-600 mt-1 space-y-0.5">
                        {product.brandName && (
                          <div className="flex items-center gap-1">
                            <span className="text-blue-600 font-medium">
                              Brand:
                            </span>
                            <span>{product.brandName}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <span className="text-amber-600 font-medium">
                            Lot:
                          </span>
                          <span>{product.lotNumber}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span
                            className={`font-medium ${
                              urgency.level === 'expiring_soon'
                                ? 'text-red-600'
                                : urgency.level === 'moderately_close'
                                ? 'text-yellow-600'
                                : 'text-green-600'
                            }`}
                          >
                            Expires in:
                          </span>
                          <span
                            className={
                              urgency.level === 'expiring_soon'
                                ? 'text-red-600 font-medium'
                                : urgency.level === 'moderately_close'
                                ? 'text-yellow-600 font-medium'
                                : 'text-gray-600'
                            }
                          >
                            {urgency.days} days
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="text-sm text-gray-500 mt-1">
                      ₱{item.unitPrice.toFixed(2)} × {item.quantity}
                      {maxQuantity > 0 && (
                        <span className="text-xs text-gray-400 ml-2">
                          (Max: {maxQuantity})
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => onRemoveFromCart(item.id)}
                    className="text-red-500 hover:text-red-700 text-xl p-1 -mt-1 -mr-1 transition-opacity opacity-70 group-hover:opacity-100"
                    aria-label="Remove item"
                  >
                    &times;
                  </button>
                </div>
                <div className="flex items-center mt-2 gap-1">
                  <button
                    onClick={() => onQuantityChange(item.id, item.quantity - 1)}
                    className="w-8 h-8 flex items-center justify-center border rounded hover:bg-gray-50 disabled:opacity-40"
                    disabled={item.quantity <= 1}
                    aria-label="Decrease quantity"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max={maxQuantity}
                    value={item.quantity}
                    onChange={(e) =>
                      onQuantityChange(item.id, parseInt(e.target.value))
                    }
                    onBlur={(e) => {
                      if (!e.target.value || parseInt(e.target.value) < 1) {
                        onQuantityChange(item.id, 1);
                      }
                    }}
                    className="w-12 h-8 text-center border-t border-b focus:outline-none focus:ring-1 focus:ring-primary"
                    aria-label="Quantity"
                  />
                  <button
                    onClick={() => onQuantityChange(item.id, item.quantity + 1)}
                    className="w-8 h-8 flex items-center justify-center border rounded hover:bg-gray-50 disabled:opacity-40"
                    disabled={item.quantity >= maxQuantity}
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
                <div className="text-right font-bold mt-1">
                  ₱{(item.unitPrice * item.quantity).toFixed(2)}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center text-gray-500 py-8">
            Your cart is empty
          </div>
        )}
      </div>
      {cart.length > 0 && (
        <>
          <div className="space-y-2 mb-4">
            <div>
              <Label className="block text-sm font-medium mb-1">
                Discount (%)
              </Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="1"
                value={discountPercentage}
                onChange={(e) =>
                  onDiscountChange(parseFloat(e.target.value) || 0)
                }
                className="bg-white"
              />
            </div>
          </div>
          <div className="space-y-2 border-t pt-4">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>₱{totalAmount.toFixed(2)}</span>
            </div>
            {discountPercentage > 0 && (
              <div className="flex justify-between">
                <span>Discount ({discountPercentage}%):</span>
                <span className="text-red-500">
                  -₱{discountAmount.toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg mt-2">
              <span>Total:</span>
              <span>₱{discountedTotal.toFixed(2)}</span>
            </div>
            <Button
              onClick={onCheckout}
              className="w-full mt-4"
              disabled={isProcessing || cart.length === 0}
            >
              {isProcessing ? 'Processing...' : 'Process Sale'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
