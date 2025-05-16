'use client';

import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { deleteCategory } from '@/lib/actions/categories';
import { Categories } from '@/types';
import { toast } from 'sonner';

export function CategoryActions({ category }: { category: Categories }) {
  const router = useRouter();

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
      <Button
        variant="outline"
        size="xs"
        // onClick={() => router.push(`/categories/edit/${category.id}`)}
      >
        <Pencil className="h-3 w-3" />
      </Button>
      <Button variant="destructive" size="xs" onClick={handleDelete}>
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}
