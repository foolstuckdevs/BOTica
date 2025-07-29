'use server';

import { db } from '@/database/drizzle';
import {
  purchaseOrders,
  purchaseOrderItems,
  suppliers,
  users,
  products,
} from '@/database/schema';
import { eq, and, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { PurchaseOrderParams } from '@/types';
import {
  purchaseOrderSchema,
  purchaseOrderConfirmationSchema,
} from '@/lib/validation';

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
        totalCost: purchaseOrders.totalCost,
        pharmacyId: purchaseOrders.pharmacyId,
        createdAt: purchaseOrders.createdAt,
        updatedAt: purchaseOrders.updatedAt,
        supplierName: suppliers.name, // JOIN to get supplier name
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
          })
          .from(purchaseOrderItems)
          .where(eq(purchaseOrderItems.purchaseOrderId, order.id));

        // Calculate computed fields
        const totalItems = items.length;
        const totalQuantity = items.reduce(
          (sum, item) => sum + Number(item.quantity),
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
          totalCost: order.totalCost || '0.00',
          pharmacyId: order.pharmacyId,
          createdAt: order.createdAt
            ? new Date(order.createdAt).toISOString()
            : new Date().toISOString(),
          updatedAt: order.updatedAt
            ? new Date(order.updatedAt).toISOString()
            : undefined,
          supplierName: order.supplierName ?? undefined,
          totalItems,
          totalQuantity,
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
        totalCost: purchaseOrders.totalCost,
        pharmacyId: purchaseOrders.pharmacyId,
        createdAt: purchaseOrders.createdAt,
        updatedAt: purchaseOrders.updatedAt,
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
        receivedQuantity: purchaseOrderItems.receivedQuantity,
        unitCost: purchaseOrderItems.unitCost,
      })
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.purchaseOrderId, id));

    // Calculate computed fields
    const totalItems = itemsRaw.length;
    const totalQuantity = itemsRaw.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );

    const formatted = {
      ...order,
      orderDate: new Date(order.orderDate).toISOString(),
      createdAt: order.createdAt
        ? new Date(order.createdAt).toISOString()
        : new Date(order.orderDate).toISOString(),
      updatedAt: order.updatedAt
        ? new Date(order.updatedAt).toISOString()
        : undefined,
      notes: order.notes ?? '',
      totalCost: order.totalCost || '0.00',
      totalItems,
      totalQuantity,
      items: itemsRaw.map((item) => ({
        ...item,
        // Add computed totalCost for each item
        totalCost: item.unitCost
          ? parseFloat(item.unitCost) * item.quantity
          : 0,
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

    // Insert purchase order with initial status 'DRAFT'
    const [order] = await db
      .insert(purchaseOrders)
      .values({
        orderNumber,
        supplierId: params.supplierId,
        userId: params.userId,
        orderDate: new Date(params.orderDate).toISOString(),
        notes: params.notes,
        pharmacyId: params.pharmacyId,
        status: 'DRAFT',
      })
      .returning();

    // Insert items
    for (const item of params.items) {
      // Use unitCost if provided, otherwise set to null for draft orders
      const unitCost = item.unitCost || null;
      await db.insert(purchaseOrderItems).values({
        purchaseOrderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        unitCost: unitCost,
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
      // Use unitCost if provided, otherwise set to null for draft orders
      const unitCost = item.unitCost || null;

      await db.insert(purchaseOrderItems).values({
        purchaseOrderId: id,
        productId: item.productId,
        quantity: item.quantity,
        unitCost: unitCost,
      });
    }

    revalidatePath('/inventory/purchase-order'); // adjust to match your route
    return { success: true };
  } catch (error) {
    console.error('Error updating purchase order:', error);
    return { success: false, message: 'Failed to update purchase order' };
  }
};

// Update only the status of a purchase order
export const updatePurchaseOrderStatus = async (
  id: number,
  status:
    | 'DRAFT'
    | 'EXPORTED'
    | 'SUBMITTED'
    | 'CONFIRMED'
    | 'PARTIALLY_RECEIVED'
    | 'RECEIVED'
    | 'COMPLETED'
    | 'CANCELLED',
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
    await db
      .update(purchaseOrders)
      .set({ status })
      .where(
        and(
          eq(purchaseOrders.id, id),
          eq(purchaseOrders.pharmacyId, pharmacyId),
        ),
      );
    revalidatePath('/purchase-orders');
    revalidatePath(`/inventory/purchase-order/${id}`);
    revalidatePath('/inventory/purchase-order');
    return { success: true };
  } catch (error) {
    console.error('Error updating purchase order status:', error);
    return { success: false, message: 'Failed to update status' };
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

// Confirm purchase order with supplier pricing
export const confirmPurchaseOrder = async (
  id: number,
  pharmacyId: number,
  confirmedItems: Record<number, { unitCost: string; available: boolean }>,
) => {
  try {
    // Filter out unavailable items before validation
    const availableItemsOnly = Object.fromEntries(
      Object.entries(confirmedItems).filter(([, item]) => item.available),
    );

    // Validate only the available items
    const validation = purchaseOrderConfirmationSchema.safeParse({
      confirmedItems: availableItemsOnly,
    });

    if (!validation.success) {
      return {
        success: false,
        message: validation.error.issues[0]?.message || 'Validation failed',
      };
    }

    // Check if purchase order exists
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

    // Update items with confirmed pricing and remove unavailable items
    let confirmedTotalCost = 0;

    for (const [itemId, itemData] of Object.entries(confirmedItems)) {
      const itemIdNum = parseInt(itemId);

      if (itemData.available) {
        // Get current quantity for total cost calculation
        const quantityResult = await db
          .select({ quantity: purchaseOrderItems.quantity })
          .from(purchaseOrderItems)
          .where(eq(purchaseOrderItems.id, itemIdNum))
          .limit(1);

        const quantity = quantityResult[0]?.quantity || 0;
        const itemTotal = parseFloat(itemData.unitCost) * quantity;
        confirmedTotalCost += itemTotal;

        // Update item with confirmed pricing (no totalCost field)
        await db
          .update(purchaseOrderItems)
          .set({
            unitCost: itemData.unitCost,
          })
          .where(eq(purchaseOrderItems.id, itemIdNum));
      } else {
        // Remove unavailable items
        await db
          .delete(purchaseOrderItems)
          .where(eq(purchaseOrderItems.id, itemIdNum));
      }
    }

    // Update purchase order status and total cost
    await db
      .update(purchaseOrders)
      .set({
        status: 'CONFIRMED',
        totalCost: confirmedTotalCost.toFixed(2),
      })
      .where(
        and(
          eq(purchaseOrders.id, id),
          eq(purchaseOrders.pharmacyId, pharmacyId),
        ),
      );

    revalidatePath('/inventory/purchase-order');
    return {
      success: true,
      message: 'Purchase order confirmed successfully',
    };
  } catch (error) {
    console.error('Error confirming purchase order:', error);
    return { success: false, message: 'Failed to confirm purchase order' };
  }
};

// Update received quantities for purchase order items
export const updateReceivedQuantities = async (
  orderId: number,
  pharmacyId: number,
  receivedItems: Record<number, number>,
) => {
  try {
    // Validate that the purchase order exists
    const orderExists = await db
      .select()
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.id, orderId),
          eq(purchaseOrders.pharmacyId, pharmacyId),
        ),
      );

    if (!orderExists.length) {
      return { success: false, message: 'Purchase order not found' };
    }

    // Update received quantities in purchase order items
    for (const [itemId, receivedQty] of Object.entries(receivedItems)) {
      if (receivedQty > 0) {
        await db
          .update(purchaseOrderItems)
          .set({ receivedQuantity: receivedQty })
          .where(eq(purchaseOrderItems.id, parseInt(itemId)));
      }
    }

    // Check if all items are fully received to update order status
    const allItems = await db
      .select({
        id: purchaseOrderItems.id,
        quantity: purchaseOrderItems.quantity,
        receivedQuantity: purchaseOrderItems.receivedQuantity,
      })
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.purchaseOrderId, orderId));

    const allFullyReceived = allItems.every(
      (item) => item.receivedQuantity >= item.quantity,
    );
    const anyPartiallyReceived = allItems.some(
      (item) =>
        item.receivedQuantity > 0 && item.receivedQuantity < item.quantity,
    );

    // Update order status based on received quantities
    let newStatus: 'PARTIALLY_RECEIVED' | 'RECEIVED' = 'PARTIALLY_RECEIVED';
    if (allFullyReceived) {
      newStatus = 'RECEIVED';
    } else if (anyPartiallyReceived) {
      newStatus = 'PARTIALLY_RECEIVED';
    }

    await db
      .update(purchaseOrders)
      .set({ status: newStatus })
      .where(
        and(
          eq(purchaseOrders.id, orderId),
          eq(purchaseOrders.pharmacyId, pharmacyId),
        ),
      );

    revalidatePath('/inventory/purchase-order');
    return {
      success: true,
      message: 'Received quantities updated successfully',
    };
  } catch (error) {
    console.error('Error updating received quantities:', error);
    return { success: false, message: 'Failed to update received quantities' };
  }
};

