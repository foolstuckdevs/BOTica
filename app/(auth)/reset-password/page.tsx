'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { passwordResetSchema } from '@/lib/validations';
import { resetPassword } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { toast } from 'sonner';
import {
  ShieldCheck,
  ArrowLeft,
  Loader2,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';
import Link from 'next/link';

const resetSchema = passwordResetSchema;
type ResetPasswordData = z.infer<typeof resetSchema>;

const ResetPasswordPage = () => {
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetComplete, setIsResetComplete] = useState(false);
  const [tokenMissing, setTokenMissing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const tokenFromQuery = searchParams.get('token') || '';

  const form = useForm<ResetPasswordData>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      token: tokenFromQuery,
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (!tokenFromQuery) {
      setTokenMissing(true);
      return;
    }

    setTokenMissing(false);
    form.setValue('token', tokenFromQuery);
  }, [form, tokenFromQuery]);

  const onSubmit = async (values: ResetPasswordData) => {
    setIsSubmitting(true);
    try {
      const result = await resetPassword(values);
      if (!result.success) {
        toast.error(
          result.error || 'Unable to reset password. Please try again.',
        );
        return;
      }

      setIsResetComplete(true);
      toast.success(
        'Password updated. You can now sign in with your new password.',
      );
    } catch (error) {
      console.error('Password reset submission failed:', error);
      toast.error('Unable to reset password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (tokenMissing && !isResetComplete) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="mb-4">
            <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Invalid Link
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            The reset link is missing or malformed. Please request a new
            password reset email.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8 space-y-4">
          <Link href="/forgot-password">
            <Button className="w-full h-12">Request New Reset Link</Button>
          </Link>
          <Link
            href="/sign-in"
            className="inline-flex items-center justify-center text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (isResetComplete) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="mb-4">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
              <ShieldCheck className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Password Reset
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            Your password has been updated successfully. You can now sign in
            with your new credentials.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8 space-y-4">
          <Link href="/sign-in">
            <Button className="w-full h-12">Go to Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="mb-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Set a New Password
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-300 text-sm">
          Choose a strong password to keep your account secure.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <input type="hidden" {...form.register('token')} />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    New Password
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        {...field}
                        className="h-12 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all duration-200 pr-12"
                        placeholder="Enter a new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                        aria-label={
                          showPassword ? 'Hide password' : 'Show password'
                        }
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage className="text-red-500 dark:text-red-400 text-sm" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Confirm Password
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        {...field}
                        className="h-12 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all duration-200 pr-12"
                        placeholder="Re-enter your new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                        aria-label={
                          showConfirmPassword
                            ? 'Hide password confirmation'
                            : 'Show password confirmation'
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage className="text-red-500 dark:text-red-400 text-sm" />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating Password...
                </>
              ) : (
                'Update Password'
              )}
            </Button>
          </form>
        </Form>

        <div className="mt-6 text-center">
          <Link
            href="/sign-in"
            className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
