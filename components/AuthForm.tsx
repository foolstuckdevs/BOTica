'use client';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  DefaultValues,
  FieldValues,
  Path,
  SubmitHandler,
  useForm,
} from 'react-hook-form';
import { ZodType } from 'zod';
import { FIELD_NAMES, FIELD_TYPES } from '@/constants';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface Props<T extends FieldValues> {
  type: 'SIGN_IN' | 'SIGN_UP';
  schema: ZodType<T>;
  defaultValues: T;
  onSubmit: (
    data: T,
  ) => Promise<{ success: boolean; error?: string; role?: string }>;
}

const AuthForm = <T extends FieldValues>({
  type,
  schema,
  defaultValues,
  onSubmit,
}: Props<T>) => {
  const router = useRouter();
  const isSignIn = type === 'SIGN_IN';

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaultValues as DefaultValues<T>,
  });

  const handleSubmit: SubmitHandler<T> = async (data) => {
    const result = await onSubmit(data);

    if (result.success) {
      toast.success(
        isSignIn
          ? 'You have successfully signed in.'
          : 'You have successfully signed up.',
      );

      setTimeout(() => router.push('/'), 1000);
    } else {
      toast.error(result.error || 'An error occurred');
    }
  };

  return (
    <div className="max-w-md w-full mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
      <div className="text-center mb-8">
        <h1 className="font-bold text-3xl text-gray-800 dark:text-white mb-2">
          {isSignIn ? 'Welcome Back' : 'Create Account'}
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          {isSignIn
            ? 'Sign in to your account'
            : 'Get started with your account'}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {Object.keys(defaultValues).map((field) => (
            <FormField
              key={field}
              control={form.control}
              name={field as Path<T>}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700 dark:text-gray-300">
                    {FIELD_NAMES[field.name as keyof typeof FIELD_NAMES]}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type={FIELD_TYPES[field.name as keyof typeof FIELD_TYPES]}
                      // `...field` connects this input to react-hook-form
                      // It handles things like value, onChange, onBlur, etc.
                      // Without this, the form won't be able to track or validate this input.
                      {...field}
                      className="py-6 px-4 border-gray-300 dark:border-gray-600 focus-visible:ring-2 focus-visible:ring-blue-500"
                    />
                  </FormControl>
                  <FormMessage className="text-red-500 dark:text-red-400" />
                </FormItem>
              )}
            />
          ))}

          <Button
            type="submit"
            className="w-full py-6 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
          >
            {isSignIn ? 'Sign In' : 'Sign Up'}
          </Button>
        </form>
      </Form>

      <div className="mt-6 text-center">
        <p className="text-gray-600 dark:text-gray-400">
          {isSignIn ? "Don't have an account?" : 'Already have an account?'}
          <Link
            href={isSignIn ? '/sign-up' : '/sign-in'}
            className="ml-2 text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            {isSignIn ? 'Sign up' : 'Sign in'}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default AuthForm;
