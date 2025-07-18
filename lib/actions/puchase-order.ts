'use server';

import { db } from '@/database/drizzle';
import {
  purchaseOrders,
  purchaseOrderItems,
  suppliers,
  users,
} from '@/database/schema';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { PurchaseOrderParams } from '@/types';
import { purchaseOrderSchema } from '@/lib/validation';

export const getPurchaseOrders = async (pharmacyId: number) => {
  try {
    const orders = await db
      .select({
        id: purchaseOrders.id,
        orderNumber: purchaseOrders.orderNumber,
        supplierId: purchaseOrders.supplierId,
        userId: purchaseOrders.userId,
        orderDate: purchaseOrders.orderDate,
        status: purchaseOrders.status,
        notes: purchaseOrders.notes,
        pharmacyId: purchaseOrders.pharmacyId,
        createdAt: purchaseOrders.createdAt,
        supplierName: suppliers.name,
      })
      .from(purchaseOrders)
      .leftJoin(suppliers, eq(suppliers.id, purchaseOrders.supplierId))
      .where(eq(purchaseOrders.pharmacyId, pharmacyId));

    const results = await Promise.all(
      orders.map(async (order) => {
        const items = await db
          .select({
            id: purchaseOrderItems.id,
            productId: purchaseOrderItems.productId,
            quantity: purchaseOrderItems.quantity,
            unitCost: purchaseOrderItems.unitCost,
            totalCost: purchaseOrderItems.totalCost,
          })
          .from(purchaseOrderItems)
          .where(eq(purchaseOrderItems.purchaseOrderId, order.id));

        const totalItems = items.length;
        const totalQuantity = items.reduce(
          (sum, item) => sum + Number(item.quantity),
          0,
        );
        const totalCost = items.reduce(
          (sum, item) => sum + parseFloat(item.totalCost || '0'),
          0,
        );

        const formattedOrder = {
          id: order.id,
          orderNumber: order.orderNumber,
          supplierId: order.supplierId,
          userId: order.userId,
          orderDate: order.orderDate,
          status: order.status,
          notes: order.notes ?? null,
          pharmacyId: order.pharmacyId,
          createdAt: order.createdAt
            ? new Date(order.createdAt).toISOString()
            : new Date().toISOString(),
          name: order.supplierName ?? undefined,
          totalItems,
          totalQuantity,
          totalCost,
        };

        return formattedOrder;
      }),
    );

    return results;
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    return [];
  }
};

// Get a single purchase order with items
export const getPurchaseOrderById = async (id: number, pharmacyId: number) => {
  try {
    const orderArr = await db
      .select({
        id: purchaseOrders.id,
        orderNumber: purchaseOrders.orderNumber,
        supplierId: purchaseOrders.supplierId,
        userId: purchaseOrders.userId,
        orderDate: purchaseOrders.orderDate,
        status: purchaseOrders.status,
        notes: purchaseOrders.notes,
        pharmacyId: purchaseOrders.pharmacyId,
        createdAt: purchaseOrders.createdAt,
        supplierName: suppliers.name,
      })
      .from(purchaseOrders)
      .leftJoin(suppliers, eq(suppliers.id, purchaseOrders.supplierId))
      .leftJoin(users, eq(users.id, purchaseOrders.userId))
      .where(
        and(
          eq(purchaseOrders.id, id),
          eq(purchaseOrders.pharmacyId, pharmacyId),
        ),
      );

    if (!orderArr.length) return null;
    const order = orderArr[0];

    const itemsRaw = await db
      .select({
        id: purchaseOrderItems.id,
        purchaseOrderId: purchaseOrderItems.purchaseOrderId,
        productId: purchaseOrderItems.productId,
        quantity: purchaseOrderItems.quantity,
        unitCost: purchaseOrderItems.unitCost,
        totalCost: purchaseOrderItems.totalCost,
      })
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.purchaseOrderId, id));

    const formatted = {
      ...order,
      orderDate: new Date(order.orderDate).toISOString(),
      createdAt: order.createdAt
        ? new Date(order.createdAt).toISOString()
        : new Date(order.orderDate).toISOString(),
      notes: order.notes ?? '',
      items: itemsRaw.map((item) => ({
        ...item,
      })),
    };

    return formatted;
  } catch (error) {
    console.error('Error fetching purchase order:', error);
    return null;
  }
};

