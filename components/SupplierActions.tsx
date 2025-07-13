'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Pencil, Trash2 } from 'lucide-react';

import { Button } from './ui/button';
import { DeleteDialog } from './DeleteDialog';
import EditDialog from './EditDialog';

import { Supplier } from '@/types';
import { updateSupplier, deleteSupplier } from '@/lib/actions/suppliers';
import { supplierSchema } from '@/lib/validation';

const SupplierActions = ({ supplier }: { supplier: Supplier }) => {
  const router = useRouter();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const pharmacyId = 1; // TODO: replace with session based later

  const handleDelete = async () => {
    const result = await deleteSupplier(supplier.id, pharmacyId);
    if (!result.success) {
      toast.error('Failed to delete supplier');
      return;
    }
    toast.success('Supplier deleted successfully');
    setDeleteDialogOpen(false);
    router.refresh();
  };

  return (
    <div className="flex space-x-2">
      {/* Edit Button */}
      <Button
        variant="outline"
        size="xs"
        onClick={() => setEditDialogOpen(true)}
      >
        <Pencil className="h-3 w-3" />
      </Button>

      {/* Edit Dialog */}
      <EditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        title="Edit Supplier"
        fields={[
          { name: 'name', label: 'Supplier Name' },
          { name: 'contactPerson', label: 'Contact Person' }, // Fixed field name
          { name: 'phone', label: 'Phone' },
          { name: 'email', label: 'Email' },
          { name: 'address', label: 'Address' },
        ]}
        defaultValues={{
          name: supplier.name,
          contactPerson: supplier.contactPerson, // Fixed field name
          phone: supplier.phone || '',
          email: supplier.email || '',
          address: supplier.address || '',
        }}
        onSubmit={async (formData) => {
          const result = await updateSupplier({
            ...formData,
            id: supplier.id,
            pharmacyId,
          });
          return result;
        }}
        schema={supplierSchema}
      />

      {/* Delete Button */}
      <Button
        variant="destructive"
        size="xs"
        onClick={() => setDeleteDialogOpen(true)}
      >
        <Trash2 className="h-3 w-3" />
      </Button>

      {/* Delete Dialog */}
      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        entityName="Supplier"
      />
    </div>
  );
};

export default SupplierActions;
