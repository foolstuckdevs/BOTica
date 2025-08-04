'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { ProductCard } from '@/components/ProductCard';
import { Cart, CartItem } from '@/components/Cart';
import { PaymentModal } from '@/components/PaymentModal';
import { Search, Package } from 'lucide-react';
import type { Pharmacy, ProductPOS } from '@/types';
import { processSale } from '@/lib/actions/sales';
import { PrintUtility } from '@/lib/PrintUtility';

interface POSPageProps {
  products: ProductPOS[];
  pharmacyInfo: Pharmacy | null;
  pharmacyId: number;
  userId: string; // Pass userId from server component
  userName: string; // Pass userName from server component
}

export default function POSPage({
  products: initialProducts,
  pharmacyInfo,
  pharmacyId,
  userId,
  userName,
}: POSPageProps) {
  const [products, setProducts] = useState<ProductPOS[]>(initialProducts);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [cashReceived, setCashReceived] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const searchLower = searchTerm.toLowerCase();
  // Filter products based on search term and hide out-of-stock products unless searched
  const filteredProducts = products
    .filter((product) => {
      // If no search term, only show in-stock products
      if (!searchTerm || searchTerm.length < 2) {
        return product.quantity > 0; // Hide out-of-stock products by default
      }

      // Check if product matches search criteria
      const matchesSearch =
        product.name.toLowerCase().includes(searchLower) ||
        (product.brandName &&
          product.brandName.toLowerCase().includes(searchLower)) ||
        (product.lotNumber &&
          product.lotNumber.toLowerCase().includes(searchLower));

      // If product doesn't match search, exclude it
      if (!matchesSearch) return false;

      // If product is out-of-stock, only show it if search specifically matches it
      if (product.quantity <= 0) {
        // Allow out-of-stock products only if search term closely matches name, brand, or lot
        return (
          product.name.toLowerCase().includes(searchLower) ||
          (product.brandName &&
            product.brandName.toLowerCase().includes(searchLower)) ||
          (product.lotNumber &&
            product.lotNumber.toLowerCase().includes(searchLower))
        );
      }

      // Show in-stock products that match search
      return true;
    })
    .sort((a, b) => {
      // Step 1: Prioritize exact/startsWith name matches
      const aNameMatch = a.name.toLowerCase().startsWith(searchLower) ? 0 : 1;
      const bNameMatch = b.name.toLowerCase().startsWith(searchLower) ? 0 : 1;

      if (aNameMatch !== bNameMatch) return aNameMatch - bNameMatch;

      // Step 2: Sort by soonest expiry (FEFO)
      const aExpiry = new Date(a.expiryDate).getTime();
      const bExpiry = new Date(b.expiryDate).getTime();
      return aExpiry - bExpiry;
    });

  // Calculate totals
  const totalAmount = cart.reduce(
    (total, item) => total + item.unitPrice * item.quantity,
    0,
  );
  const discountAmount = (totalAmount * discountPercentage) / 100;
  const discountedTotal = totalAmount - discountAmount;
  const change = cashReceived - discountedTotal;

  // Sale functions
  const handleAddToCart = (product: ProductPOS) => {
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
            id: product.id,
            name: product.name,
            brandName: product.brandName,
            lotNumber: product.lotNumber,
            expiryDate: product.expiryDate,
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

  const handleDiscountChange = (discount: number) => {
    setDiscountPercentage(discount);
  };

  // Payment functions
  const handleCheckout = async () => {
    setShowPaymentModal(true);
  };

  const handleCashChange = (amount: number) => {
    setCashReceived(amount);
  };

  const handleCancelPayment = () => {
    setShowPaymentModal(false);
  };

  const handleConfirmPayment = async () => {
    if (!pharmacyId || cart.length === 0) return;
    if (cashReceived < discountedTotal) {
      toast.error('Insufficient cash received');
      return;
    }

    // Prevent multiple executions
    if (isProcessing) {
      console.log('Payment already processing, skipping...');
      return;
    }

    // Validate user
    if (!userId) {
      toast.error('User authentication required.');
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
        pharmacyId,
        userId,
        cashReceived,
      );
      if (result.success && result.data) {
        toast.success('Sale processed successfully');
        if (pharmacyInfo) {
          const printSuccess = await PrintUtility.printDynamicReceipt(
            {
              id: 0, // Placeholder ID since this is for printing
              invoiceNumber: result.data.invoiceNumber,
              createdAt: result.data.createdAt || new Date(),
              totalAmount: result.data.totalAmount,
              discount: discountAmount.toString(),
              paymentMethod: 'CASH' as const,
              amountReceived: cashReceived,
              changeDue: Math.max(0, change),
              user: {
                fullName: userName,
              },
              items: [], // Will be passed separately as second parameter
            },
            cart.map((item) => ({
              id: item.id,
              productName: item.name,
              quantity: item.quantity,
              unitPrice: item.unitPrice.toString(),
              subtotal: (item.unitPrice * item.quantity).toString(),
            })),
            pharmacyInfo,
          );
          if (!printSuccess) {
            toast.warning('Receipt printed with issues - sale was processed');
          }
        }

        // Update product quantities after successful sale
        setProducts((prevProducts) =>
          prevProducts.map((product) => {
            const cartItem = cart.find((item) => item.id === product.id);
            if (cartItem) {
              return {
                ...product,
                quantity: Math.max(0, product.quantity - cartItem.quantity),
              };
            }
            return product;
          }),
        );

        setCart([]);
        setCashReceived(0);
        setDiscountPercentage(0);
        setShowPaymentModal(false);
        // Optionally, re-fetch products here if needed
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Product Grid */}
          <div className="lg:col-span-3 space-y-4">
            {/* Enhanced Search Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Search className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Search Products
                </h2>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search by name, brand, or lot number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12 bg-gray-50 border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-base"
                />
              </div>
            </div>

            {/* Product Summary */}
            {searchTerm && filteredProducts.length > 0 && (
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200 shadow-sm p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Package className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-800 font-medium">
                      Found {filteredProducts.length} products
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      🟢 Good • 🟡 Soon to Expire • 🔴 Sell First
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Products Grid */}
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
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
                <div className="text-center text-gray-500">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium mb-2 text-gray-900">
                    {searchTerm
                      ? 'No products found'
                      : 'Start searching for products'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {searchTerm
                      ? 'Try adjusting your search terms or browse all products'
                      : 'Enter a product name, brand, or lot number to begin'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Current Sale Section */}
          <div className="lg:col-span-1">
            <Cart
              cart={cart}
              products={products}
              discountPercentage={discountPercentage}
              isProcessing={isProcessing}
              totalAmount={totalAmount}
              discountAmount={discountAmount}
              discountedTotal={discountedTotal}
              onRemoveFromCart={handleRemoveFromCart}
              onQuantityChange={handleQuantityChange}
              onDiscountChange={handleDiscountChange}
              onCheckout={handleCheckout}
            />
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        show={showPaymentModal}
        discountedTotal={discountedTotal}
        cashReceived={cashReceived}
        change={change}
        isProcessing={isProcessing}
        onCashChange={handleCashChange}
        onCancel={handleCancelPayment}
        onConfirm={handleConfirmPayment}
      />
    </div>
  );
}