// Receive all items (mark all quantities as fully received)
export const receiveAllItems = async (
  orderId: number,
  pharmacyId: number,
  updateInventory: boolean = true,
) => {
  try {
    // Get all items for this purchase order
    const orderItems = await db
      .select({
        id: purchaseOrderItems.id,
        productId: purchaseOrderItems.productId,
        quantity: purchaseOrderItems.quantity,
        receivedQuantity: purchaseOrderItems.receivedQuantity,
        unitCost: purchaseOrderItems.unitCost,
      })
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.purchaseOrderId, orderId));

    if (!orderItems.length) {
      return { success: false, message: 'No items found for this order' };
    }

    await db.transaction(async (tx) => {
      // Update all items to fully received
      for (const item of orderItems) {
        await tx
          .update(purchaseOrderItems)
          .set({ receivedQuantity: item.quantity })
          .where(eq(purchaseOrderItems.id, item.id));

        // Update product inventory if requested
        if (updateInventory) {
          const quantityToAdd = item.quantity - item.receivedQuantity;
          if (quantityToAdd > 0) {
            await tx
              .update(products)
              .set({
                quantity: sql`${products.quantity} + ${quantityToAdd}`,
                costPrice: item.unitCost || products.costPrice,
              })
              .where(
                and(
                  eq(products.id, item.productId),
                  eq(products.pharmacyId, pharmacyId),
                ),
              );
          }
        }
      }

      // Update order status to RECEIVED
      await tx
        .update(purchaseOrders)
        .set({ status: 'RECEIVED' })
        .where(
          and(
            eq(purchaseOrders.id, orderId),
            eq(purchaseOrders.pharmacyId, pharmacyId),
          ),
        );
    });

    revalidatePath('/inventory/purchase-order');
    revalidatePath('/products');
    return { success: true, message: 'All items received successfully' };
  } catch (error) {
    console.error('Error receiving all items:', error);
    return { success: false, message: 'Failed to receive all items' };
  }
};