// Create a new purchase order
export const createPurchaseOrder = async (
  params: PurchaseOrderParams & { pharmacyId: number; userId: string },
) => {
  try {
    // Validate input
    const parsed = purchaseOrderSchema.safeParse(params);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message || 'Validation failed',
      };
    }

    // Generate order number (simple: PO-yyyyMMddHHmmss)
    const orderNumber =
      'PO-' +
      new Date()
        .toISOString()
        .replace(/[-:.TZ]/g, '')
        .slice(0, 14);

    // Insert purchase order
    const [order] = await db
      .insert(purchaseOrders)
      .values({
        orderNumber,
        supplierId: params.supplierId,
        userId: params.userId,
        orderDate: new Date(params.orderDate).toISOString(),
        notes: params.notes,
        pharmacyId: params.pharmacyId,
      })
      .returning();

    // Insert items
    for (const item of params.items) {
      const totalCost = (parseFloat(item.unitCost) * item.quantity).toFixed(2);
      await db.insert(purchaseOrderItems).values({
        purchaseOrderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        unitCost: item.unitCost,
        totalCost,
      });
    }

    revalidatePath('/purchase-orders');
    return { success: true, data: order };
  } catch (error) {
    console.error('Error creating purchase order:', error);
    return { success: false, message: 'Failed to create purchase order' };
  }
};

// Update purchase order status or details
export const updatePurchaseOrder = async (
  id: number,
  params: PurchaseOrderParams,
  pharmacyId: number,
) => {
  try {
    const existing = await db
      .select()
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.id, id),
          eq(purchaseOrders.pharmacyId, pharmacyId),
        ),
      );

    if (!existing.length) {
      return { success: false, message: 'Purchase order not found' };
    }

    // Update order main fields
    await db
      .update(purchaseOrders)
      .set({
        supplierId: params.supplierId,
        orderDate: new Date(params.orderDate).toISOString(),
        notes: params.notes,
      })
      .where(
        and(
          eq(purchaseOrders.id, id),
          eq(purchaseOrders.pharmacyId, pharmacyId),
        ),
      );

    // 🔄 Delete existing items
    await db
      .delete(purchaseOrderItems)
      .where(eq(purchaseOrderItems.purchaseOrderId, id));

    // 🆕 Insert new items
    for (const item of params.items) {
      const totalCost = (parseFloat(item.unitCost) * item.quantity).toFixed(2);

      await db.insert(purchaseOrderItems).values({
        purchaseOrderId: id,
        productId: item.productId,
        quantity: item.quantity,
        unitCost: item.unitCost,
        totalCost,
      });
    }

    revalidatePath('/inventory/purchase-order'); // adjust to match your route
    return { success: true };
  } catch (error) {
    console.error('Error updating purchase order:', error);
    return { success: false, message: 'Failed to update purchase order' };
  }
};

// Delete a purchase order
export const deletePurchaseOrder = async (id: number, pharmacyId: number) => {
  try {
    const existing = await db
      .select()
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.id, id),
          eq(purchaseOrders.pharmacyId, pharmacyId),
        ),
      );
    if (!existing.length) {
      return { success: false, message: 'Purchase order not found' };
    }

    // Delete items first
    await db
      .delete(purchaseOrderItems)
      .where(eq(purchaseOrderItems.purchaseOrderId, id));

    await db
      .delete(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.id, id),
          eq(purchaseOrders.pharmacyId, pharmacyId),
        ),
      );

    revalidatePath('/purchase-orders');
    return { success: true, message: 'Purchase order deleted successfully' };
  } catch (error) {
    console.error('Error deleting purchase order:', error);
    return { success: false, message: 'Failed to delete purchase order' };
  }
};
