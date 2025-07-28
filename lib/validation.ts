import { CategoryParams, SupplierParams } from '@/types';
import { z } from 'zod';

// ✅ Sign Up Schema
export const signUpSchema = z.object({
  fullName: z.string().min(5, 'Full name must be at least 5 characters'),
  email: z.string().email(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/,
      'Password must contain uppercase, lowercase, number, and a special character',
    ),
});

// ✅ Sign In Schema
export const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ✅ Category Schema
export const categorySchema = z.object({
  name: z
    .string()
    .min(4, 'Name must be at least 4 characters')
    .max(30, 'Name too long'),
  description: z
    .string()
    .min(10, 'Description too short')
    .max(255, 'Description too long'),
}) satisfies z.ZodType<CategoryParams>;

// ✅ Product Schema
export const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  genericName: z.string().optional(),
  categoryId: z.number().min(1, 'Category is required'),
  barcode: z
    .string()
    .max(50, 'Barcode must be at most 50 characters')
    .optional(),
  lotNumber: z.string().min(1, 'Lot number is required'),
  brandName: z.string().optional(),
  dosageForm: z.enum([
    'TABLET',
    'CAPSULE',
    'SYRUP',
    'SUSPENSION',
    'LOZENGE',
    'INJECTION',
    'CREAM',
    'OINTMENT',
  ]),
  expiryDate: z.date().refine((date) => !isNaN(date.getTime()), {
    message: 'Expiry date is required',
  }),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  costPrice: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid cost price'),
  sellingPrice: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid selling price'),
  minStockLevel: z.number().min(0).optional(),
  unit: z.enum(['PIECE', 'BOTTLE', 'BOX', 'VIAL', 'SACHET', 'TUBE']),
  supplierId: z.number().min(1, 'Supplier is required').optional(),
  imageUrl: z.string().optional().or(z.literal('')),
});

// ✅ Supplier Schema
export const supplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required'),
  contactPerson: z.string().min(1, 'Contact person is required'),
  phone: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .regex(/^(\+63|0)?9\d{9}$/, 'Invalid Philippine mobile number'),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  address: z.string().min(1, 'Address is required'),
}) satisfies z.ZodType<SupplierParams>;

// ✅ Adjustment Schema
export const adjustmentSchema = z.object({
  productId: z.number().min(1, 'Product selection is required'),

  quantityChange: z
    .number()
    .min(-1000, 'Quantity too low (min: -1000)')
    .max(1000, 'Quantity too high (max: 1000)')
    .refine((val) => val !== 0, {
      message: 'Quantity change cannot be 0',
    }),

  reason: z.enum([
    'DAMAGED',
    'EXPIRED',
    'LOST',
    'THEFT',
    'CORRECTION',
    'RESTOCK',
  ]),

  notes: z.string().max(255, 'Notes must be under 255 characters').optional(),
});

// ✅ Purchase Order Schema
export const purchaseOrderSchema = z.object({
  supplierId: z.number().min(1, 'Supplier is required'),
  orderDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Order date is required',
  }),
  notes: z.string().max(255).optional(),
  items: z.array(
    z.object({
      productId: z.number().min(1, 'Product is required'),
      quantity: z.number().min(1, 'Quantity must be at least 1'),
      unitCost: z
        .string()
        .regex(/^\d+(\.\d{1,2})?$/, 'Invalid unit cost')
        .optional(),
    }),
  ),
});

// Purchase Order Confirmation Schema
export const purchaseOrderConfirmationSchema = z.object({
  confirmedItems: z
    .record(
      z.string(),
      z.object({
        unitCost: z
          .string()
          .min(1, 'Unit cost is required')
          .regex(/^\d+(\.\d{1,2})?$/, 'Invalid unit cost format')
          .refine((val) => parseFloat(val) > 0, {
            message: 'Unit cost must be greater than 0',
          }),
        available: z.boolean(),
      }),
    )
    .refine(
      (items) => {
        const availableItems = Object.values(items).filter(
          (item) => item.available,
        );
        return availableItems.length > 0;
      },
      {
        message: 'At least one item must be available for confirmation',
      },
    )
    .refine(
      (items) => {
        const availableItems = Object.values(items).filter(
          (item) => item.available,
        );
        return availableItems.every((item) => parseFloat(item.unitCost) > 0);
      },
      {
        message: 'All available items must have a valid price greater than 0',
      },
    ),
});

export const saleSchema = z.object({
  paymentMethod: z.enum(['CASH', 'GCASH']),
  discount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Invalid discount')
    .optional(),
  cart: z
    .array(
      z.object({
        productId: z.number(),
        quantity: z.number().min(1),
        unitPrice: z.string(), // string because of decimal
      }),
    )
    .min(1, 'Cart cannot be empty'),
});
