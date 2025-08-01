'use server';

import { db } from '@/database/drizzle';
import { inventoryAdjustments, products, suppliers } from '@/database/schema';
import { eq, and, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { Adjustment } from '@/types';

/**
 * Get all inventory adjustments
 */
export const getAdjustments = async (pharmacyId: number) => {
  try {
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
      .where(eq(inventoryAdjustments.pharmacyId, pharmacyId))
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
    // Fetch current product WITH pharmacyId filter
    const [product] = await db
      .select({ quantity: products.quantity })
      .from(products)
      .where(
        and(eq(products.id, productId), eq(products.pharmacyId, pharmacyId)),
      );

    if (!product) {
      return { success: false, message: 'Product not found' };
    }

    const newQuantity = product.quantity + quantityChange;

    // Prevent negative stock
    if (newQuantity < 0) {
      return {
        success: false,
        message: 'Adjustment would result in negative stock',
      };
    }

    // Insert adjustment with pharmacyId
    await db.insert(inventoryAdjustments).values({
      productId,
      userId,
      quantityChange,
      reason,
      pharmacyId,
      notes,
    });

    // Update product quantity
    await db
      .update(products)
      .set({ quantity: newQuantity })
      .where(
        and(eq(products.id, productId), eq(products.pharmacyId, pharmacyId)),
      );

    revalidatePath('/products');
    revalidatePath('/adjustments');

    return { success: true, message: 'Inventory adjusted successfully' };
  } catch (error) {
    console.error('Error creating adjustment:', error);
    return { success: false, message: 'Error adjusting inventory' };
  }
};
