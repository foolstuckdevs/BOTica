import { CategoryFormValues } from '@/types';
import { z } from 'zod';

export const signUpSchema = z.object({
  fullName: z.string().min(5, 'Full name must be at least 5 characters'),
  email: z.string().email(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/,
      'Password must contain uppercase, lowercase, number, and a special character',
    ),
});

export const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// lib/validation.ts
export const categoryFormSchema = z.object({
  name: z
    .string()
    .min(5, 'Name must be at least 5 characters')
    .max(30, 'Name too long'),
  description: z
    .string()
    .min(10, 'Description too short')
    .max(255, 'Description too long'),
}) satisfies z.ZodType<CategoryFormValues>;