// Partially receive items with inventory update
export const partiallyReceiveItems = async (
  orderId: number,
  pharmacyId: number,
  receivedItems: Record<number, number>,
  updateInventory: boolean = true,
) => {
  try {
    await db.transaction(async (tx) => {
      // Update received quantities and inventory
      for (const [itemId, receivedQty] of Object.entries(receivedItems)) {
        if (receivedQty > 0) {
          const itemIdNum = parseInt(itemId);

          // Get current item details
          const [currentItem] = await tx
            .select({
              productId: purchaseOrderItems.productId,
              receivedQuantity: purchaseOrderItems.receivedQuantity,
              unitCost: purchaseOrderItems.unitCost,
            })
            .from(purchaseOrderItems)
            .where(eq(purchaseOrderItems.id, itemIdNum));

          if (currentItem) {
            // Update received quantity
            await tx
              .update(purchaseOrderItems)
              .set({ receivedQuantity: receivedQty })
              .where(eq(purchaseOrderItems.id, itemIdNum));

            // Update product inventory if requested
            if (updateInventory) {
              const quantityToAdd = receivedQty - currentItem.receivedQuantity;
              if (quantityToAdd > 0) {
                await tx
                  .update(products)
                  .set({
                    quantity: sql`${products.quantity} + ${quantityToAdd}`,
                    costPrice: currentItem.unitCost || products.costPrice,
                  })
                  .where(
                    and(
                      eq(products.id, currentItem.productId),
                      eq(products.pharmacyId, pharmacyId),
                    ),
                  );
              }
            }
          }
        }
      }

      // Check if all items are fully received to update order status
      const allItems = await tx
        .select({
          id: purchaseOrderItems.id,
          quantity: purchaseOrderItems.quantity,
          receivedQuantity: purchaseOrderItems.receivedQuantity,
        })
        .from(purchaseOrderItems)
        .where(eq(purchaseOrderItems.purchaseOrderId, orderId));

      const allFullyReceived = allItems.every(
        (item) => item.receivedQuantity >= item.quantity,
      );
      const anyPartiallyReceived = allItems.some(
        (item) => item.receivedQuantity > 0,
      );

      // Update order status based on received quantities
      let newStatus: 'PARTIALLY_RECEIVED' | 'RECEIVED' = 'PARTIALLY_RECEIVED';
      if (allFullyReceived) {
        newStatus = 'RECEIVED';
      } else if (anyPartiallyReceived) {
        newStatus = 'PARTIALLY_RECEIVED';
      }

      await tx
        .update(purchaseOrders)
        .set({ status: newStatus })
        .where(
          and(
            eq(purchaseOrders.id, orderId),
            eq(purchaseOrders.pharmacyId, pharmacyId),
          ),
        );
    });

    revalidatePath('/inventory/purchase-order');
    revalidatePath('/products');
    return { success: true, message: 'Items received successfully' };
  } catch (error) {
    console.error('Error partially receiving items:', error);
    return { success: false, message: 'Failed to receive items' };
  }
};
