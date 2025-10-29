'use server';

import { db } from '@/database/drizzle';
import {
  inventoryAdjustments,
  products,
  suppliers,
  categories,
} from '@/database/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { Adjustment } from '@/types';
import {
  getAdjustmentsSchema,
  createAdjustmentSchema,
} from '@/lib/validations';
import { logActivity } from '@/lib/actions/activity';
import { notifications } from '@/database/schema';
import { gt } from 'drizzle-orm';
import { pharmacyIdSchema } from '@/lib/validations';

export const getAdjustableProducts = async (pharmacyId: number) => {
  try {
    pharmacyIdSchema.parse(pharmacyId);

    const rows = await db
      .select({
        id: products.id,
        name: products.name,
        brandName: products.brandName,
        genericName: products.genericName,
        categoryName: categories.name,
        lotNumber: products.lotNumber,
        expiryDate: products.expiryDate,
        quantity: products.quantity,
        minStockLevel: products.minStockLevel,
        unit: products.unit,
        supplierName: suppliers.name,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(suppliers, eq(products.supplierId, suppliers.id))
      .where(
        and(
          eq(products.pharmacyId, pharmacyId),
          sql`${products.deletedAt} IS NULL`,
        ),
      )
      .orderBy(products.name);

    return rows;
  } catch (error) {
    console.error('Error fetching adjustable products:', error);
    return [];
  }
};

/**
 * Get all inventory adjustments
 */
export const getAdjustments = async (pharmacyId: number) => {
  try {
    // Validate input with Zod
    const validatedData = getAdjustmentsSchema.parse({ pharmacyId });

    const result = await db
      .select({
        id: inventoryAdjustments.id,
        productId: inventoryAdjustments.productId,
        quantityChange: inventoryAdjustments.quantityChange,
        reason: inventoryAdjustments.reason,
        notes: inventoryAdjustments.notes,
        createdAt: inventoryAdjustments.createdAt,
        name: products.name,
        brandName: products.brandName,
        genericName: products.genericName,
        lotNumber: products.lotNumber,
        unit: products.unit,
        currentStock: products.quantity,
        supplierName: suppliers.name,
        expiryDate: products.expiryDate,
      })
      .from(inventoryAdjustments)
      .innerJoin(products, eq(inventoryAdjustments.productId, products.id))
      .leftJoin(suppliers, eq(products.supplierId, suppliers.id))
      .where(eq(inventoryAdjustments.pharmacyId, validatedData.pharmacyId))
      .orderBy(desc(inventoryAdjustments.createdAt));

    return result as Adjustment[];
  } catch (error) {
    console.error('Error fetching adjustments:', error);
    return [];
  }
};

/**
 * Create an inventory adjustment
 */
export const createAdjustment = async ({
  productId,
  quantityChange,
  reason,
  userId,
  pharmacyId,
  notes,
}: {
  productId: number;
  quantityChange: number;
  reason: 'DAMAGED' | 'EXPIRED' | 'LOST_OR_STOLEN' | 'STOCK_CORRECTION';
  userId: string;
  pharmacyId: number;
  notes?: string;
}) => {
  try {
    // Validate input with Zod
    const validatedData = createAdjustmentSchema.parse({
      productId,
      quantityChange,
      reason,
      userId,
      pharmacyId,
      notes,
    });

    // Fetch current product WITH pharmacyId filter
    const [product] = await db
      .select({
        quantity: products.quantity,
        minStockLevel: products.minStockLevel,
        name: products.name,
        brandName: products.brandName,
      })
      .from(products)
      .where(
        and(
          eq(products.id, validatedData.productId),
          eq(products.pharmacyId, validatedData.pharmacyId),
          sql`${products.deletedAt} IS NULL`,
        ),
      );

    if (!product) {
      return { success: false, message: 'Product not found' };
    }

    const currentQuantity = product.quantity;
    const newQuantity = currentQuantity + validatedData.quantityChange;

    // Prevent negative stock
    if (newQuantity < 0) {
      return {
        success: false,
        message: 'Adjustment would result in negative stock',
      };
    }

    // Insert adjustment with pharmacyId
    await db.insert(inventoryAdjustments).values({
      productId: validatedData.productId,
      userId: validatedData.userId,
      quantityChange: validatedData.quantityChange,
      reason: validatedData.reason,
      pharmacyId: validatedData.pharmacyId,
      notes: validatedData.notes,
    });
    // Log adjustment activity
    await logActivity({
      action: 'ADJUSTMENT_CREATED',
      pharmacyId: validatedData.pharmacyId,
      details: {
        productId: validatedData.productId,
        name: product.name,
        brandName: product.brandName ?? null,
        quantityChange: validatedData.quantityChange,
        reason: validatedData.reason,
        notes: validatedData.notes ?? null,
      },
    });

    // Update product quantity
    await db
      .update(products)
      .set({ quantity: newQuantity })
      .where(
        and(
          eq(products.id, validatedData.productId),
          eq(products.pharmacyId, validatedData.pharmacyId),
          sql`${products.deletedAt} IS NULL`,
        ),
      );

    // Targeted notification on threshold crossing (24h dedupe)
    const minLevel = product.minStockLevel ?? 10;
    const recentCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const label = `${product.name ?? 'Product'}${
      product.brandName ? ` (${product.brandName})` : ''
    }`;

    if (validatedData.quantityChange < 0) {
      try {
        if (currentQuantity > 0 && newQuantity <= 0) {
          const recent = await db
            .select({ id: notifications.id })
            .from(notifications)
            .where(
              and(
                eq(notifications.pharmacyId, validatedData.pharmacyId),
                eq(notifications.productId, validatedData.productId),
                eq(notifications.type, 'OUT_OF_STOCK'),
                gt(notifications.createdAt, recentCutoff),
              ),
            )
            .limit(1);
          if (recent.length === 0) {
            await db.insert(notifications).values({
              type: 'OUT_OF_STOCK',
              productId: validatedData.productId,
              message: `${label} is out of stock.`,
              pharmacyId: validatedData.pharmacyId,
              isRead: false,
            });
          }
        } else if (currentQuantity > minLevel && newQuantity <= minLevel) {
          const recent = await db
            .select({ id: notifications.id })
            .from(notifications)
            .where(
              and(
                eq(notifications.pharmacyId, validatedData.pharmacyId),
                eq(notifications.productId, validatedData.productId),
                eq(notifications.type, 'LOW_STOCK'),
                gt(notifications.createdAt, recentCutoff),
              ),
            )
            .limit(1);
          if (recent.length === 0) {
            await db.insert(notifications).values({
              type: 'LOW_STOCK',
              productId: validatedData.productId,
              message: `${label} is low on stock.`,
              pharmacyId: validatedData.pharmacyId,
              isRead: false,
            });
          }
        }
      } catch (innerErr) {
        console.error(
          'Non-fatal: failed to create adjustment notification',
          innerErr,
        );
      }
    }

    // Note: skip full inventory sync here to avoid instant re-creation of notifications

    revalidatePath('/products');
    revalidatePath('/adjustments');

    return { success: true, message: 'Inventory adjusted successfully' };
  } catch (error) {
    console.error('Error creating adjustment:', error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : 'Error adjusting inventory',
    };
  }
};
