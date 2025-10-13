'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  // Initial products deprecated: passing empty array; dynamic lookup used instead
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
  // Products now loaded on demand via lookup endpoint
  const [products, setProducts] = useState<ProductPOS[]>(initialProducts);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingLookup, setLoadingLookup] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [cashReceived, setCashReceived] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  // Pagination state for POS incremental listing
  const [offset, setOffset] = useState(0);
  const pageSize = 40; // unified page size (initial & subsequent)
  const [hasMore, setHasMore] = useState(true);
  const [pendingSearchTerm, setPendingSearchTerm] = useState<string | null>(
    null,
  );
  const initialLoadedRef = useRef(false);
  const previousSearchRef = useRef('');
  const SEARCH_DEBOUNCE_MS = 150;

  const trimmedSearch = searchTerm.trim();
  const searchLower = trimmedSearch.toLowerCase();

  // Helper utilities
  const hasSearchQuery = trimmedSearch.length >= 2;
  const isTypingQuery = pendingSearchTerm !== null;
  const isSearchLoading = hasSearchQuery && (loadingLookup || isTypingQuery);
  const mergeUniqueProducts = (
    existing: ProductPOS[],
    incoming: ProductPOS[],
  ): ProductPOS[] => {
    if (incoming.length === 0) return existing;
    const map = new Map<number, ProductPOS>();
    for (const p of existing) map.set(p.id, p);
    for (const p of incoming) map.set(p.id, p);
    return Array.from(map.values());
  };
  // Helper: add product to cart (single unit or increment) used by cards
  const addProductToCart = (product: ProductPOS) => {
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

  // Derived filtered list (still client-side pass) after remote fetch
  const filteredProducts = useMemo(() => {
    const hasSearch = trimmedSearch.length >= 2;
    const includesTerm = (value?: string | null) =>
      value ? value.toLowerCase().includes(searchLower) : false;

    return products
      .filter((product) => {
        // If no active search, only show in-stock products
        if (!hasSearch || trimmedSearch.length < 2) {
          return product.quantity > 0; // Hide out-of-stock products by default
        }

        // Check if product matches search criteria
        const matchesSearch =
          includesTerm(product.name) ||
          includesTerm(product.brandName) ||
          includesTerm(product.genericName) ||
          includesTerm(product.lotNumber) ||
          includesTerm(product.supplierName);

        // If product doesn't match search, exclude it
        if (!matchesSearch) return false;

        // If product is out-of-stock, only show it if search specifically matches it
        if (product.quantity <= 0) {
          return matchesSearch;
        }

        // Show in-stock products that match search
        return true;
      })
      .sort((a, b) => {
        const scoreStartsWith = (product: ProductPOS) => {
          if (searchLower.length < 1) return 3;
          const candidates = [
            product.name,
            product.brandName || '',
            product.genericName || '',
            product.supplierName || '',
          ];
          const foundIndex = candidates.findIndex((value) =>
            value.toLowerCase().startsWith(searchLower),
          );
          return foundIndex === -1 ? candidates.length : foundIndex;
        };

        const aScore = scoreStartsWith(a);
        const bScore = scoreStartsWith(b);
        if (aScore !== bScore) return aScore - bScore;

        // Step 2: Sort by soonest expiry (FEFO)
        const aExpiry = a.expiryDate
          ? new Date(a.expiryDate).getTime()
          : Infinity;
        const bExpiry = b.expiryDate
          ? new Date(b.expiryDate).getTime()
          : Infinity;
        return aExpiry - bExpiry;
      });
  }, [products, trimmedSearch, searchLower]);

  // Unified fetch function
  interface FetchParams {
    query?: string;
    offset?: number;
    limit?: number;
    signal?: AbortSignal;
  }
  const fetchProducts = useCallback(
    async ({ query, offset = 0, limit = pageSize, signal }: FetchParams) => {
      const params = new URLSearchParams();
      params.set('limit', String(limit));
      params.set('offset', String(offset));
      if (query) params.set('query', query);
      const res = await fetch(`/api/pos/lookup?${params.toString()}`, {
        cache: 'no-store',
        signal,
      });
      if (!res.ok) throw new Error(`Lookup failed: ${res.status}`);
      const json = await res.json();
      return (json.data || []) as ProductPOS[];
    },
    [pageSize],
  );

  // Initial load: fetch first page immediately (no debounce) to avoid empty grid flash.
  // Subsequent typed searches are debounced in separate effect below.
  useEffect(() => {
    const term = trimmedSearch;
    const previousTerm = previousSearchRef.current;
    previousSearchRef.current = term;

    const isInitialLoadPending = !initialLoadedRef.current;
    const clearedSearch = term.length === 0 && previousTerm.length > 0;
    if (!isInitialLoadPending && !clearedSearch) {
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoadingLookup(true);
    fetchProducts({ offset: 0, limit: pageSize, signal: controller.signal })
      .then((list) => {
        setProducts(list);
        setOffset(list.length);
        setHasMore(list.length === pageSize);
        initialLoadedRef.current = true;
      })
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        const msg = e instanceof Error ? e.message : 'Initial load error';
        toast.error(msg);
      })
      .finally(() => setLoadingLookup(false));
  }, [trimmedSearch, fetchProducts, pageSize]);
  // Lookup effect (debounced name/brand/lot query)
  useEffect(() => {
    const term = trimmedSearch;
    if (term.length === 0) {
      setPendingSearchTerm(null);
      return;
    }
    if (term.length < 2) {
      setPendingSearchTerm(null);
      return; // enforce minimal chars
    }
    setPendingSearchTerm(term);
    const handle = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoadingLookup(true);
      fetchProducts({
        query: term,
        offset: 0,
        limit: pageSize,
        signal: controller.signal,
      })
        .then((list) => {
          setProducts(list);
          setOffset(list.length);
          setHasMore(list.length === pageSize);
        })
        .catch((e: unknown) => {
          if (e instanceof DOMException && e.name === 'AbortError') return;
          const msg = e instanceof Error ? e.message : 'Lookup error';
          toast.error(msg);
        })
        .finally(() => {
          setLoadingLookup(false);
          if (trimmedSearch === term) {
            setPendingSearchTerm(null);
          }
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [trimmedSearch, pageSize, products.length, fetchProducts]);

  // Load more handler (for current mode: search results if active, else base listing)
  const handleLoadMore = () => {
    if (loadingLookup || !hasMore) return;
    const term = trimmedSearch;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoadingLookup(true);
    fetchProducts({
      query: term.length >= 2 ? term : undefined,
      offset,
      limit: pageSize,
      signal: controller.signal,
    })
      .then((list) => {
        setProducts((prev) => mergeUniqueProducts(prev, list));
        setOffset((o) => o + list.length);
        setHasMore(list.length === pageSize);
      })
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        const msg = e instanceof Error ? e.message : 'Load more error';
        toast.error(msg);
      })
      .finally(() => setLoadingLookup(false));
  };

  // Calculate totals
  const totalAmount = cart.reduce(
    (total, item) => total + item.unitPrice * item.quantity,
    0,
  );
  const discountAmount = (totalAmount * discountPercentage) / 100;
  const discountedTotal = totalAmount - discountAmount;
  const change = cashReceived - discountedTotal;

  // Sale functions
  // NOTE: Render lookup status near search input (minimal inline feedback)
  // (Search input JSX insertion point not yet implemented)
  const handleAddToCart = addProductToCart;

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
    if (cart.length === 0) return;
    try {
      const res = await fetch('/api/pos/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartItems: cart.map((c) => ({
            productId: c.id,
            quantity: c.quantity,
            unitPrice: c.unitPrice.toFixed(2),
          })),
        }),
      });
      if (!res.ok) {
        toast.error('Validation failed');
        return;
      }
      const json = await res.json();
      if (!json.ok) {
        toast.error('Validation error');
        return;
      }
      if (json.issues && json.issues.length > 0) {
        const first = json.issues[0];
        const label = first.productId;
        const issueMap: Record<string, string> = {
          NOT_FOUND: 'Product not found',
          INSUFFICIENT_STOCK: 'Insufficient stock',
          PRICE_CHANGED: 'Price changed',
          EXPIRED: 'Product expired',
        };
        toast.error(
          `Cannot proceed: ${
            issueMap[first.issue] || first.issue
          } (ID ${label})`,
        );
        return;
      }
      // Passed validation – generate idempotency key for this checkout session
      setIdempotencyKey(
        `sale_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      );
      setShowPaymentModal(true);
    } catch (e) {
      console.error(e);
      toast.error('Preflight validation failed');
    }
  };

  const handleCashChange = (amount: number) => {
    setCashReceived(amount);
  };

  const handleCancelPayment = () => {
    setShowPaymentModal(false);
    setIdempotencyKey(null);
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
    // Pre-open a print window synchronously to avoid popup blockers
    let preOpened: Window | null = null;
    try {
      if (pharmacyInfo) {
        preOpened = window.open('', '_blank', 'width=800,height=1000');
      }
    } catch {}
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
        idempotencyKey || undefined,
      );
      if (result.success && result.data) {
        type FullSaleData = {
          invoiceNumber: string;
          createdAt?: Date | string | null;
          totalAmount?: string;
          amountReceived?: string;
          changeDue?: string;
        };
        const dataObj = result.data as
          | FullSaleData
          | { id: number; invoiceNumber: string };
        const replayed = dataObj.invoiceNumber === 'REPLAYED';
        toast.success(
          replayed
            ? 'Sale already processed (idempotent replay)'
            : 'Sale processed successfully',
        );
        // Let interested components (like Notification) know to refresh counts/lists
        try {
          window.dispatchEvent(new CustomEvent('notifications:refresh'));
        } catch {}
        if (pharmacyInfo) {
          const printSuccess = await PrintUtility.printDynamicReceipt(
            {
              id: 0,
              invoiceNumber: dataObj.invoiceNumber,
              createdAt: (dataObj as FullSaleData).createdAt || new Date(),
              totalAmount:
                (dataObj as FullSaleData).totalAmount ||
                discountedTotal.toFixed(2),
              discount: discountAmount.toString(),
              paymentMethod: 'CASH' as const,
              amountReceived:
                (dataObj as FullSaleData).amountReceived ||
                cashReceived.toFixed(2),
              changeDue:
                (dataObj as FullSaleData).changeDue ||
                Math.max(0, change).toFixed(2),
              user: { fullName: userName },
              items: [],
            },
            cart.map((item) => ({
              id: item.id,
              productName: item.name,
              quantity: item.quantity,
              unitPrice: item.unitPrice.toString(),
              subtotal: (item.unitPrice * item.quantity).toString(),
            })),
            pharmacyInfo,
            preOpened,
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
        setIdempotencyKey(null);
        // Optionally, re-fetch products here if needed
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to process sale');
      console.error(error);
    } finally {
      setIsProcessing(false);
      // Do not clear idempotencyKey here on error; allow retry to reuse same key
    }
  };

  const showSearchSummary =
    trimmedSearch.length > 0 && filteredProducts.length > 0;
  const isBelowMinimumSearchLength =
    trimmedSearch.length > 0 && trimmedSearch.length < 2;
  const showNoResults =
    hasSearchQuery && filteredProducts.length === 0 && !isSearchLoading;
  const hasInventory = products.length > 0;

  const emptyStateTitle = isSearchLoading
    ? 'Searching…'
    : showNoResults
    ? 'No products found'
    : isBelowMinimumSearchLength
    ? 'Keep typing to search'
    : hasInventory
    ? 'Start searching for products'
    : 'No products available yet';

  const emptyStateDescription = isSearchLoading
    ? 'Fetching matching products, just a moment.'
    : showNoResults
    ? 'Try adjusting your search terms or verify spelling.'
    : isBelowMinimumSearchLength
    ? 'Enter at least two characters to see matching results.'
    : hasInventory
    ? 'Enter a product name, brand, or lot number to begin.'
    : 'Add products to your inventory to start selling from the POS.';

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
                {isSearchLoading && (
                  <div className="absolute inset-y-0 right-4 flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="h-4 w-4 rounded-full border-2 border-gray-300 border-t-blue-600 animate-spin" />
                    <span className="hidden sm:inline">Searching…</span>
                  </div>
                )}
              </div>
            </div>

            {/* Product Summary */}
            {showSearchSummary && (
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
            {isSearchLoading && filteredProducts.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-16 relative min-h-[240px] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="h-12 w-12 rounded-full border-4 border-gray-200 border-t-blue-600 animate-spin" />
                  <p className="text-sm text-gray-500 tracking-wide">
                    Searching...
                  </p>
                </div>
              </div>
            ) : filteredProducts.length > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onAddToCart={() => handleAddToCart(product)}
                    />
                  ))}
                </div>
                {hasMore && (
                  <div className="flex justify-center mt-6">
                    <button
                      onClick={handleLoadMore}
                      disabled={loadingLookup}
                      className="px-6 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-sm font-medium shadow-sm disabled:opacity-50"
                    >
                      {loadingLookup ? 'Loading...' : 'Load More'}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
                <div className="text-center text-gray-500">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium mb-2 text-gray-900">
                    {emptyStateTitle}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {emptyStateDescription}
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
