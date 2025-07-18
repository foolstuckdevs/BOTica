'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { purchaseOrderSchema } from '@/lib/validation';
import {
  createPurchaseOrder,
  updatePurchaseOrder,
} from '@/lib/actions/puchase-order';
import { getSession } from 'next-auth/react';

import { Supplier, Product } from '@/types';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { formatCurrency } from '@/lib/helpers/formatCurrency';

type PurchaseOrderFormValues = z.infer<typeof purchaseOrderSchema>;

interface Props {
  type?: 'create' | 'update';
  suppliers: Supplier[];
  products: Product[];
  initialValues?: PurchaseOrderFormValues & { id?: number };
}

const PurchaseOrderForm = ({
  type = 'create',
  suppliers,
  products,
  initialValues,
}: Props) => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [itemError, setItemError] = useState('');

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
      ? products.filter((p) =>
          p.name.toLowerCase().includes(search.toLowerCase()),
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
      unitCost: product.costPrice,
    });

    setSearch('');
    setItemError('');
  };

  const onSubmit = async (values: PurchaseOrderFormValues) => {
    if (fields.length === 0) {
      setItemError('Add at least one product');
      return;
    }

    setIsSubmitting(true);

    try {
      const session = await getSession();
      const userId = session?.user?.id;

      if (!userId) {
        toast.error('You must be logged in.');
        return;
      }

      const pharmacyId = 1; // TODO: replace with dynamic value from session later

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

  // Calculate total order cost from current form values
  const total = fields.reduce(
    (sum, item, idx) =>
      sum +
      Number(form.watch(`items.${idx}.quantity`) || 1) *
        parseFloat(form.watch(`items.${idx}.unitCost`) || '0'),
    0,
  );

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
      <Button
        variant="ghost"
        onClick={() => router.push('/inventory/purchase-order')}
        className="group flex items-center gap-2 rounded-full text-sm text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
      >
        <ChevronLeft className="w-4 h-4 group-hover:translate-x-[-2px] transition-transform" />
        <span>Back to Purchase Orders</span>
      </Button>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">
          {type === 'create' ? 'Create' : 'Edit'} Purchase Order
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {type === 'create'
            ? 'Select a supplier, add products, and submit your order.'
            : 'Update the purchase order details and items.'}
        </p>
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
              <Input {...form.register('notes')} placeholder="Optional notes" />
            </div>
          </CardContent>
        </Card>

        {/* Product Search */}
        <Card>
          <CardHeader>
            <CardTitle>Add Products</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full"
            />

            {search.length >= 2 && (
              <div className="mt-2 border rounded-lg bg-white max-h-60 overflow-y-auto">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => {
                    const alreadyAdded = fields.some(
                      (item) => item.productId === product.id,
                    );

                    return (
                      <div
                        key={product.id}
                        className={`flex justify-between items-center px-4 py-2 hover:bg-gray-50 cursor-pointer ${
                          alreadyAdded ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        onClick={() => {
                          if (!alreadyAdded) handleAddProduct(product);
                        }}
                      >
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-gray-500">
                              {product.unit} • Stock: {product.quantity}
                            </p>
                            <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">
                              Min: {product.minStockLevel}
                            </span>
                          </div>
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

            {itemError && <p className="text-sm text-red-500">{itemError}</p>}
          </CardContent>
        </Card>

        {/* Order Items Table */}
        {fields.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <table className="w-full text-sm border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-left">Product</th>
                    <th className="px-3 py-2 text-left">Qty</th>
                    <th className="px-3 py-2 text-left">Unit</th>
                    <th className="px-3 py-2 text-left">Stock</th>
                    <th className="px-3 py-2 text-left">Unit Cost</th>
                    <th className="px-3 py-2 text-left">Total</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {fields.map((item, idx) => {
                    const product = products.find(
                      (p) => p.id === item.productId,
                    );
                    return (
                      <tr key={item.id} className="border-b">
                        <td className="px-3 py-2">{product?.name}</td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            min={1}
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
                        <td className="px-3 py-2">{product?.unit}</td>
                        <td className="px-3 py-2">{product?.quantity}</td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            value={form.watch(`items.${idx}.unitCost`) || ''}
                            onChange={(e) =>
                              form.setValue(
                                `items.${idx}.unitCost`,
                                e.target.value,
                              )
                            }
                            className="w-24"
                          />
                        </td>
                        <td className="px-3 py-2">
                          {(
                            Number(form.watch(`items.${idx}.quantity`) || 1) *
                            parseFloat(
                              form.watch(`items.${idx}.unitCost`) || '0',
                            )
                          ).toFixed(2)}
                        </td>
                        <td className="px-3 py-2">
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => remove(idx)}
                          >
                            Remove
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {/* Total Cost */}
              <div className="mt-4 flex justify-end items-center gap-4">
                <span className="font-medium text-gray-700">Total Cost:</span>
                <span className="text-lg font-semibold">
                  {formatCurrency(total)}
                </span>
              </div>
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
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? type === 'create'
                ? 'Creating...'
                : 'Updating...'
              : type === 'create'
              ? 'Create Purchase Order'
              : 'Update Purchase Order'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default PurchaseOrderForm;
