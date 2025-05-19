'use client';

import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { deleteCategory, updateCategory } from '@/lib/actions/categories';
import { toast } from 'sonner';
import EditDialog from './EditDialog';
import { categoryFormSchema } from '@/lib/validation';
import { Category } from '@/types';
import { useState } from 'react';

export function CategoryActions({ category }: { category: Category }) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this category?')) {
      const result = await deleteCategory(category.id);
      if (!result.success) {
        toast.error('Failed to delete category');
        return;
      }
      toast.success('Category deleted successfully');
      router.refresh();
    }
  };

  return (
    <div className="flex space-x-2">
      <Button variant="outline" size="xs" onClick={() => setDialogOpen(true)}>
        <Pencil className="h-3 w-3" />
      </Button>
      <EditDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
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
          // Combine form data with ID
          const result = await updateCategory({
            ...formData,
            id: category.id,
          });
          return result;
        }}
        schema={categoryFormSchema}
      />
      <Button variant="destructive" size="xs" onClick={handleDelete}>
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}
