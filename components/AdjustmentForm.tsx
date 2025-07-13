'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { getSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Search, Package, CheckCircle, X } from 'lucide-react';
import { createAdjustment } from '@/lib/actions/adjustment';
import { adjustmentSchema } from '@/lib/validation';

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
      toast.success('All adjustments submitted');
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
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Inventory Adjustments
        </h1>
        {showConfirmation && (
          <div className="flex items-center space-x-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg">
            <CheckCircle className="w-5 h-5" />
            <span>Submitted successfully!</span>
          </div>
        )}
      </div>

      {/* === Left Side === */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Search box */}
          <div className="bg-white border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3 flex items-center">
              <Search className="w-5 h-5 mr-2" />
              Search Products
            </h2>

            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="e.g., Paracetamol, Amoxicillin..."
                value={search}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              {search && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {isSearching && (
              <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className="cursor-pointer border rounded-lg p-3 hover:bg-gray-50 transition"
                      onClick={() => selectProduct(product)}
                    >
                      <div className="flex justify-between">
                        <div>
                          <div className="font-medium">{product.name}</div>
                          <div className="text-sm text-gray-500">
                            Stock: {product.quantity}{' '}
                            {product.unit.toLowerCase()}s
                          </div>
                        </div>
                        <div className="text-sm text-gray-400">Adjust</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Search className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No results for `{search}`</p>
                  </div>
                )}
              </div>
            )}

            {!isSearching && !selectedProduct && (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>
                  Enter at least 2 characters to search and adjust product
                  inventory
                </p>
              </div>
            )}
          </div>

          {/* Adjustment Form */}
          {selectedProduct && (
            <div className="bg-white border rounded-lg p-4 space-y-4">
              <h3 className="text-lg font-semibold flex items-center">
                <Package className="w-5 h-5 mr-2" />
                Adjust: {selectedProduct.name}
              </h3>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-600">Current Stock</div>
                  <div className="text-xl font-bold">
                    {selectedProduct.quantity}{' '}
                    {selectedProduct.unit.toLowerCase()}s
                  </div>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-sm text-blue-600">New Stock</div>
                  <div className="text-xl font-bold">
                    {selectedProduct.quantity + quantityChange}{' '}
                    {selectedProduct.unit.toLowerCase()}s
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Quantity Change
                  </label>
                  <input
                    type="number"
                    {...register('quantityChange', { valueAsNumber: true })}
                    placeholder="e.g. -5 or 10"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  {errors.quantityChange && (
                    <p className="text-sm text-red-500">
                      {errors.quantityChange.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Reason
                  </label>
                  <select
                    {...register('reason')}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Select reason</option>
                    {[
                      'DAMAGED',
                      'EXPIRED',
                      'LOST',
                      'THEFT',
                      'CORRECTION',
                      'RESTOCK',
                    ].map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  {errors.reason && (
                    <p className="text-sm text-red-500">
                      {errors.reason.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Notes (optional)
                </label>
                <textarea
                  {...register('notes')}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => router.push('/adjustments')}
                  className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit(onSubmit)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add Adjustment
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Pending Adjustments */}
        <div className="space-y-4">
          <div className="bg-white border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3 flex justify-between">
              <span>Pending Adjustments</span>
              <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                {pendingAdjustments.length}
              </span>
            </h3>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {pendingAdjustments.map((adj, index) => (
                <div
                  key={index}
                  className="bg-gray-50 p-3 rounded-lg flex justify-between"
                >
                  <div>
                    <div className="font-medium">{adj.productName}</div>
                    <div className="text-sm text-gray-600">
                      {adj.currentStock} → {adj.newStock}{' '}
                      {adj.unit.toLowerCase()}s
                    </div>
                    <div className="text-sm text-gray-500">
                      Reason: {adj.reason}
                    </div>
                    {adj.notes && (
                      <div className="text-sm text-gray-500">
                        Notes: {adj.notes}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => removePendingAdjustment(index)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {pendingAdjustments.length > 0 && (
              <button
                onClick={submitAllAdjustments}
                disabled={loading}
                className="w-full mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading
                  ? 'Submitting...'
                  : `Submit All Adjustments (${pendingAdjustments.length})`}
              </button>
            )}

            {pendingAdjustments.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No pending adjustments</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdjustmentForm;
