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
      setTimeout(() => setShowConfirmation(false), 3000);
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
    <div className="max-w-5xl mx-auto p-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Inventory Adjustments
        </h1>
        {showConfirmation && (
          <div className="flex items-center space-x-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg border border-green-100">
            <CheckCircle className="w-5 h-5" />
            <span>Submitted successfully!</span>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Search & Adjustment Form */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search box */}
          <div className="bg-white border rounded-lg p-4 shadow-sm">
            <h2 className="text-lg font-semibold mb-3 flex items-center text-gray-800">
              <Search className="w-5 h-5 mr-2 text-gray-600" />
              Search Products
            </h2>

            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search products (min. 2 characters)..."
                value={search}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-8 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
              {search && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearSearch}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 h-auto w-auto p-1"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            {isSearching && (
              <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className="cursor-pointer border rounded-lg p-3 hover:bg-gray-50 transition flex justify-between items-center"
                      onClick={() => selectProduct(product)}
                    >
                      <div>
                        <div className="font-medium text-gray-900">
                          {product.name}
                        </div>
                        <div className="text-sm text-gray-600">
                          Stock: {product.quantity} {product.unit.toLowerCase()}
                          s
                          {product.minStockLevel && (
                            <span className="ml-2 text-orange-600">
                              (Min: {product.minStockLevel})
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-blue-600 font-medium">
                        Select
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Search className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No results found for {search}</p>
                  </div>
                )}
              </div>
            )}

            {!isSearching && !selectedProduct && (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-600 mb-1">
                  Search for products
                </h3>
                <p className="text-sm max-w-md mx-auto">
                  Enter at least 2 characters to search and adjust product
                  inventory levels
                </p>
              </div>
            )}
          </div>

          {/* Adjustment Form */}
          {selectedProduct && (
            <div className="bg-white border rounded-lg p-4 space-y-4 shadow-sm">
              <h3 className="text-lg font-semibold flex items-center text-gray-800">
                <Package className="w-5 h-5 mr-2 text-gray-600" />
                Adjust: {selectedProduct.name}
              </h3>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg border">
                  <div className="text-sm text-gray-600">Current Stock</div>
                  <div className="text-xl font-bold text-gray-800">
                    {selectedProduct.quantity}{' '}
                    {selectedProduct.unit.toLowerCase()}s
                  </div>
                </div>

                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                  <div className="text-sm text-blue-600">Adjustment</div>
                  <div className="text-xl font-bold text-blue-700">
                    {quantityChange >= 0 ? '+' : ''}
                    {quantityChange}
                  </div>
                </div>

                <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                  <div className="text-sm text-green-600">New Stock</div>
                  <div className="text-xl font-bold text-green-700">
                    {selectedProduct.quantity + quantityChange}{' '}
                    {selectedProduct.unit.toLowerCase()}s
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity Change <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      {...register('quantityChange', { valueAsNumber: true })}
                      placeholder="e.g. -5 or 10"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {errors.quantityChange && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.quantityChange.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register('reason')}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a reason</option>
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
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Additional details about this adjustment..."
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-2">
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
                <Button
                  type="button"
                  onClick={handleSubmit(onSubmit)}
                  className="flex-1"
                >
                  Add Adjustment
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Pending Adjustments */}
        <div className="space-y-4">
          <div className="bg-white border rounded-lg p-4 shadow-sm">
            <h3 className="text-lg font-semibold mb-3 flex justify-between items-center text-gray-800">
              <span>Pending Adjustments</span>
              <span className="text-sm bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full">
                {pendingAdjustments.length}
              </span>
            </h3>

            <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
              {pendingAdjustments.map((adj, index) => (
                <div
                  key={index}
                  className="bg-white border rounded-lg p-3 shadow-xs hover:shadow-sm transition"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {adj.productName}
                      </div>
                      <div className="flex items-center mt-1 space-x-4">
                        <span className="text-sm text-gray-600">
                          {adj.currentStock} →{' '}
                          <span className="font-semibold">{adj.newStock}</span>{' '}
                          {adj.unit.toLowerCase()}s
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
                      <div className="mt-2 text-xs text-gray-500">
                        <span className="font-medium">Reason:</span>{' '}
                        {adj.reason}
                        {adj.notes && (
                          <div className="mt-1">
                            <span className="font-medium">Notes:</span>{' '}
                            {adj.notes}
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removePendingAdjustment(index)}
                      className="text-gray-400 hover:text-red-500 h-auto w-auto p-1"
                      aria-label="Remove adjustment"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {pendingAdjustments.length > 0 && (
              <Button
                onClick={submitAllAdjustments}
                disabled={loading}
                className="w-full mt-4"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                  `Submit All (${pendingAdjustments.length})`
                )}
              </Button>
            )}

            {pendingAdjustments.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-600 mb-1">
                  No pending adjustments
                </h3>
                <p className="text-sm">
                  Add adjustments from the search panel to see them here
                </p>
              </div>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push('/inventory/adjustments')}
          className="flex items-center gap-1 shadow-sm"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </Button>
      </div>
    </div>
  );
};

export default AdjustmentForm;
