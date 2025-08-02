import { z } from 'zod';
import {
  dosageFormSchema,
  unitSchema,
  pharmacyIdSchema,
  productIdSchema,
} from './common';

// =============================================================================
// PRODUCT SCHEMAS
// =============================================================================

export const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  genericName: z.string().optional(),
  categoryId: z.number().min(1, 'Category is required').optional(),
  barcode: z
    .string()
    .max(50, 'Barcode must be at most 50 characters')
    .optional(),
  lotNumber: z.string().min(1, 'Lot number is required'),
  brandName: z.string().optional(),
  dosageForm: dosageFormSchema,
  expiryDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Expiry date is required and must be valid',
  }),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  costPrice: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid cost price'),
  sellingPrice: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid selling price'),
  minStockLevel: z.number().min(0).optional(),
  unit: unitSchema,
  supplierId: z.number().min(1, 'Supplier is required').optional(),
  imageUrl: z.string().optional().or(z.literal('')),
});

// Client-side form schema that handles Date objects for forms
export const productFormSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  genericName: z.string().optional(),
  categoryId: z.number().min(1, 'Category is required').optional(),
  barcode: z
    .string()
    .max(50, 'Barcode must be at most 50 characters')
    .optional(),
  lotNumber: z.string().min(1, 'Lot number is required'),
  brandName: z.string().optional(),
  dosageForm: dosageFormSchema,
  expiryDate: z.date({
    message: 'Expiry date is required',
  }),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  costPrice: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid cost price'),
  sellingPrice: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid selling price'),
  minStockLevel: z.number().min(0).optional(),
  unit: unitSchema,
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

// =============================================================================
// PRODUCT STOCK SCHEMAS
// =============================================================================

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
