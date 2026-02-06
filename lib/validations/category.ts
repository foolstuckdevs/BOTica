import { z } from 'zod';
import { CategoryParams } from '@/types';
import { pharmacyIdSchema } from './common';

// CATEGORY SCHEMAS

export const categorySchema = z.object({
  name: z
    .string()
    .min(1, 'Category is required')
    .min(4, 'Name must be at least 4 characters')
    .max(50, 'Name too long')
    .regex(/^[A-Za-z\s&]+$/, 'Name can include letters, spaces, and &'),
  description: z
    .string()
    .transform((val) => val.trim() === '' ? undefined : val)
    .optional()
    .refine((val) => !val || val.length >= 8, {
      message: 'Description too short',
    })
    .refine((val) => !val || val.length <= 255, {
      message: 'Description too long',
    }),
}) satisfies z.ZodType<CategoryParams>;

export const createCategorySchema = categorySchema.extend({
  pharmacyId: pharmacyIdSchema,
});

export const updateCategorySchema = z.object({
  id: z.number().min(1, 'Valid category ID is required'),
  pharmacyId: pharmacyIdSchema,
  name: z
    .string()
    .min(1, 'Category is required')
    .min(4, 'Category name must be at least 4 characters')
    .max(30, 'Category name too long')
    .regex(/^[A-Za-z\s&]+$/, 'Name can include letters, spaces, and &'),
  description: z
    .string()
    .transform((val) => val.trim() === '' ? undefined : val)
    .optional()
    .refine((val) => !val || val.length >= 10, {
      message: 'Description too short',
    })
    .refine((val) => !val || val.length <= 255, {
      message: 'Description too long',
    }),
});

export const deleteCategorySchema = z.object({
  id: z.number().min(1, 'Valid category ID is required'),
  pharmacyId: pharmacyIdSchema,
});

export const getCategoriesSchema = z.object({
  pharmacyId: pharmacyIdSchema,
});
