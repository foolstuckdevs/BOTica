'use client';

import { createCategory } from '@/lib/actions/categories';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

type FormData = {
  name: string;
  description: string;
};

export function CategoryForm() {
  const router = useRouter();
  const { register, handleSubmit, reset } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    const result = await createCategory(data);

    if (result.success) {
      toast.success('Category created successfully');
      reset();
      router.refresh(); // Refresh the page to show new category
    } else {
      toast.error(result.message || 'Failed to create category');
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>+ Create Category</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Category</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="name">Name</label>
            <Input
              id="name"
              {...register('name', { required: 'Name is required' })}
            />
          </div>
          <div>
            <label htmlFor="description">Description</label>
            <Textarea id="description" {...register('description')} />
          </div>
          <Button type="submit">Create</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
