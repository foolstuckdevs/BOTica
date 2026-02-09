import { z } from 'zod';
import {
  dosageFormSchemaOptional,
  pharmacyIdSchema,
  productIdSchema,
} from './common';

const costPriceSchema = z
  .string()
  .trim()
  .min(1, 'Cost price is required')
  .regex(/^\d+(?:\.\d{0,2})?$/, 'Cost price must be a valid number')
  .refine((value) => {
    const amount = Number(value);
    return Number.isFinite(amount) && amount >= 0 && amount <= 10_000;
  }, {
    message: 'Cost Price must be at least 0.00 up to 10,000.00',
  });

const sellingPriceSchema = z
  .string()
  .trim()
  .min(1, 'Selling price is required')
  .regex(/^\d+(?:\.\d{0,2})?$/, 'Selling price must be a valid number')
  .refine((value) => {
    const amount = Number(value);
    return Number.isFinite(amount) && amount >= 1 && amount <= 10_000;
  }, {
    message: 'Selling price must be at least 1.00 up to 10,000.00',
  });

const unitRequiredSchema = z.enum(['PIECE', 'BOX'], {
  required_error: 'Unit is required',
  invalid_type_error: 'Unit is required',
});

export const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  genericName: z.string().optional(),
  categoryId: z.number({ required_error: 'Category is required', invalid_type_error: 'Category is required' }).min(1, 'Category is required'),
  lotNumber: z.string().optional(),
  brandName: z.string().optional(),
  dosageForm: dosageFormSchemaOptional,
  expiryDate: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), {
      message: 'Expiry date must be valid',
    })
    .optional(),
  quantity: z
    .number()
    .min(0, 'Quantity must be at least 0')
    .max(9999, 'Quantity cannot exceed 9999'),
  costPrice: costPriceSchema,
  sellingPrice: sellingPriceSchema,
  minStockLevel: z
    .number()
    .min(0)
    .max(999, 'Minimum stock cannot exceed 999')
    .optional(),
  unit: unitRequiredSchema,
  supplierId: z.number().min(1, 'Supplier is required').optional(),
  imageUrl: z.string().optional().or(z.literal('')),
});

// Client-side form schema
export const productFormSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  genericName: z.string().optional(),
  categoryId: z.number({ required_error: 'Category is required', invalid_type_error: 'Category is required' }).min(1, 'Category is required'),
  lotNumber: z.string().optional(),
  brandName: z.string().optional(),
  dosageForm: dosageFormSchemaOptional,
  expiryDate: z
    .date({
      message: 'Expiry date is required',
    })
    .optional(),
  quantity: z
    .number()
    .min(0, 'Quantity must be at least 0')
    .max(9999, 'Quantity cannot exceed 9999'),
  costPrice: costPriceSchema,
  sellingPrice: sellingPriceSchema,
  minStockLevel: z
    .number()
    .min(0)
    .max(999, 'Minimum stock cannot exceed 999')
    .optional(),
  unit: unitRequiredSchema,
  supplierId: z.number().min(1, 'Supplier is required').optional(),
  imageUrl: z.string().optional().or(z.literal('')),
});

export const createProductSchema = productSchema.extend({
  pharmacyId: pharmacyIdSchema,
});

export const updateProductSchema = z.object({
  id: productIdSchema,
  params: productSchema.partial(),
  pharmacyId: pharmacyIdSchema,
});

export const getProductBatchesSchema = z.object({
  productName: z.string().min(1, 'Valid product name is required'),
  pharmacyId: pharmacyIdSchema,
});

export const getProductStockSummariesSchema = z.object({
  pharmacyId: z.number().int().positive(),
});

export const getTopSellingProductsSchema = z.object({
  pharmacyId: z.number().int().positive(),
  limit: z.number().int().positive().optional().default(5),
});

export const getLowStockProductsSchema = z.object({
  pharmacyId: z.number().int().positive(),
  limit: z.number().int().positive().optional().default(10),
});
