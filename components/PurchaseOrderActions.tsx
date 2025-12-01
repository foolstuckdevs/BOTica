// This file is being deleted as part of the patch.
// The PurchaseOrderActions component is no longer needed.

import React from 'react';

const PurchaseOrderActions = () => {
  // Component logic here
  return (
    <div>
      <button>Create Purchase Order</button>
      <button>Cancel Purchase Order</button>
    </div>
  );
};

export default PurchaseOrderActions;

// Additional code and functions related to Purchase Order Actions

// This is a placeholder for the rest of the file content.

// End of PurchaseOrderActions component

// Note: The entire file will be removed in the next commit.

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Eye, Pencil, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

import { PurchaseOrder } from '@/types';
import { deletePurchaseOrder } from '@/lib/actions/purchase-order';
import { DeleteDialog } from './DeleteDialog';

interface PurchaseOrderActionsProps {
  order: PurchaseOrder;
}

const PurchaseOrderActions = ({ order }: PurchaseOrderActionsProps) => {
  const router = useRouter();
  const { data: session } = useSession();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!session?.user?.pharmacyId) {
    return null; // Don't render actions if no pharmacy access
  }

  const pharmacyId = session.user.pharmacyId;

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
