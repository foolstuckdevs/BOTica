import { z } from 'zod';
import { purchaseOrderStatusSchema } from './common';

// =============================================================================
// PURCHASE ORDER SCHEMAS
// =============================================================================

export const purchaseOrderItemSchema = z.object({
  productId: z.number().min(1, 'Product is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unitCost: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Invalid unit cost')
    .optional(),
});

export const purchaseOrderSchema = z.object({
  supplierId: z.number().min(1, 'Supplier is required'),
  orderDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Order date is required',
  }),
  notes: z.string().max(255).optional(),
  items: z.array(purchaseOrderItemSchema),
});

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

export const getPurchaseOrdersSchema = z.object({
  pharmacyId: z.number().int().positive(),
});

export const getPurchaseOrderByIdSchema = z.object({
  id: z.number().int().positive(),
  pharmacyId: z.number().int().positive(),
});

export const updatePurchaseOrderStatusSchema = z.object({
  id: z.number().int().positive(),
  status: purchaseOrderStatusSchema,
  pharmacyId: z.number().int().positive(),
});

export const deletePurchaseOrderSchema = z.object({
  id: z.number().int().positive(),
  pharmacyId: z.number().int().positive(),
});

export const updateReceivedQuantitiesSchema = z.object({
  orderId: z.number().int().positive(),
  pharmacyId: z.number().int().positive(),
  receivedItems: z.record(z.string(), z.number().min(0)),
});

export const receiveAllItemsSchema = z.object({
  orderId: z.number().int().positive(),
  pharmacyId: z.number().int().positive(),
});

export const partiallyReceiveItemsSchema = z.object({
  orderId: z.number().int().positive(),
  pharmacyId: z.number().int().positive(),
  receivedItems: z.record(z.string(), z.number().min(0)),
});
