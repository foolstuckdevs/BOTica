'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Search, Package, CheckCircle, X, ChevronLeft } from 'lucide-react';
import { createAdjustment } from '@/lib/actions/adjustment';
import { adjustmentReasonSchema } from '@/lib/validations/common';
import { Button } from './ui/button';
import { Input } from './ui/input';

// Form schema for client-side validation (only fields user fills out)
const adjustmentFormSchema = z.object({
  productId: z.number({ required_error: 'Please select a product.', invalid_type_error: 'Please select a product.' }).int().positive(),
  quantityChange: z
    .number({ required_error: 'Quantity change is required.', invalid_type_error: 'Quantity change is required.' })
    .int({ message: 'Quantity must be a whole number.' })
    .min(1, { message: 'Quantity must be at least 1.' })
    .max(9999, { message: 'Quantity cannot be greater than 9999.' }),
  adjustmentType: z.enum(['add', 'subtract'], { required_error: 'Please select adjustment type.' }),
  reason: z.string().min(1, 'Please select a reason.').refine(
    (val) => ['DAMAGED', 'EXPIRED', 'LOST_OR_STOLEN', 'STOCK_CORRECTION'].includes(val),
    { message: 'Please select a valid reason.' }
  ),
  notes: z.string().optional(),
});

type AdjustmentFormValues = z.infer<typeof adjustmentFormSchema>;
type AdjustmentReason = z.infer<typeof adjustmentReasonSchema>;

interface PendingAdjustment {
  productId: number;
  quantityChange: number;
  reason: AdjustmentReason;
  notes?: string;
  productName: string;
  currentStock: number;
  newStock: number;
  unit: string;
}

interface LightweightProduct {
  id: number;
  name: string;
  brandName: string | null;
  genericName: string | null;
  lotNumber: string | null;
  supplierName: string | null;
  quantity: number;
  expiryDate: string | Date | null;
  unit: string | null;
  minStockLevel: number | null;
}

interface AdjustmentFormProps {
  userId: string;
  pharmacyId: number;
}

