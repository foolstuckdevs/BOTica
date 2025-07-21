// app/(root)/sales/pos/page.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ProductCard } from '@/components/ProductCard';
import { Receipt } from '@/components/Receipt';
import { getProducts } from '@/lib/actions/products';
import { processSale } from '@/lib/actions/sales';
import { db } from '@/database/drizzle';
import { eq } from 'drizzle-orm';
import { pharmacies } from '@/database/schema';

export default function POSPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const receiptRef = useRef<HTMLDivElement>(null);

  // State
  const [products, setProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<any[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'GCASH'>('CASH');
  const [discount, setDiscount] = useState(0);
  const [cashReceived, setCashReceived] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [currentSale, setCurrentSale] = useState<any>(null);
  const [pharmacyInfo, setPharmacyInfo] = useState<any>(null);

  // Fetch products and pharmacy info
  useEffect(() => {
    const fetchData = async () => {
      if (session?.user?.pharmacyId) {
        // Fetch products
        const productsData = await getProducts(session.user.pharmacyId);
        setProducts(productsData);

        // Fetch pharmacy info
        const pharmacy = await db
          .select()
          .from(pharmacies)
          .where(eq(pharmacies.id, session.user.pharmacyId));
        setPharmacyInfo(pharmacy[0]);
      }
    };
    fetchData();
  }, [session]);

  // Print handler
  const handlePrint = useReactToPrint({
    content: () => receiptRef.current,
    pageStyle: `
      @page { size: 80mm 100mm; margin: 0; }
      @media print { 
        body { -webkit-print-color-adjust: exact; padding: 0; margin: 0; }
        html, body { height: 100%; overflow: hidden; }
      }
    `,
    onAfterPrint: () => setCurrentSale(null),
  });

  // Trigger print when currentSale changes
  useEffect(() => {
    if (currentSale) {
      handlePrint();
    }
  }, [currentSale, handlePrint]);

  // Filter products based on search term
  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Calculate totals
  const totalAmount = cart.reduce(
    (total, item) => total + item.unitPrice * item.quantity,
    0,
  );
  const discountedTotal = totalAmount - discount;
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
    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.id === productId) {
          const product = products.find((p) => p.id === productId);
          const validatedQuantity = Math.min(
            Math.max(1, newQuantity),
            product?.quantity || 1,
          );
          return { ...item, quantity: validatedQuantity };
        }
        return item;
      }),
    );
  };

  // Payment functions
  const handleCheckout = async () => {
    if (paymentMethod === 'CASH') {
      setShowPaymentModal(true);
    } else {
      await processPayment();
    }
  };

  const processPayment = async () => {
    if (!session?.user?.pharmacyId || !session.user.id || cart.length === 0)
      return;
    if (paymentMethod === 'CASH' && cashReceived < discountedTotal) {
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
        paymentMethod,
        discount,
        session.user.pharmacyId,
        session.user.id,
        cashReceived,
      );

      if (result.success) {
        toast.success('Sale processed successfully');
        setCurrentSale({
          ...result.data,
          items: cart.map((item) => ({
            ...item,
            unitPrice: item.unitPrice.toString(),
          })),
        });
        setCart([]);
        setCashReceived(0);
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
            cart.map((item) => (
              <div key={item.id} className="border-b pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-medium">{item.name}</h4>
                    <div className="text-sm text-gray-500">
                      ₱{item.unitPrice.toFixed(2)} × {item.quantity}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveFromCart(item.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    ×
                  </button>
                </div>

                <div className="flex items-center mt-2">
                  <button
                    onClick={() =>
                      handleQuantityChange(item.id, item.quantity - 1)
                    }
                    className="w-8 h-8 flex items-center justify-center border rounded-l"
                    disabled={item.quantity <= 1}
                  >
                    -
                  </button>
                  <div className="w-10 h-8 flex items-center justify-center border-t border-b">
                    {item.quantity}
                  </div>
                  <button
                    onClick={() =>
                      handleQuantityChange(item.id, item.quantity + 1)
                    }
                    className="w-8 h-8 flex items-center justify-center border rounded-r"
                    disabled={
                      item.quantity >=
                      (products.find((p) => p.id === item.id)?.quantity || 0)
                    }
                  >
                    +
                  </button>
                </div>

                <div className="text-right font-bold mt-1">
                  ₱{(item.unitPrice * item.quantity).toFixed(2)}
                </div>
              </div>
            ))
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
                  Payment Method
                </Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CASH')}
                    className={`flex-1 py-2 border rounded-md ${
                      paymentMethod === 'CASH'
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white'
                    }`}
                  >
                    Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('GCASH')}
                    className={`flex-1 py-2 border rounded-md ${
                      paymentMethod === 'GCASH'
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white'
                    }`}
                  >
                    GCash
                  </button>
                </div>
              </div>

              <div>
                <Label className="block text-sm font-medium mb-1">
                  Discount (₱)
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  className="bg-white"
                />
              </div>
            </div>

            <div className="space-y-2 border-t pt-4">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₱{totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Discount:</span>
                <span className="text-red-500">-₱{discount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
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
                  className="text-lg bg-white"
                  autoFocus
                />
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

      {/* Hidden receipt for printing */}
      <div className="hidden">
        {currentSale && pharmacyInfo && (
          <Receipt
            ref={receiptRef}
            sale={currentSale}
            items={currentSale.items}
            pharmacy={pharmacyInfo}
          />
        )}
      </div>
    </div>
  );
}
function useReactToPrint(arg0: {
  content: () => HTMLDivElement | null;
  pageStyle: string;
  onAfterPrint: () => void;
}) {
  throw new Error('Function not implemented.');
}
