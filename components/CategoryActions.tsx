'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DeleteDialog } from './DeleteDialog';
import EditDialog from './EditDialog';
import { Category } from '@/types';
import { updateCategory, deleteCategory } from '@/lib/actions/categories';
import { categorySchema } from '@/lib/validations';

export function CategoryActions({ category }: { category: Category }) {
  const router = useRouter();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const pharmacyId = 1; // Replace with session-based logic later

  const handleDelete = async () => {
    const result = await deleteCategory(category.id, pharmacyId);
    if (!result.success) {
      toast.error('Failed to delete category');
      return;
    }
    toast.success('Category deleted');
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
        title="Edit Category"
        fields={[
          { name: 'name', label: 'Category Name' },
          { name: 'description', label: 'Description' },
        ]}
        defaultValues={{
          name: category.name,
          description: category.description || '',
        }}
        onSubmit={async (formData) => {
          const result = await updateCategory({
            ...formData,
            id: category.id,
            pharmacyId,
          });
          return result;
        }}
        schema={categorySchema}
      />

      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        entityName={category.name}
        entityType="category"
      />
    </>
  );
}
