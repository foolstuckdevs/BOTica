import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { DefaultValues, FieldValues, Path, useForm } from 'react-hook-form';
import { ZodType } from 'zod';
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

interface Props<T extends FieldValues> {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  fields: {
    name: keyof T;
    label: string;
    type?: 'text' | 'number' | 'textarea';
  }[];
  defaultValues: T;
  onSubmit: (data: T) => Promise<{ success: boolean; error?: string }>;
  schema: ZodType<T>; //make optional for forms without validation if needed
}

export const EditDialog = <T extends FieldValues>({
  open,
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
    defaultValues: defaultValues as DefaultValues<T>,
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
                key={name.toString()}
                control={form.control}
                name={name as Path<T>}
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
