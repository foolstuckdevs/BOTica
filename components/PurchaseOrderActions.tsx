'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Pencil, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

import { PurchaseOrder } from '@/types';
import { deletePurchaseOrder } from '@/lib/actions/puchase-order';
import { DeleteDialog } from './DeleteDialog';

interface Props {
  order: PurchaseOrder;
}

const PurchaseOrderActions = ({ order }: Props) => {
  const router = useRouter();
  const pharmacyId = 1; // TODO: Replace with session-based pharmacyId
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleView = () => {
    router.push(`/inventory/purchase-order/${order.id}`);
  };

  const handleEdit = () => {
    router.push(`/inventory/purchase-order/${order.id}/edit`);
  };

  const handleDelete = async () => {
    startTransition(async () => {
      const result = await deletePurchaseOrder(order.id, pharmacyId);

      if (result.success) {
        toast.success(result.message || 'Purchase order deleted');
        router.refresh(); // Refresh current page or list
      } else {
        toast.error(result.message || 'Failed to delete purchase order');
      }

      setDeleteDialogOpen(false);
    });
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={handleView} title="View">
          <Eye className="h-4 w-4 text-gray-600" />
        </Button>

        <Button variant="ghost" size="icon" onClick={handleEdit} title="Edit">
          <Pencil className="h-4 w-4 text-gray-600" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDeleteDialogOpen(true)}
          title="Delete"
          disabled={isPending}
        >
          <Trash className="h-4 w-4 text-red-600" />
        </Button>
      </div>

      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        entityName={order.orderNumber}
        entityType="purchase order"
        isLoading={isPending}
      />
    </>
  );
};

export default PurchaseOrderActions;
