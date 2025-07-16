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
import { FIELD_NAMES, FIELD_TYPES } from '@/constants';
import Link from 'next/link';
import { ZodType } from 'zod';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useState } from 'react';
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  User,
  Pill,
  Shield,
  HeartPulse,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import PasswordStrengthIndicator from './PasswordStrengthIndicator';

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
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaultValues as DefaultValues<T>,
  });

  const handleSubmit: SubmitHandler<T> = async (data) => {
    setIsLoading(true);

    try {
      const result = await onSubmit(data);

      if (result.success) {
        toast.success(
          isSignIn
            ? 'Welcome back to BOTica! Redirecting to dashboard...'
            : 'Account created successfully! Welcome to BOTica!',
          {
            description: isSignIn
              ? 'Your pharmacy management dashboard is ready'
              : 'Start managing your pharmacy efficiently',
          },
        );

        setTimeout(() => router.push('/'), 1500);
      } else {
        toast.error(result.error || 'An error occurred. Please try again.');
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getFieldIcon = (fieldName: string) => {
    switch (fieldName) {
      case 'email':
        return <Mail className="h-4 w-4 text-blue-500" />;
      case 'password':
        return <Lock className="h-4 w-4 text-blue-500" />;
      case 'fullName':
        return <User className="h-4 w-4 text-blue-500" />;
      case 'pharmacyName':
        return <Pill className="h-4 w-4 text-blue-500" />;
      case 'licenseNumber':
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return <HeartPulse className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-4">
      {/* Background options - remove or customize these */}
      {/* Option 1: Transparent background (remove bg-white/dark:bg-gray-850) */}
      {/* Option 2: Custom background color (add your own bg- class) */}
      {/* Option 3: Gradient background (add bg-gradient-to- class) */}

      {/* Header */}
      <div className="text-center mb-8">
        <div className="mb-4">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-600 to-teal-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <Pill className="h-10 w-10 text-white" strokeWidth={2} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {isSignIn ? 'Welcome to ' : 'Join '}
            <span className="bg-gradient-to-r from-blue-600 to-teal-500 bg-clip-text text-transparent">
              BOTica
            </span>
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-300 text-sm">
          {isSignIn
            ? 'Sign in to your pharmacy management dashboard'
            : 'Create an account to streamline your pharmacy operations'}
        </p>
      </div>

      {/* Form Container - Background options here */}
      <div className="bg-white/80 dark:bg-gray-850/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 sm:p-8">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-5"
          >
            {Object.keys(defaultValues).map((field) => (
              <FormField
                key={field}
                control={form.control}
                name={field as Path<T>}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {FIELD_NAMES[field.name as keyof typeof FIELD_NAMES]}
                    </FormLabel>
                    <FormControl>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          {getFieldIcon(field.name)}
                        </div>
                        <Input
                          type={
                            field.name === 'password'
                              ? showPassword
                                ? 'text'
                                : 'password'
                              : FIELD_TYPES[
                                  field.name as keyof typeof FIELD_TYPES
                                ]
                          }
                          {...field}
                          className="pl-10 pr-10 h-11 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800/50 dark:text-white transition-all duration-200 group-hover:border-blue-400"
                          placeholder={`Enter your ${FIELD_NAMES[
                            field.name as keyof typeof FIELD_NAMES
                          ].toLowerCase()}`}
                        />
                        {field.name === 'password' && (
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-500 dark:text-red-400 text-xs mt-1" />
                  </FormItem>
                )}
              />
            ))}

            {/* Password Strength Indicator (Sign Up only) */}
            {!isSignIn && form.watch('password' as Path<T>) && (
              <div className="mt-3">
                <PasswordStrengthIndicator
                  password={form.watch('password' as Path<T>) as string}
                />
              </div>
            )}

            {/* Remember Me & Forgot Password (Sign In only) */}
            {isSignIn && (
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked: boolean | 'indeterminate') =>
                      setRememberMe(checked === true)
                    }
                    className="border-gray-300 dark:border-gray-600 data-[state=checked]:bg-blue-600"
                  />
                  <Label
                    htmlFor="remember"
                    className="text-sm text-gray-600 dark:text-gray-300 cursor-pointer select-none"
                  >
                    Remember me
                  </Label>
                </div>
                <Link
                  href="/forgot-password"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  Forgot password?
                </Link>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 text-white font-medium rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isSignIn ? 'Signing In...' : 'Creating Account...'}
                </>
              ) : (
                <>{isSignIn ? 'Sign In' : 'Get Started'}</>
              )}
            </Button>
          </form>
        </Form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200 dark:border-gray-700" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white/80 dark:bg-gray-850/80 text-gray-500">
              Or continue with
            </span>
          </div>
        </div>

        {/* Social Login Button - Only Google now */}
        <Button
          variant="outline"
          className="w-full h-10 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
          disabled
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
          </svg>
          Continue with Google
        </Button>

        {/* Sign Up/Sign In Link */}
        <div className="mt-6 text-center text-sm">
          <p className="text-gray-600 dark:text-gray-400">
            {isSignIn ? "Don't have an account?" : 'Already have an account?'}
            <Link
              href={isSignIn ? '/sign-up' : '/sign-in'}
              className="ml-1.5 text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              {isSignIn ? 'Sign up free' : 'Sign in'}
            </Link>
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          © {new Date().getFullYear()} BOTica. All rights reserved.
          <br className="sm:hidden" />{' '}
          <Link href="/terms" className="hover:underline">
            Terms
          </Link>{' '}
          ·{' '}
          <Link href="/privacy" className="hover:underline">
            Privacy
          </Link>{' '}
          ·{' '}
          <Link href="/security" className="hover:underline">
            Security
          </Link>
        </p>
      </div>
    </div>
  );
};

export default AuthForm;
