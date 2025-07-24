'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ProductCard } from '@/components/ProductCard';
import { getProducts } from '@/lib/actions/products';
import { processSale } from '@/lib/actions/sales';
import { db } from '@/database/drizzle';
import { eq } from 'drizzle-orm';
import { pharmacies } from '@/database/schema';
import { PrintUtility } from '@/lib/PrintUtility';

export default function POSPage() {
  const { data: session } = useSession();

  // State
  const [products, setProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<any[]>([]);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [cashReceived, setCashReceived] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pharmacyInfo, setPharmacyInfo] = useState<any>(null);

  // Fetch products and pharmacy info
  useEffect(() => {
    const fetchData = async () => {
      if (session?.user?.pharmacyId) {
        const productsData = await getProducts(session.user.pharmacyId);
        setProducts(productsData);

        const pharmacy = await db
          .select()
          .from(pharmacies)
          .where(eq(pharmacies.id, session.user.pharmacyId));
        setPharmacyInfo(pharmacy[0]);
      }
    };
    fetchData();
  }, [session]);

  // Filter products based on search term
  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Calculate totals
  const totalAmount = cart.reduce(
    (total, item) => total + item.unitPrice * item.quantity,
    0,
  );
  const discountAmount = (totalAmount * discountPercentage) / 100;
  const discountedTotal = totalAmount - discountAmount;
  const change = cashReceived - discountedTotal;

  // Cart functions
  const handleAddToCart = (product: any) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);
      if (existingItem) {
        const newQuantity = Math.min(
          existingItem.quantity + 1,
          product.quantity,
        );
        return prevCart.map((item) =>
          item.id === product.id ? { ...item, quantity: newQuantity } : item,
        );
      } else {
        return [
          ...prevCart,
          {
            ...product,
            quantity: 1,
            unitPrice: parseFloat(product.sellingPrice),
          },
        ];
      }
    });
  };

  const handleRemoveFromCart = (productId: number) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== productId));
  };

  const handleQuantityChange = (productId: number, newQuantity: number) => {
    const product = products.find((p) => p.id === productId);
    const maxQuantity = product?.quantity || 1;

    const validatedQuantity = Math.max(
      1,
      Math.min(maxQuantity, Math.floor(newQuantity) || 1),
    );

    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.id === productId) {
          return { ...item, quantity: validatedQuantity };
        }
        return item;
      }),
    );
  };

  // Payment functions
  const handleCheckout = async () => {
    setShowPaymentModal(true);
  };

  const processPayment = async () => {
    if (!session?.user?.pharmacyId || !session.user.id || cart.length === 0)
      return;
    if (cashReceived < discountedTotal) {
      toast.error('Insufficient cash received');
      return;
    }

    setIsProcessing(true);

    try {
      const result = await processSale(
        cart.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toString(),
        })),
        'CASH',
        discountAmount,
        session.user.pharmacyId,
        session.user.id,
        cashReceived,
      );

      if (result.success && result.data) {
        // Add check for result.data here
        toast.success('Sale processed successfully');

        const printSuccess = await PrintUtility.printDynamicReceipt(
          {
            invoiceNumber: result.data.invoiceNumber,
            createdAt: result.data.createdAt,
            totalAmount: result.data.totalAmount,
            discount: discountAmount,
            amountReceived: cashReceived,
            changeDue: Math.max(0, change),
          },
          cart.map((item) => ({
            ...item,
            unitPrice: parseFloat(item.unitPrice.toString()),
          })),
          pharmacyInfo,
        );

        if (!printSuccess) {
          toast.warning('Receipt printed with issues - sale was processed');
        }

        setCart([]);
        setCashReceived(0);
        setDiscountPercentage(0);
        setShowPaymentModal(false);

        const updatedProducts = await getProducts(session.user.pharmacyId);
        setProducts(updatedProducts);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to process sale');
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Product Grid */}
      <div className="lg:col-span-3">
        <div className="mb-4">
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-white"
          />
        </div>

        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={() => handleAddToCart(product)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No products found
          </div>
        )}
      </div>

      {/* Cart Section */}
      <div className="lg:col-span-1 bg-white p-4 rounded-lg shadow-sm border sticky top-4 h-fit">
        <h2 className="text-lg font-bold mb-4">Cart ({cart.length})</h2>

        <div className="space-y-4 mb-4 max-h-[400px] overflow-y-auto">
          {cart.length > 0 ? (
            cart.map((item) => {
              const product = products.find((p) => p.id === item.id);
              const maxQuantity = product?.quantity || 1;

              return (
                <div key={item.id} className="border-b pb-3 group">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{item.name}</h4>
                      <div className="text-sm text-gray-500">
                        ₱{item.unitPrice.toFixed(2)} × {item.quantity}
                        {maxQuantity > 0 && (
                          <span className="text-xs text-gray-400 ml-2">
                            (Max: {maxQuantity})
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveFromCart(item.id)}
                      className="text-red-500 hover:text-red-700 text-xl p-1 -mt-1 -mr-1 transition-opacity opacity-70 group-hover:opacity-100"
                      aria-label="Remove item"
                    >
                      &times;
                    </button>
                  </div>

                  <div className="flex items-center mt-2 gap-1">
                    <button
                      onClick={() =>
                        handleQuantityChange(item.id, item.quantity - 1)
                      }
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
                        handleQuantityChange(item.id, parseInt(e.target.value))
                      }
                      onBlur={(e) => {
                        if (!e.target.value || parseInt(e.target.value) < 1) {
                          handleQuantityChange(item.id, 1);
                        }
                      }}
                      className="w-12 h-8 text-center border-t border-b focus:outline-none focus:ring-1 focus:ring-primary"
                      aria-label="Quantity"
                    />
                    <button
                      onClick={() =>
                        handleQuantityChange(item.id, item.quantity + 1)
                      }
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
                    setDiscountPercentage(parseFloat(e.target.value) || 0)
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
                onClick={handleCheckout}
                className="w-full mt-4"
                disabled={isProcessing || cart.length === 0}
              >
                {isProcessing ? 'Processing...' : 'Process Sale'}
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
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
                  onChange={(e) =>
                    setCashReceived(parseFloat(e.target.value) || 0)
                  }
                  className="text-lg bg-white mb-2"
                  autoFocus
                />

                {/* Quick Cash Buttons */}
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {[20, 50, 100, 200, 500, 1000].map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() =>
                        setCashReceived((prev) => {
                          return prev < amount ? amount : prev + amount;
                        })
                      }
                      className="py-2 px-3 border rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                      ₱{amount}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCashReceived(discountedTotal)}
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
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowPaymentModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={processPayment}
                  disabled={cashReceived < discountedTotal || isProcessing}
                >
                  {isProcessing ? 'Processing...' : 'Confirm Payment'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
