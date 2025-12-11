import { z } from 'zod';
import { pharmacyIdSchema, userIdSchema } from './common';

const currencyString = z
  .string()
  .regex(/^(?:\d{1,9})(?:\.\d{1,2})?$/, 'Amount must be a valid number.')
  .optional();

export const stockInItemSchema = z.object({
  productId: z.number().int().positive('Select a product.'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1.'),
  unitCost: z
    .string()
    .regex(/^(?:\d{1,9})(?:\.\d{1,2})?$/, 'Unit cost must be valid.'),
  sellingPrice: z
    .string()
    .regex(/^(?:\d{1,9})(?:\.\d{1,2})?$/, 'Selling price must be valid.')
    .optional(),
  amount: currencyString,
  lotNumber: z.string().max(120).optional().or(z.literal('')),
  expiryDate: z
    .string()
    .refine((value) => (value ? !Number.isNaN(Date.parse(value)) : true), {
      message: 'Expiry date must be valid.',
    })
    .optional(),
});

export const stockInSchema = z.object({
  supplierId: z.number().int().positive().optional(),
  deliveryDate: z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
    message: 'Delivery date is required.',
  }),
  attachmentUrl: z.string().min(1, 'Receipt image/PDF is required.'),
  discount: currencyString,
  subtotal: currencyString,
  total: currencyString,
  items: z.array(stockInItemSchema).min(1, 'Add at least one item.'),
});

export const createStockInSchema = stockInSchema.extend({
  pharmacyId: pharmacyIdSchema,
  createdBy: userIdSchema,
});

export const getStockInsSchema = z.object({
  pharmacyId: pharmacyIdSchema,
});

export const getStockInByIdSchema = z.object({
  id: z.number().int().positive(),
  pharmacyId: pharmacyIdSchema,
});
