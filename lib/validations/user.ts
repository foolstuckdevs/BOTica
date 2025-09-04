import { z } from 'zod';

export const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

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

// Profile update schema (reuse signUp rules for name/email)
export const profileUpdateSchema = z.object({
  fullName: signUpSchema.shape.fullName,
  email: signUpSchema.shape.email,
});

// Password change schema (current/new/confirm with strong rules)
export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: signUpSchema.shape.password,
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'New passwords do not match.',
    path: ['confirmPassword'],
  });
