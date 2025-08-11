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
  'SYRUP',
  'SUSPENSION',
  'INJECTION',
  'OINTMENT',
]);

export const unitSchema = z.enum(['PIECE', 'BOTTLE', 'VIAL', 'SACHET', 'TUBE']);

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
