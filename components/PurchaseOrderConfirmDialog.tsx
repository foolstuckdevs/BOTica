'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { confirmPurchaseOrder } from '@/lib/actions/purchase-order';
import { useRouter } from 'next/navigation';
import { CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Product, PurchaseOrder, PurchaseOrderItem } from '@/types';

interface PurchaseOrderConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: PurchaseOrder & {
    items: PurchaseOrderItem[];
    userName?: string;
  };
  products?: Product[];
  onConfirm?: () => void;
}

export const PurchaseOrderConfirmDialog: React.FC<
  PurchaseOrderConfirmDialogProps
> = ({ open, onOpenChange, order, products, onConfirm }) => {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [confirmedItems, setConfirmedItems] = useState<
    Record<number, { unitCost: string; available: boolean }>
  >({});

  // Initialize confirmed items when dialog opens
  useEffect(() => {
    if (open) {
      const initialItems: Record<
        number,
        { unitCost: string; available: boolean }
      > = {};
      order.items.forEach((item) => {
        // Use the existing unit cost, or default to empty string for user input
        const existingCost =
          item.unitCost && parseFloat(item.unitCost) > 0 ? item.unitCost : '';
        initialItems[item.id] = {
          unitCost: existingCost,
          available: true,
        };
      });
      setConfirmedItems(initialItems);
      setShowValidationErrors(false);
    }
  }, [open, order.items]);

  const updateConfirmedItem = (
    itemId: number,
    unitCost: string,
    available: boolean,
  ) => {
    setConfirmedItems((prev) => ({
      ...prev,
      [itemId]: { unitCost, available },
    }));

    // Always clear validation errors when user makes changes
    // This ensures that when items are unchecked, their validation errors disappear
    setShowValidationErrors(false);
  };
  const isConfirmValid = () => {
    const availableItems = Object.values(confirmedItems).filter(
      (item) => item.available,
    );
    if (availableItems.length === 0) return false;

    return availableItems.every(
      (item) => item.unitCost && parseFloat(item.unitCost) > 0,
    );
  };

  const handleConfirmOrder = async () => {
    const availableItems = Object.values(confirmedItems).filter(
      (item) => item.available,
    );

    if (availableItems.length === 0) {
      toast.error('At least one item must be available for confirmation');
      setShowValidationErrors(true);
      return;
    }

    const invalidItems = availableItems.filter(
      (item) => !item.unitCost || parseFloat(item.unitCost) <= 0,
    );

    if (invalidItems.length > 0) {
      setShowValidationErrors(true);
      toast.error(
        'All available items must have a valid price greater than ₱0.00',
      );
      return;
    }

    setIsUpdating(true);
    try {
      const result = await confirmPurchaseOrder(
        order.id,
        order.pharmacyId,
        confirmedItems,
      );
      if (result.success) {
        toast.success('Purchase order confirmed successfully');
        router.refresh();
        onOpenChange(false);
        onConfirm?.();
      } else {
        toast.error(result.message || 'Failed to confirm order');
      }
    } catch {
      toast.error('Failed to confirm order');
    } finally {
      setIsUpdating(false);
    }
  };

  const totalCost = Object.entries(confirmedItems)
    .filter(([, item]) => item.available)
    .reduce((total, [itemId, item]) => {
      const orderItem = order.items.find((i) => i.id === parseInt(itemId));
      return (
        total + parseFloat(item.unitCost || '0') * (orderItem?.quantity || 0)
      );
    }, 0);

  const availableItemsCount = Object.values(confirmedItems).filter(
    (item) => item.available,
  ).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-xl font-semibold text-gray-800">
            Confirm Purchase Order
          </DialogTitle>
          <p className="text-sm text-gray-500">
            Review and confirm supplier pricing and availability for each item.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {/* Information Card */}
          <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center mt-0.5 shrink-0">
                <CheckCircle className="w-3 h-3 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-800">
                  Order Confirmation
                </h4>
                <p className="text-sm text-gray-600 mt-1">
                  This will lock in the final pricing and availability. Items
                  marked as unavailable will be removed.
                </p>
              </div>
            </div>
          </div>

          {/* Order Items Table */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b">
              <h4 className="font-medium text-gray-800 text-sm">Order Items</h4>
            </div>
            <div className="divide-y">
              {order.items.map((item) => {
                const product = products?.find((p) => p.id === item.productId);
                const confirmed = confirmedItems[item.id] || {
                  unitCost:
                    item.unitCost && parseFloat(item.unitCost) > 0
                      ? item.unitCost
                      : '',
                  available: true,
                };
                const hasError =
                  showValidationErrors &&
                  confirmed.available &&
                  (!confirmed.unitCost || parseFloat(confirmed.unitCost) <= 0);

                return (
                  <div
                    key={item.id}
                    className={`p-3 ${
                      !confirmed.available ? 'bg-gray-50' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Availability Checkbox */}
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={confirmed.available}
                          onChange={(e) =>
                            updateConfirmedItem(
                              item.id,
                              confirmed.unitCost,
                              e.target.checked,
                            )
                          }
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-xs text-gray-600">Available</span>
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <h5 className="font-medium text-gray-900 text-sm truncate">
                          {product?.name ||
                            item.productName ||
                            `Product #${item.productId}`}
                        </h5>
                        <div className="flex gap-3 text-xs text-gray-500 mt-0.5">
                          <span>Qty: {item.quantity}</span>
                          <span>
                            Unit: {product?.unit || item.productUnit || '—'}
                          </span>
                        </div>
                      </div>

                      {/* Price Input and Subtotal */}
                      <div className="flex items-center gap-3">
                        <div className="w-24">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">
                              ₱
                            </span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={confirmed.unitCost}
                              onChange={(e) =>
                                updateConfirmedItem(
                                  item.id,
                                  e.target.value,
                                  confirmed.available,
                                )
                              }
                              className={`h-8 pl-6 pr-2 text-xs text-right ${
                                !confirmed.available
                                  ? 'bg-gray-100 text-gray-400'
                                  : ''
                              } ${
                                hasError
                                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                                  : ''
                              }`}
                              disabled={!confirmed.available}
                              placeholder="0.00"
                            />
                          </div>
                          {hasError && (
                            <p className="text-xs text-red-500 mt-1">
                              Required
                            </p>
                          )}
                        </div>

                        {confirmed.available && (
                          <div className="text-right w-20">
                            <div className="text-sm font-medium text-gray-900">
                              ₱
                              {(
                                parseFloat(confirmed.unitCost || '0') *
                                item.quantity
                              ).toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500">
                              Subtotal
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {!confirmed.available && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-red-500 bg-red-50/50 p-2 rounded">
                        <XCircle className="w-3 h-3" />
                        <span>Will be removed from order</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer with Summary and Actions */}
        <div className="border-t pt-4 mt-4">
          {/* Order Summary */}
          <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium text-gray-800">
                {availableItemsCount}
              </span>{' '}
              of <span className="font-medium">{order.items.length}</span> items
              available
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Total confirmed cost</div>
              <div className="text-xl font-bold text-gray-900">
                ₱{totalCost.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Validation Messages */}
          {showValidationErrors && !isConfirmValid() && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <div className="text-sm text-red-700">
                  <p className="font-medium">Action Required:</p>
                  <ul className="mt-1 space-y-1">
                    {availableItemsCount === 0 && (
                      <li>• Select at least one item as available</li>
                    )}
                    {availableItemsCount > 0 &&
                      Object.entries(confirmedItems).some(
                        ([, item]) =>
                          item.available &&
                          (!item.unitCost || parseFloat(item.unitCost) <= 0),
                      ) && (
                        <li>
                          • Enter valid prices (greater than ₱0.00) for all
                          available items
                        </li>
                      )}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmOrder}
              disabled={isUpdating || !isConfirmValid()}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {isUpdating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Confirming...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirm Order
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PurchaseOrderConfirmDialog;
