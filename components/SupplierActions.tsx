'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DeleteDialog } from './DeleteDialog';
import EditDialog from './EditDialog';
import { Supplier } from '@/types';
import { updateSupplier, deleteSupplier } from '@/lib/actions/suppliers';
import { supplierSchema } from '@/lib/validations';

const SupplierActions = ({
  supplier,
  pharmacyId,
}: {
  supplier: Supplier;
  pharmacyId: number;
}) => {
  const router = useRouter();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

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
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setEditDialogOpen(true)}
          title="Edit"
        >
          <Pencil className="h-4 w-4 text-gray-600" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDeleteDialogOpen(true)}
          title="Delete"
        >
          <Trash2 className="h-4 w-4 text-red-600" />
        </Button>
      </div>

      <EditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        title="Edit Supplier"
        fields={[
          { name: 'name', label: 'Supplier Name' },
          { name: 'contactPerson', label: 'Contact Person' },
          { name: 'phone', label: 'Phone' },
          { name: 'email', label: 'Email' },
          { name: 'address', label: 'Address' },
        ]}
        defaultValues={{
          name: supplier.name,
          contactPerson: supplier.contactPerson,
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

      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        entityName={supplier.name}
        entityType="supplier"
      />
    </>
  );
};

export default SupplierActions;
