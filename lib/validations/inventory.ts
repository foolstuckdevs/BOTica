import { z } from 'zod';
import { adjustmentReasonSchema } from './common';

// ADJUSTMENT SCHEMAS

export const createAdjustmentSchema = z.object({
  productId: z.number().int().positive(),
  quantityChange: z.number().int(),
  reason: adjustmentReasonSchema,
  userId: z.string().uuid(),
  pharmacyId: z.number().int().positive(),
  notes: z.string().optional(),
});

export const getAdjustmentsSchema = z.object({
  pharmacyId: z.number().int().positive(),
});