const AdjustmentForm = ({ userId, pharmacyId }: AdjustmentFormProps) => {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] =
    useState<LightweightProduct | null>(null);
  const [pendingAdjustments, setPendingAdjustments] = useState<
    PendingAdjustment[]
  >([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [lookupResults, setLookupResults] = useState<LightweightProduct[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
    setValue,
  } = useForm<AdjustmentFormValues>({
    resolver: zodResolver(adjustmentFormSchema),
    defaultValues: {
      adjustmentType: 'subtract',
    },
  });

  const quantityChange = watch('quantityChange') || 0;
  const adjustmentType = watch('adjustmentType') || 'subtract';

  // (searchLower used in local ranking logic inside effect; not needed separately now)
  React.useEffect(() => {
    if (search.trim().length < 2) {
      setLookupResults([]);
      return;
    }
    const controller = new AbortController();
    const handle = setTimeout(async () => {
      setLookupLoading(true);
      setLookupError(null);
      try {
        const params = new URLSearchParams({
          search: search.trim(),
          limit: '20',
        });
        const res = await fetch(`/api/products/lookup?${params.toString()}`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!res.ok) throw new Error(`Lookup failed: ${res.status}`);
        const json = await res.json();
        const list: LightweightProduct[] = json.data || [];
        const lower = search.trim().toLowerCase();
        const ranked = list.slice().sort((a, b) => {
          // Prioritize out of stock products first
          const aOutOfStock = a.quantity === 0 ? 0 : 1;
          const bOutOfStock = b.quantity === 0 ? 0 : 1;
          if (aOutOfStock !== bOutOfStock) return aOutOfStock - bOutOfStock;

          const aNameMatch = a.name.toLowerCase().startsWith(lower) ? 0 : 1;
          const bNameMatch = b.name.toLowerCase().startsWith(lower) ? 0 : 1;
          if (aNameMatch !== bNameMatch) return aNameMatch - bNameMatch;
          const aExpiry = a.expiryDate
            ? new Date(a.expiryDate).getTime()
            : Infinity;
          const bExpiry = b.expiryDate
            ? new Date(b.expiryDate).getTime()
            : Infinity;
          return aExpiry - bExpiry;
        });
        setLookupResults(ranked);
      } catch (e) {
        if (!(e instanceof DOMException && e.name === 'AbortError')) {
          setLookupError(e instanceof Error ? e.message : 'Lookup failed');
        }
      } finally {
        setLookupLoading(false);
      }
    }, 250);
    return () => {
      controller.abort();
      clearTimeout(handle);
    };
  }, [search]);
  const filteredProducts = search.length >= 2 ? lookupResults : [];

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    setIsSearching(value.length >= 2);
    if (selectedProduct && value.length >= 2) setSelectedProduct(null);
  };

  const selectProduct = (product: LightweightProduct) => {
    setSelectedProduct(product);
    setValue('productId', product.id);
    setIsSearching(false);
  };

  const onSubmit = (data: AdjustmentFormValues) => {
    if (!selectedProduct) return;

    // Apply sign based on adjustmentType toggle
    const effectiveQuantityChange = data.adjustmentType === 'subtract'
      ? -Math.abs(data.quantityChange)
      : Math.abs(data.quantityChange);

    // Prevent negative stock
    const projectedStock = selectedProduct.quantity + effectiveQuantityChange;
    if (projectedStock < 0) {
      toast.error(
        `Cannot remove ${Math.abs(effectiveQuantityChange)} — only ${selectedProduct.quantity} in stock.`,
      );
      return;
    }

    // Check if this product already has a pending adjustment
    const existingIndex = pendingAdjustments.findIndex(
      (adj) => adj.productId === data.productId,
    );

    if (existingIndex !== -1) {
      // Update existing adjustment - combine quantities
      setPendingAdjustments((prev) => {
        const updated = [...prev];
        const existing = updated[existingIndex];
        const combinedQuantityChange =
          existing.quantityChange + effectiveQuantityChange;
        updated[existingIndex] = {
          ...existing,
          quantityChange: combinedQuantityChange,
          newStock: existing.currentStock + combinedQuantityChange,
          reason: data.reason as AdjustmentReason, // Use the latest reason
          notes: data.notes
            ? existing.notes
              ? `${existing.notes}; ${data.notes}`
              : data.notes
            : existing.notes,
        };
        return updated;
      });
      toast.success('Adjustment updated for this product');
    } else {
      // Add new adjustment
      const newAdjustment: PendingAdjustment = {
        productId: data.productId,
        quantityChange: effectiveQuantityChange,
        reason: data.reason as AdjustmentReason,
        notes: data.notes,
        productName: selectedProduct.name,
        currentStock: selectedProduct.quantity,
        newStock: selectedProduct.quantity + effectiveQuantityChange,
        unit: selectedProduct.unit || 'units',
      };
      setPendingAdjustments((prev) => [...prev, newAdjustment]);
      toast.success('Adjustment added to pending list');
    }

    reset();
    setSelectedProduct(null);
    setSearch('');
    setIsSearching(false);
  };

  const submitAllAdjustments = async () => {
    if (pendingAdjustments.length === 0) return;

    try {
      setLoading(true);

      for (const adj of pendingAdjustments) {
        const res = await createAdjustment({
          productId: adj.productId,
          quantityChange: adj.quantityChange,
          reason: adj.reason,
          notes: adj.notes,
          userId,
          pharmacyId,
        });

        if (!res.success) {
          toast.error(res.message || 'Adjustment failed');
          return;
        }
      }

      setPendingAdjustments([]);
      setShowConfirmation(true);
      toast.success('All adjustments submitted successfully');
      setTimeout(() => router.push('/inventory/adjustments'), 1500);
    } catch (error) {
      console.error('Adjustment error:', error);
      toast.error('Something went wrong while submitting.');
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setSearch('');
    setSelectedProduct(null);
    setIsSearching(false);
  };

  const removePendingAdjustment = (index: number) => {
    setPendingAdjustments(pendingAdjustments.filter((_, i) => i !== index));
    toast.info('Adjustment removed from pending list');
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      <Button
        variant="ghost"
        onClick={() => router.push('/inventory/adjustments')}
        className="group flex items-center gap-2 rounded-full text-sm text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
      >
        <ChevronLeft className="w-4 h-4 group-hover:translate-x-[-2px] transition-transform" />
        <span>Back to Adjustments</span>
      </Button>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Inventory Adjustments
            </h1>
            <p className="text-sm text-gray-500">
              Update stock levels and track changes
            </p>
          </div>
        </div>

        {showConfirmation && (
          <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg border border-green-100">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Submitted successfully!</span>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Search & Adjustment Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Search box */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium text-gray-900">
                Search Products
              </h2>
              {pendingAdjustments.length > 0 && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {pendingAdjustments.length} pending adjustment
                  {pendingAdjustments.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                placeholder="Search by name, brand, lot number, or generic name..."
                value={search}
                onChange={handleSearchChange}
                className="pl-10 pr-10 py-3 h-auto"
              />
              {search && (
                <button
                  onClick={clearSearch}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Clear search"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
            {lookupLoading && search.length >= 2 && (
              <div className="mt-2 text-xs text-muted-foreground">
                Searching...
              </div>
            )}
            {lookupError && (
              <div className="mt-2 text-xs text-red-600">{lookupError}</div>
            )}

            {isSearching && (
              <div className="mt-6 space-y-2 max-h-96 overflow-y-auto">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => selectProduct(product)}
                      className="w-full text-left p-4 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all duration-200 group"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                              {product.name}
                            </p>
                            {product.brandName && (
                              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full border border-blue-200">
                                {product.brandName}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Package className="w-3 h-3" />
                              {product.quantity} {product.unit || 'units'}
                            </span>
                            {product.lotNumber && (
                              <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-mono">
                                {product.lotNumber}
                              </span>
                            )}
                            {product.expiryDate && (
                              <span className="text-amber-600 text-xs">
                                Exp:{' '}
                                {new Date(
                                  product.expiryDate,
                                ).toLocaleDateString('en-US', {
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          {product.minStockLevel && (
                            <div className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded-full border border-orange-200">
                              Min: {product.minStockLevel}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">No products found</p>
                    <p className="text-sm mt-1">
                      Try searching by name, brand, batch number, or supplier
                    </p>
                  </div>
                )}
              </div>
            )}

            {!isSearching && !selectedProduct && (
              <div className="text-center py-8 text-gray-400">
                <Package className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <h3 className="text-base font-medium text-gray-500">
                  Search for products to adjust
                </h3>
                <p className="text-sm mt-1">
                  Enter at least 2 characters to begin searching
                </p>
              </div>
            )}
          </div>

          {/* Adjustment Form */}
          {selectedProduct && (
            <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-800">
                  Adjust Stock: {selectedProduct.name}
                </h3>
                <button
                  onClick={() => {
                    setSelectedProduct(null);
                    setSearch('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                    Current
                  </div>
                  <div className="text-lg font-semibold text-gray-800">
                    {selectedProduct.quantity}{' '}
                    {(selectedProduct.unit || 'units').toLowerCase()}
                  </div>
                </div>

                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                  <div className="text-xs font-medium text-blue-500 uppercase tracking-wider mb-1">
                    Adjustment
                  </div>
                  {(() => {
                    const isReduction = adjustmentType === 'subtract';
                    const effectiveChange = isReduction
                      ? -Math.abs(quantityChange)
                      : Math.abs(quantityChange);
                    return (
                      <div
                        className={`text-lg font-semibold ${
                          effectiveChange >= 0 ? 'text-blue-600' : 'text-red-600'
                        }`}
                      >
                        {effectiveChange >= 0 ? '+' : ''}
                        {effectiveChange}
                      </div>
                    );
                  })()}
                </div>

                <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                  <div className="text-xs font-medium text-green-500 uppercase tracking-wider mb-1">
                    New Stock
                  </div>
                  {(() => {
                    const isReduction = adjustmentType === 'subtract';
                    const effectiveChange = isReduction
                      ? -Math.abs(quantityChange)
                      : Math.abs(quantityChange);
                    const newStock = selectedProduct.quantity + effectiveChange;
                    return (
                      <div className={`text-lg font-semibold ${newStock < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {Math.max(0, newStock)}{' '}
                        {(selectedProduct.unit || 'units').toLowerCase()}
                      </div>
                    );
                  })()}
                </div>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Hidden productId field */}
                <input
                  type="hidden"
                  {...register('productId', { valueAsNumber: true })}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adjustment Type <span className="text-red-500">*</span>
                  </label>
                  <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setValue('adjustmentType', 'add')}
                      className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                        adjustmentType === 'add'
                          ? 'bg-green-500 text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      + Add Stock
                    </button>
                    <button
                      type="button"
                      onClick={() => setValue('adjustmentType', 'subtract')}
                      className={`flex-1 px-4 py-2 text-sm font-medium transition-colors border-l border-gray-300 ${
                        adjustmentType === 'subtract'
                          ? 'bg-red-500 text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      − Subtract Stock
                    </button>
                  </div>
                  {errors.adjustmentType && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.adjustmentType.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    {...register('quantityChange', { valueAsNumber: true })}
                    placeholder="e.g. 5"
                    min={1}
                    max={9999}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />

                  {errors.quantityChange && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.quantityChange.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register('reason')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select adjustment reason</option>
                    {[
                      { value: 'DAMAGED', label: 'Damaged Product' },
                      { value: 'EXPIRED', label: 'Expired Product' },
                      { value: 'LOST_OR_STOLEN', label: 'Lost or Stolen' },
                      { value: 'STOCK_CORRECTION', label: 'Stock Correction' },
                    ].map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                  {errors.reason && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.reason.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (optional)
                  </label>
                  <textarea
                    {...register('notes')}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Add any additional details..."
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => {
                      setSelectedProduct(null);
                      setSearch('');
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1">
                    Add to Pending
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Right Column - Pending Adjustments */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-800">
                Pending Adjustments
              </h3>
              {pendingAdjustments.length > 0 && (
                <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full">
                  {pendingAdjustments.length}
                </span>
              )}
            </div>

            {pendingAdjustments.length > 0 ? (
              <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
                {pendingAdjustments.map((adj, index) => (
                  <div
                    key={index}
                    className="group relative bg-gray-50 rounded-lg p-3 border border-gray-200 hover:border-gray-300 transition"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <div className="font-medium text-gray-900">
                          {adj.productName}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-gray-600">
                            {adj.currentStock} →{' '}
                            <span className="font-semibold">
                              {adj.newStock}
                            </span>{' '}
                            {adj.unit.toLowerCase()}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              adj.quantityChange > 0
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {adj.quantityChange > 0 ? '+' : ''}
                            {adj.quantityChange}
                          </span>
                        </div>
                        <div className="mt-2">
                          <span className="text-xs font-medium text-gray-500">
                            {adj.reason}
                          </span>
                          {adj.notes && (
                            <p className="mt-1 text-xs text-gray-500 line-clamp-2">
                              {adj.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => removePendingAdjustment(index)}
                        className="text-gray-400 hover:text-red-500 transition"
                        aria-label="Remove adjustment"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Package className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <h3 className="text-base font-medium text-gray-500">
                  No pending adjustments
                </h3>
                <p className="text-sm mt-1">
                  Add adjustments from the search panel
                </p>
              </div>
            )}

            {pendingAdjustments.length > 0 && (
              <Button
                onClick={submitAllAdjustments}
                disabled={loading}
                className="w-full mt-4"
                size="lg"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  `Submit All Adjustments`
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdjustmentForm;
