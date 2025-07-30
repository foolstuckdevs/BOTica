'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './ui/form';

import { Input } from './ui/input';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useForm, FieldValues, DefaultValues, Path } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ZodType } from 'zod';

interface Props<T extends FieldValues> {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  fields: {
    name: Path<T>;
    label: string;
    type?: 'text' | 'number' | 'textarea';
  }[];
  defaultValues: DefaultValues<T>;
  onSubmit: (data: T) => Promise<{ success: boolean; error?: string }>;
  // Using `any` here is necessary for Zod's complex internal type system
  // This doesn't compromise type safety as T is properly constrained
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: ZodType<T, unknown, any>;
}

export const EditDialog = <T extends FieldValues>({
  open = false,
  onOpenChange,
  title,
  fields,
  defaultValues,
  onSubmit,
  schema,
}: Props<T>) => {
  const router = useRouter();

  const form = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const handleSubmit = async (data: T) => {
    const result = await onSubmit(data);
    if (result.success) {
      toast.success('Saved successfully');
      onOpenChange?.(false);
      router.refresh();
    } else {
      toast.error(result.error || 'Failed to save');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            {fields.map(({ name, label, type }) => (
              <FormField
                key={name}
                control={form.control}
                name={name}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <FormControl>
                      <Input type={type || 'text'} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
            <div className="flex justify-end gap-2">
              <Button type="submit">Save</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditDialog;
