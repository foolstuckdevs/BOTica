'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Product, PurchaseOrder, PurchaseOrderItem } from '@/types';
import { Plus, Minus } from 'lucide-react';

interface PartiallyReceivedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: PurchaseOrder & { items: PurchaseOrderItem[] };
  products?: Product[];
  receivedItems: Record<number, number>;
  updateReceivedQuantity: (itemId: number, quantity: number) => void;
  onConfirm: () => void;
  isUpdating: boolean;
}

const PartiallyReceivedDialog: React.FC<PartiallyReceivedDialogProps> = ({
  open,
  onOpenChange,
  order,
  products,
  receivedItems,
  updateReceivedQuantity,
  onConfirm,
  isUpdating,
}) => {
  const hasReceivedItems = Object.values(receivedItems).some((qty) => qty > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Received Items</DialogTitle>
          <DialogDescription>
            Update quantities for items delivered. Add received products to
            inventory afterward.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {order.items.map((item) => {
            const product = products?.find((p) => p.id === item.productId);
            const received = receivedItems[item.id] || 0;

            return (
              <div key={item.id} className="p-3 border rounded-lg">
                <div className="flex justify-between items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {product?.name ||
                        item.productName ||
                        `Product #${item.productId}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Expected: {item.quantity} {product?.unit || 'units'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        updateReceivedQuantity(item.id, received - 1)
                      }
                      disabled={received <= 0}
                      aria-label={`Decrease received quantity for ${
                        product?.name || 'product'
                      }`}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>

                    <Input
                      type="number"
                      value={received}
                      onChange={(e) =>
                        updateReceivedQuantity(
                          item.id,
                          parseInt(e.target.value) || 0,
                        )
                      }
                      className="w-20 text-center"
                      min="0"
                      max={item.quantity}
                      aria-label={`Received quantity for ${
                        product?.name || 'product'
                      }`}
                    />

                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        updateReceivedQuantity(item.id, received + 1)
                      }
                      disabled={received >= item.quantity}
                      aria-label={`Increase received quantity for ${
                        product?.name || 'product'
                      }`}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
            disabled={isUpdating}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isUpdating || !hasReceivedItems}
            className="flex-1"
          >
            {isUpdating ? 'Updating...' : 'Update Received Quantities'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PartiallyReceivedDialog;
