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

export const categorySchema = z.object({
  name: z
    .string()
    .min(5, 'Name must be at least 5 characters')
    .max(30, 'Name too long'),
  description: z
    .string()
    .min(10, 'Description too short')
    .max(255, 'Description too long'),
}) satisfies z.ZodType<CategoryFormValues>;

export const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  genericName: z.string().optional(),
  categoryId: z.number({
    required_error: 'Category is required',
  }),
  barcode: z
    .string()
    .max(50, 'Barcode must be at most 50 characters')
    .optional(),
  batchNumber: z.string().min(1, 'Batch number is required'),
  expiryDate: z.date({
    required_error: 'Expiry date is required',
    invalid_type_error: 'Invalid date format',
  }),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  costPrice: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid cost price'),
  sellingPrice: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid selling price'),
  minStockLevel: z.number().min(0).optional(),
  unit: z.enum(['TABLET', 'CAPSULE', 'ML', 'GM', 'UNIT', 'VIAL']),
  supplier: z.string().optional(),
});
