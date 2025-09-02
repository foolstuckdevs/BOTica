'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DeleteDialog } from './DeleteDialog';
import EditDialog from './EditDialog';
import { Category } from '@/types';
import { updateCategory, deleteCategory } from '@/lib/actions/categories';
import { categorySchema } from '@/lib/validations';
import usePermissions from '@/hooks/use-permissions';

export function CategoryActions({ category }: { category: Category }) {
  const router = useRouter();
  const { data: session } = useSession();
  const { canEditMasterData } = usePermissions();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  if (!session?.user?.pharmacyId) {
    return null; // Don't render actions if no pharmacy access
  }

  const pharmacyId = session.user.pharmacyId;

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
        {canEditMasterData && (
          <>
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
          </>
        )}
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
