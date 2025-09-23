import { z } from 'zod';
import { CategoryParams } from '@/types';
import { pharmacyIdSchema } from './common';

// CATEGORY SCHEMAS

export const categorySchema = z.object({
  name: z
    .string()
    .min(4, 'Name must be at least 4 characters')
    .max(30, 'Name too long')
    .regex(/^[A-Za-z\s]+$/, 'Name must contain letters only'),
  description: z
    .string()
    .min(10, 'Description too short')
    .max(255, 'Description too long'),
}) satisfies z.ZodType<CategoryParams>;

export const createCategorySchema = categorySchema.extend({
  pharmacyId: pharmacyIdSchema,
});

export const updateCategorySchema = z.object({
  id: z.number().min(1, 'Valid category ID is required'),
  pharmacyId: pharmacyIdSchema,
  name: z
    .string()
    .min(4, 'Name must be at least 4 characters')
    .max(30, 'Name too long')
    .regex(/^[A-Za-z\s]+$/, 'Name must contain letters only'),
  description: z
    .string()
    .min(10, 'Description too short')
    .max(255, 'Description too long')
    .optional(),
});

export const deleteCategorySchema = z.object({
  id: z.number().min(1, 'Valid category ID is required'),
  pharmacyId: pharmacyIdSchema,
});

export const getCategoriesSchema = z.object({
  pharmacyId: pharmacyIdSchema,
});
