'use server';

import { db } from '@/database/drizzle';
import { inventoryAdjustments, products, suppliers } from '@/database/schema';
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
      .select({ quantity: products.quantity })
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

    const newQuantity = product.quantity + validatedData.quantityChange;

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
    const minLevel =
      (product as { quantity: number }).quantity !== undefined
        ? (
            await db
              .select({ min: products.minStockLevel })
              .from(products)
              .where(
                and(
                  eq(products.id, validatedData.productId),
                  eq(products.pharmacyId, validatedData.pharmacyId),
                ),
              )
          )[0]?.min ?? 10
        : 10;
    const recentCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [pRow] = await db
      .select({ name: products.name, brandName: products.brandName })
      .from(products)
      .where(eq(products.id, validatedData.productId));
    const label = `${pRow?.name ?? 'Product'}${
      pRow?.brandName ? ` (${pRow.brandName})` : ''
    }`;

    if (validatedData.quantityChange < 0) {
      try {
        if (product.quantity > 0 && newQuantity <= 0) {
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
        } else if (product.quantity > minLevel && newQuantity <= minLevel) {
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
