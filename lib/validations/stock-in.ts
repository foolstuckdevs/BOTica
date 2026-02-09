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
    .trim()
    .min(1, 'Unit cost is required.')
    .regex(/^\d+(?:\.\d{0,2})?$/, 'Unit cost must be a valid number.')
    .refine((value) => {
      const amount = Number(value);
      return Number.isFinite(amount) && amount >= 0 && amount <= 10_000;
    }, {
      message: 'Unit cost must be at least 0.00 up to 10,000.00',
    }),
  sellingPrice: z
    .string()
    .trim()
    .regex(/^\d+(?:\.\d{0,2})?$/, 'Selling price must be a valid number.')
    .refine((value) => {
      const amount = Number(value);
      return Number.isFinite(amount) && amount >= 1 && amount <= 10_000;
    }, {
      message: 'Selling price must be at least 1.00 up to 10,000.00',
    })
    .optional()
    .or(z.literal('')),
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
  supplierId: z.number({ required_error: 'Supplier is required.', invalid_type_error: 'Supplier is required.' }).int().positive('Supplier is required.'),
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
