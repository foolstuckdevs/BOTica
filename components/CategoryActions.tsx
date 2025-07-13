'use client';

import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { deleteCategory, updateCategory } from '@/lib/actions/categories';
import { toast } from 'sonner';
import EditDialog from './EditDialog';
import { categorySchema } from '@/lib/validation';
import { Category } from '@/types';
import { useState } from 'react';
import { DeleteDialog } from './DeleteDialog';

export function CategoryActions({ category }: { category: Category }) {
  const router = useRouter();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const pharmacyId = 1; // hardcoded for now fetch from session later

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
        entityName="Category"
      />
    </div>
  );
}
