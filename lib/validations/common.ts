import { z } from 'zod';

// COMMON/SHARED SCHEMAS

// Common ID schemas used across multiple validators
export const pharmacyIdSchema = z
  .number()
  .min(1, 'Valid pharmacy ID is required');
export const userIdSchema = z.string().min(1, 'Valid user ID is required');
export const productIdSchema = z
  .number()
  .min(1, 'Valid product ID is required');

// Common enum schemas
export const dosageFormSchema = z.enum([
  'TABLET',
  'CAPSULE',
  'CHEWABLE_TABLET',
  'SYRUP',
  'SUSPENSION',
  'GRANULES',
  'INJECTION',
  'DROPS',
  'SOLUTION',
  'SUPPOSITORY',
  'INHALER',
  'CREAM',
  'OINTMENT',
  'GEL',
  'LOTION',
  'PATCH',
]);

export const unitSchema = z.enum(['PIECE', 'BOX']);

// Optional variants for nullable fields
export const dosageFormSchemaOptional = dosageFormSchema.optional();
export const unitSchemaOptional = unitSchema.optional();

export const paymentMethodSchema = z.enum(['CASH', 'GCASH']);

export const purchaseOrderStatusSchema = z.enum([
  'DRAFT',
  'EXPORTED',
  'SUBMITTED',
  'CONFIRMED',
  'PARTIALLY_RECEIVED',
  'RECEIVED',
  'CANCELLED',
]);

export const adjustmentReasonSchema = z.enum([
  'DAMAGED',
  'EXPIRED',
  'LOST_OR_STOLEN',
  'STOCK_CORRECTION',
]);

export const periodSchema = z.enum([
  'today',
  'yesterday',
  'week',
  'month',
  'quarter',
]);
