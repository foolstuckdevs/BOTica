import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, Minus, ShoppingCart, Package } from 'lucide-react';
import React from 'react';
import type { ProductPOS } from '@/types';
import { getExpiryUrgency } from '@/lib/helpers/fefo-utils';

export interface CartItem {
  id: number;
  name: string;
  brandName?: string | null;
  lotNumber: string | null;
  expiryDate: string | null;
  unitPrice: number;
  quantity: number;
}

interface CartProps {
  cart: CartItem[];
  products: ProductPOS[];
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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 sticky top-4 h-fit overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-4 py-3 border-b border-blue-200">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-bold text-blue-900">
            Current Sale{' '}
            {cart.length > 0 && (
              <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-blue-600 rounded-full ml-2">
                {cart.length}
              </span>
            )}
          </h2>
        </div>
      </div>

      {/* Current Sale Items */}
      <div className="p-4">
        <div className="space-y-3 mb-4 max-h-[350px] overflow-y-auto">
          {cart.length > 0 ? (
            cart.map((item) => {
              const product = products.find((p) => p.id === item.id);
              const maxQuantity = product?.quantity || 1;
              const urgency = item.expiryDate
                ? getExpiryUrgency(item.expiryDate)
                : {
                    level: 'no_expiry',
                    days: null,
                    color: 'bg-gray-100',
                    textColor: 'text-gray-600',
                    borderColor: 'border-gray-200',
                    badge: 'NO EXPIRY',
                    icon: '⚫',
                  };

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border ${urgency.borderColor} overflow-hidden`}
                >
                  {/* Content Section */}
                  <div className="p-4 space-y-3">
                    {/* Header with Delete Button */}
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm text-gray-900 line-clamp-2 leading-tight">
                          {item.name}
                        </h4>
                      </div>

                      {/* Delete Button Only */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onRemoveFromCart(item.id)}
                          className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1 rounded-lg transition-all"
                          aria-label="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Product Details */}
                    <div className="space-y-2">
                      {product?.brandName && (
                        <div className="flex items-center gap-2 text-xs">
                          <Package className="w-3 h-3 text-blue-500 flex-shrink-0" />
                          <span className="text-gray-600 truncate">
                            {product.brandName}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Price and Stock */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <div className="font-bold text-lg text-blue-600">
                        ₱{item.unitPrice.toFixed(2)}
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-600">
                          × {item.quantity} = ₱
                          {(item.unitPrice * item.quantity).toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-400">
                          Max: {maxQuantity}
                        </div>
                      </div>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center justify-center gap-3 pt-2">
                      <button
                        onClick={() =>
                          onQuantityChange(item.id, item.quantity - 1)
                        }
                        className="w-8 h-8 flex items-center justify-center bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        disabled={item.quantity <= 1}
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-4 h-4" />
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
                        className="w-16 h-8 text-center border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
                        aria-label="Quantity"
                      />
                      <button
                        onClick={() =>
                          onQuantityChange(item.id, item.quantity + 1)
                        }
                        className="w-8 h-8 flex items-center justify-center bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        disabled={item.quantity >= maxQuantity}
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 text-gray-400">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingCart className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-lg font-medium text-gray-900">
                No items in current sale
              </p>
              <p className="text-sm">Add products to get started</p>
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <>
            {/* Discount Section */}
            <div className="space-y-3 mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <div>
                <Label className="block text-sm font-medium mb-2 text-amber-800">
                  Discount (%)
                </Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={discountPercentage || ''}
                  onChange={(e) =>
                    onDiscountChange(parseFloat(e.target.value) || 0)
                  }
                  className="bg-white border-amber-300 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Totals Section */}
            <div className="space-y-3 border-t border-gray-200 pt-4">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal:</span>
                <span className="font-medium">₱{totalAmount.toFixed(2)}</span>
              </div>
              {discountPercentage > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Discount ({discountPercentage}%):</span>
                  <span className="font-medium">
                    -₱{discountAmount.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t border-gray-200">
                <span>Total:</span>
                <span className="text-blue-600">
                  ₱{discountedTotal.toFixed(2)}
                </span>
              </div>

              {/* Checkout Button */}
              <Button
                onClick={onCheckout}
                className="w-full mt-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 rounded-lg shadow-lg transition-all duration-200 transform hover:scale-[1.02] disabled:transform-none disabled:opacity-50"
                disabled={isProcessing || cart.length === 0}
                size="lg"
              >
                {isProcessing ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Processing...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" />
                    Process Sale
                  </div>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
