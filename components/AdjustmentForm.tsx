'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { getSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Search, Package, CheckCircle, X, ChevronLeft } from 'lucide-react';
import { createAdjustment } from '@/lib/actions/adjustment';
import { adjustmentSchema } from '@/lib/validation';
import { Button } from './ui/button';

type AdjustmentFormValues = z.infer<typeof adjustmentSchema>;

interface Product {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  minStockLevel: number | null;
  costPrice: string;
  sellingPrice: string;
}

interface PendingAdjustment extends AdjustmentFormValues {
  productName: string;
  currentStock: number;
  newStock: number;
  unit: string;
}

interface AdjustmentFormProps {
  products: Product[];
}

const AdjustmentForm = ({ products }: AdjustmentFormProps) => {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [pendingAdjustments, setPendingAdjustments] = useState<
    PendingAdjustment[]
  >([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
    setValue,
  } = useForm<AdjustmentFormValues>({
    resolver: zodResolver(adjustmentSchema),
  });

  const quantityChange = watch('quantityChange') || 0;

  const filteredProducts =
    search.length >= 2
      ? products.filter((p) =>
          p.name.toLowerCase().includes(search.toLowerCase()),
        )
      : [];

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    setIsSearching(value.length >= 2);
    if (selectedProduct && value.length >= 2) setSelectedProduct(null);
  };

  const selectProduct = (product: Product) => {
    setSelectedProduct(product);
    setValue('productId', product.id);
    setIsSearching(false);
  };

  const onSubmit = (data: AdjustmentFormValues) => {
    if (!selectedProduct) return;

    const newAdjustment: PendingAdjustment = {
      ...data,
      productName: selectedProduct.name,
      currentStock: selectedProduct.quantity,
      newStock: selectedProduct.quantity + data.quantityChange,
      unit: selectedProduct.unit,
    };

    setPendingAdjustments((prev) => [...prev, newAdjustment]);
    reset();
    setSelectedProduct(null);
    setSearch('');
    setIsSearching(false);
    toast.success('Adjustment added to pending list');
  };

  const submitAllAdjustments = async () => {
    const pharmacyId = 1;

    if (pendingAdjustments.length === 0) return;

    try {
      setLoading(true);
      const session = await getSession();
      const userId = session?.user?.id;

      if (!userId) {
        toast.error('You must be logged in to submit adjustments.');
        return;
      }

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
          <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-800">
                Search Products
              </h2>
              {pendingAdjustments.length > 0 && (
                <span className="text-sm text-gray-500">
                  {pendingAdjustments.length} pending adjustment
                  {pendingAdjustments.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by product name (min. 2 chars)..."
                value={search}
                onChange={handleSearchChange}
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg bg-gray-50 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
              />
              {search && (
                <button
                  onClick={clearSearch}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  aria-label="Clear search"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            {isSearching && (
              <div className="mt-4 space-y-2 max-h-72 overflow-y-auto">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => selectProduct(product)}
                      className="w-full border text-left p-3 rounded-lg hover:bg-gray-50"
                    >
                      <div className="font-medium text-gray-900">
                        {product.name}
                      </div>
                      <div className="flex items-center text-xs gap-2 mt-1 text-gray-600">
                        <span>
                          {product.unit} • Stock: {product.quantity}
                        </span>
                        {product.minStockLevel && (
                          <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">
                            Min: {product.minStockLevel}
                          </span>
                        )}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <Search className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                    <p>No products found for {search}</p>
                    <p className="text-xs mt-1">Try a different search term</p>
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
                    {selectedProduct.unit.toLowerCase()}
                  </div>
                </div>

                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                  <div className="text-xs font-medium text-blue-500 uppercase tracking-wider mb-1">
                    Adjustment
                  </div>
                  <div
                    className={`text-lg font-semibold ${
                      quantityChange >= 0 ? 'text-blue-600' : 'text-red-600'
                    }`}
                  >
                    {quantityChange >= 0 ? '+' : ''}
                    {quantityChange}
                  </div>
                </div>

                <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                  <div className="text-xs font-medium text-green-500 uppercase tracking-wider mb-1">
                    New Stock
                  </div>
                  <div className="text-lg font-semibold text-green-600">
                    {selectedProduct.quantity + quantityChange}{' '}
                    {selectedProduct.unit.toLowerCase()}
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity Change <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    {...register('quantityChange', { valueAsNumber: true })}
                    placeholder="e.g. -5 or +10"
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
                      { value: 'DAMAGED', label: 'Damaged Goods' },
                      { value: 'EXPIRED', label: 'Expired Products' },
                      { value: 'LOST', label: 'Lost Inventory' },
                      { value: 'THEFT', label: 'Theft' },
                      { value: 'CORRECTION', label: 'Stock Correction' },
                      { value: 'RESTOCK', label: 'Restock' },
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
                        className="text-gray-400 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
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
