'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { purchaseOrderSchema } from '@/lib/validations';
import {
  createPurchaseOrder,
  updatePurchaseOrder,
} from '@/lib/actions/purchase-order';

import { Supplier, Product } from '@/types';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDatePH } from '@/lib/date-format';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { ChevronLeft } from 'lucide-react';

type PurchaseOrderFormValues = z.infer<typeof purchaseOrderSchema>;

interface PurchaseOrderFormProps {
  type?: 'create' | 'update';
  suppliers: Supplier[];
  products: Product[];
  initialValues?: PurchaseOrderFormValues & { id?: number; status?: string };
  userId: string; // Pass userId from server component
  pharmacyId: number; // Pass pharmacyId from server component
}

const PurchaseOrderForm = ({
  type = 'create',
  suppliers,
  products,
  initialValues,
  userId,
  pharmacyId,
}: PurchaseOrderFormProps) => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [itemError, setItemError] = useState('');

  // Check if the purchase order is in a final state (not editable)
  const isReadOnly =
    type === 'update' &&
    initialValues?.status &&
    (initialValues.status === 'CONFIRMED' ||
      initialValues.status === 'PARTIALLY_RECEIVED' ||
      initialValues.status === 'RECEIVED' ||
      initialValues.status === 'CANCELLED');

  const form = useForm<PurchaseOrderFormValues>({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: initialValues || {
      supplierId: undefined,
      orderDate: new Date().toISOString(),
      notes: '',
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const filteredProducts =
    search.length >= 2
      ? products.filter(
          (p) =>
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            (p.brandName &&
              p.brandName.toLowerCase().includes(search.toLowerCase())),
        )
      : [];

  const handleAddProduct = (product: Product) => {
    if (fields.some((item) => item.productId === product.id)) {
      setItemError('Product already added');
      return;
    }

    append({
      productId: product.id,
      quantity: 1,
    });

    setSearch('');
    setItemError('');
  };

  const onSubmit = async (values: PurchaseOrderFormValues) => {
    if (isReadOnly) {
      toast.error('Cannot edit purchase order in current status');
      return;
    }

    if (fields.length === 0) {
      setItemError('Add at least one product');
      return;
    }

    setIsSubmitting(true);

    try {
      if (!userId) {
        toast.error('You must be logged in.');
        return;
      }

      const payload = {
        ...values,
        supplierId: Number(values.supplierId),
        pharmacyId,
        userId,
      };

      let result;

      if (type === 'create') {
        result = await createPurchaseOrder(payload);
      } else if (initialValues?.id) {
        result = await updatePurchaseOrder(
          initialValues.id,
          payload,
          pharmacyId,
        );
      } else {
        toast.error('Missing order ID for update.');
        setIsSubmitting(false);
        return;
      }

      if (result.success) {
        toast.success(
          `Purchase order ${type === 'create' ? 'created' : 'updated'}`,
        );
        router.push('/inventory/purchase-order');
      } else {
        toast.error(result.message || 'Failed to submit purchase order');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
      {/* Header Navigation */}
      <Button
        variant="ghost"
        onClick={() => router.push('/inventory/purchase-order')}
        className="group flex items-center gap-2 rounded-full text-sm text-muted-foreground hover:text-primary hover:bg-accent transition-colors mb-6"
      >
        <ChevronLeft className="w-4 h-4 group-hover:translate-x-[-2px] transition-transform" />
        <span>Back to Purchase Orders</span>
      </Button>

      {/* Page Header */}
      <div className="mb-8 border-b border-gray-200 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {type === 'create' ? 'Create New' : isReadOnly ? 'View' : 'Edit'}{' '}
              Purchase Order
            </h1>
            <p className="text-gray-600 mt-1">
              {type === 'create'
                ? 'Select a supplier and add products for your order.'
                : isReadOnly
                ? 'This purchase order cannot be edited due to its current status.'
                : 'Update the purchase order details and items.'}
            </p>
            {isReadOnly && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  <strong>Status:</strong> {initialValues?.status} - This order
                  is read-only and cannot be modified.
                  {initialValues?.status === 'CONFIRMED' &&
                    ' Order has been confirmed by supplier.'}
                  {initialValues?.status === 'PARTIALLY_RECEIVED' &&
                    ' Inventory changes have been recorded.'}
                  {initialValues?.status === 'RECEIVED' &&
                    ' Order is complete and finalized.'}
                  {initialValues?.status === 'CANCELLED' &&
                    ' Order has been cancelled.'}
                </p>
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">
              {fields.length} items
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Order Details */}
        <Card>
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            {/* Supplier Select */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Supplier <span className="text-red-500">*</span>
              </label>
              <Select
                disabled={!!isReadOnly}
                onValueChange={(val) =>
                  form.setValue('supplierId', Number(val))
                }
                value={
                  form.watch('supplierId') !== undefined
                    ? String(form.watch('supplierId'))
                    : ''
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.supplierId && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.supplierId.message}
                </p>
              )}
            </div>

            {/* Order Date */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Order Date <span className="text-red-500">*</span>
              </label>
              <Calendar
                disabled={!!isReadOnly}
                selected={
                  form.watch('orderDate')
                    ? new Date(form.watch('orderDate'))
                    : new Date()
                }
                onChange={(date) =>
                  form.setValue(
                    'orderDate',
                    date ? date.toISOString() : new Date().toISOString(),
                  )
                }
              />
              {form.formState.errors.orderDate && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.orderDate.message}
                </p>
              )}
            </div>

            {/* Notes */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Notes</label>
              <Input
                {...form.register('notes')}
                placeholder="Optional notes"
                disabled={!!isReadOnly}
              />
            </div>
          </CardContent>
        </Card>

        {/* Product Search */}
        {!isReadOnly && (
          <Card>
            <CardHeader>
              <CardTitle>Add Products</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <Input
                placeholder="Search by product name or brand..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full"
              />

              {search.length >= 2 && (
                <div className="mt-2 border rounded-lg bg-white max-h-60 overflow-y-auto">
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((product) => {
                      // For batch tracking: Only consider as "already added" if it's the exact same product
                      // (same ID, which means same brand, lot, etc.)
                      const alreadyAdded = fields.some(
                        (item) => item.productId === product.id,
                      );

                      return (
                        <div
                          key={product.id}
                          className={`flex justify-between items-center px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                            alreadyAdded ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          onClick={() => {
                            if (!alreadyAdded) handleAddProduct(product);
                          }}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium text-gray-900">
                                {product.name}
                              </p>
                              {product.brandName && (
                                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                                  {product.brandName}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              <span>
                                {product.unit} • Stock: {product.quantity}
                              </span>
                              {product.lotNumber && (
                                <span className="bg-gray-50 px-2 py-0.5 rounded">
                                  Lot: {product.lotNumber}
                                </span>
                              )}
                              {product.expiryDate && (
                                <span className="text-amber-600">
                                  Exp: {formatDatePH(product.expiryDate)}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">
                              Min: {product.minStockLevel}
                            </div>
                            {alreadyAdded && (
                              <p className="text-xs text-gray-400 mt-1">
                                Already added
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-4 text-sm text-gray-500">
                      No matching products found
                    </div>
                  )}
                </div>
              )}

              {itemError && (
                <p className="text-sm text-red-500 mt-2">{itemError}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Order Items Table */}
        {fields.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <table className="w-full text-sm border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-left">Product</th>
                    <th className="px-3 py-2 text-left">Brand</th>
                    <th className="px-3 py-2 text-left">Qty</th>
                    <th className="px-3 py-2 text-left">Unit</th>
                    <th className="px-3 py-2 text-left">Stock</th>
                    <th className="px-3 py-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((item, idx) => {
                    const product = products.find(
                      (p) => p.id === item.productId,
                    );
                    return (
                      <tr key={item.id} className="border-b">
                        <td className="px-3 py-2">
                          <p className="font-medium">{product?.name}</p>
                        </td>
                        <td className="px-3 py-2">
                          {product?.brandName ? (
                            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                              {product.brandName}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            min={1}
                            disabled={!!isReadOnly}
                            value={form.watch(`items.${idx}.quantity`) || 1}
                            onChange={(e) =>
                              form.setValue(
                                `items.${idx}.quantity`,
                                Number(e.target.value),
                              )
                            }
                            className="w-20"
                          />
                        </td>
                        <td className="px-3 py-2">{product?.unit || 'N/A'}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`${
                              (product?.quantity || 0) <=
                              (product?.minStockLevel || 0)
                                ? 'text-red-600 font-medium'
                                : 'text-gray-900'
                            }`}
                          >
                            {product?.quantity || 0}
                          </span>
                          {(product?.quantity || 0) <=
                            (product?.minStockLevel || 0) && (
                            <span className="text-xs text-red-600 ml-1">
                              LOW
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {!isReadOnly ? (
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => remove(idx)}
                            >
                              Remove
                            </Button>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {/* Total Cost */}
            </CardContent>
          </Card>
        )}

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => router.push('/inventory/purchase-order')}
          >
            {isReadOnly ? 'Back' : 'Cancel'}
          </Button>
          {!isReadOnly && (
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? type === 'create'
                  ? 'Creating...'
                  : 'Updating...'
                : type === 'create'
                ? 'Create Purchase Order'
                : 'Update Purchase Order'}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
};

export default PurchaseOrderForm;
