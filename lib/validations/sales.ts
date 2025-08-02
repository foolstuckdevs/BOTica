import { z } from 'zod';
import {
  paymentMethodSchema,
  pharmacyIdSchema,
  userIdSchema,
  periodSchema,
} from './common';

// =============================================================================
// SALES SCHEMAS
// =============================================================================

export const cartItemSchema = z.object({
  productId: z.number().min(1, 'Valid product ID is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unitPrice: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid unit price'),
});

export const saleSchema = z.object({
  paymentMethod: paymentMethodSchema,
  discount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Invalid discount')
    .optional(),
  cart: z.array(cartItemSchema).min(1, 'Cart cannot be empty'),
});

export const processSaleSchema = z.object({
  cartItems: z.array(cartItemSchema).min(1, 'Cart items are required'),
  paymentMethod: z.literal('CASH'),
  discount: z.number().min(0, 'Discount cannot be negative'),
  pharmacyId: pharmacyIdSchema,
  userId: userIdSchema,
  cashReceived: z.number().min(0, 'Cash received cannot be negative'),
});

// =============================================================================
// SALES REPORTS SCHEMAS
// =============================================================================

export const getSalesOverviewSchema = z.object({
  pharmacyId: z.number().int().positive(),
  period: periodSchema.optional().default('month'),
});

export const getSalesComparisonSchema = z.object({
  pharmacyId: z.number().int().positive(),
});

export const getSalesReportsComparisonSchema = z.object({
  pharmacyId: z.number().int().positive(),
  period: periodSchema,
});

export const getProductPerformanceSchema = z.object({
  pharmacyId: z.number().int().positive(),
  period: periodSchema,
});

export const getBatchProfitDataSchema = z.object({
  pharmacyId: z.number().int().positive(),
  period: periodSchema.optional().default('month'),
});

export const getBatchProfitSummarySchema = z.object({
  pharmacyId: z.number().int().positive(),
  period: periodSchema.optional().default('month'),
});

// =============================================================================
// TRANSACTION SCHEMAS
// =============================================================================

export const getTransactionsSchema = z.object({
  pharmacyId: z.number().int().positive(),
  searchTerm: z.string().optional(),
});
