'use server';

import { db } from '@/database/drizzle';
import {
  purchaseOrders,
  purchaseOrderItems,
  suppliers,
  users,
  products,
  categories,
} from '@/database/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { PurchaseOrderParams } from '@/types';
import {
  purchaseOrderSchema,
  purchaseOrderConfirmationSchema,
  getPurchaseOrdersSchema,
  getPurchaseOrderByIdSchema,
  updatePurchaseOrderStatusSchema,
  deletePurchaseOrderSchema,
  updateReceivedQuantitiesSchema,
  receiveAllItemsSchema,
  partiallyReceiveItemsSchema,
} from '@/lib/validations';
import { pharmacyIdSchema } from '@/lib/validations';
import { logActivity } from '@/lib/actions/activity';

// Provide catalog for PO: includes soft-deleted products (for historical ordering), scoped by pharmacy
export const getOrderableProducts = async (pharmacyId: number) => {
  try {
    pharmacyIdSchema.parse(pharmacyId);

    const result = await db
      .select({
        id: products.id,
        name: products.name,
        genericName: products.genericName,
        categoryId: products.categoryId,
        categoryName: categories.name,
        barcode: products.barcode,
        lotNumber: products.lotNumber,
        expiryDate: products.expiryDate,
        quantity: products.quantity,
        costPrice: products.costPrice,
        sellingPrice: products.sellingPrice,
        minStockLevel: products.minStockLevel,
        unit: products.unit,
        supplierId: products.supplierId,
        supplierName: suppliers.name,
        imageUrl: products.imageUrl,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        brandName: products.brandName,
        dosageForm: products.dosageForm,
        deletedAt: products.deletedAt,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(suppliers, eq(products.supplierId, suppliers.id))
      .where(eq(products.pharmacyId, pharmacyId))
      .orderBy(products.name);

    return result;
  } catch (error) {
    console.error('Error fetching orderable products:', error);
    return [];
  }
};

// Generate purchase orders list with computed totals
export const getPurchaseOrders = async (pharmacyId: number) => {
  try {
    // Validate input with Zod
    const validatedData = getPurchaseOrdersSchema.parse({ pharmacyId });

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
        supplierName: suppliers.name,
      })
      .from(purchaseOrders)
      .leftJoin(suppliers, eq(suppliers.id, purchaseOrders.supplierId))
      .orderBy(desc(purchaseOrders.createdAt))
      .where(eq(purchaseOrders.pharmacyId, validatedData.pharmacyId));

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

        const totalItems = items.length;
        const totalQuantity = items.reduce(
          (sum, item) => sum + Number(item.quantity),
          0,
        );

        return {
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
      }),
    );

    return results;
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    return [];
  }
};

// Get purchase order details with items
export const getPurchaseOrderById = async (id: number, pharmacyId: number) => {
  try {
    // Validate input with Zod
    const validatedData = getPurchaseOrderByIdSchema.parse({ id, pharmacyId });

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
          eq(purchaseOrders.id, validatedData.id),
          eq(purchaseOrders.pharmacyId, validatedData.pharmacyId),
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
      .where(eq(purchaseOrderItems.purchaseOrderId, validatedData.id));

    const totalItems = itemsRaw.length;
    const totalQuantity = itemsRaw.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );

    return {
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
        totalCost: item.unitCost
          ? parseFloat(item.unitCost) * item.quantity
          : 0,
      })),
    };
  } catch (error) {
    console.error('Error fetching purchase order:', error);
    return null;
  }
};

// Create new purchase order with DRAFT status
export const createPurchaseOrder = async (
  params: PurchaseOrderParams & { pharmacyId: number; userId: string },
) => {
  try {
    const parsed = purchaseOrderSchema.safeParse(params);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message || 'Validation failed',
      };
    }

    // Generate unique order number
    const orderNumber =
      'PO-' +
      new Date()
        .toISOString()
        .replace(/[-:.TZ]/g, '')
        .slice(0, 14);

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

    // Add order items
    for (const item of params.items) {
      const unitCost = item.unitCost || null;
      await db.insert(purchaseOrderItems).values({
        purchaseOrderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        unitCost: unitCost,
      });
    }

    revalidatePath('/purchase-orders');

    // Activity log
    let supplierName: string | undefined;
    try {
      const [sup] = await db
        .select({ name: suppliers.name })
        .from(suppliers)
        .where(eq(suppliers.id, params.supplierId));
      supplierName = sup?.name;
    } catch {}
    await logActivity({
      action: 'PO_CREATED',
      pharmacyId: params.pharmacyId,
      details: {
        id: order.id,
        orderNumber,
        supplierId: params.supplierId,
        supplierName: supplierName ?? null,
      },
    });

    return { success: true, data: order };
  } catch (error) {
    console.error('Error creating purchase order:', error);
    return { success: false, message: 'Failed to create purchase order' };
  }
};

// Update purchase order details and items
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

    // Check if the purchase order is in a final state and cannot be edited
    const currentStatus = existing[0].status;
    if (
      currentStatus === 'CONFIRMED' ||
      currentStatus === 'PARTIALLY_RECEIVED' ||
      currentStatus === 'RECEIVED' ||
      currentStatus === 'CANCELLED'
    ) {
      return {
        success: false,
        message: `Editing not allowed. Purchase order is already marked as '${currentStatus}'.`,
      };
    }

    // Update order details
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

    // Replace order items
    await db
      .delete(purchaseOrderItems)
      .where(eq(purchaseOrderItems.purchaseOrderId, id));

    for (const item of params.items) {
      const unitCost = item.unitCost || null;
      await db.insert(purchaseOrderItems).values({
        purchaseOrderId: id,
        productId: item.productId,
        quantity: item.quantity,
        unitCost: unitCost,
      });
    }

    revalidatePath('/inventory/purchase-order');

    // Activity log
    await logActivity({
      action: 'PO_UPDATED',
      pharmacyId,
      details: { id },
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating purchase order:', error);
    return { success: false, message: 'Failed to update purchase order' };
  }
};

// Update purchase order status
export const updatePurchaseOrderStatus = async (
  id: number,
  status:
    | 'DRAFT'
    | 'EXPORTED'
    | 'SUBMITTED'
    | 'CONFIRMED'
    | 'PARTIALLY_RECEIVED'
    | 'RECEIVED'
    | 'CANCELLED',
  pharmacyId: number,
) => {
  try {
    // Validate input with Zod
    const validatedData = updatePurchaseOrderStatusSchema.parse({
      id,
      status,
      pharmacyId,
    });

    const existing = await db
      .select()
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.id, validatedData.id),
          eq(purchaseOrders.pharmacyId, validatedData.pharmacyId),
        ),
      );

    if (!existing.length) {
      return { success: false, message: 'Purchase order not found' };
    }

    await db
      .update(purchaseOrders)
      .set({ status: validatedData.status })
      .where(
        and(
          eq(purchaseOrders.id, validatedData.id),
          eq(purchaseOrders.pharmacyId, validatedData.pharmacyId),
        ),
      );

    revalidatePath('/purchase-orders');
    revalidatePath(`/inventory/purchase-order/${validatedData.id}`);
    revalidatePath('/inventory/purchase-order');

    // Activity log
    await logActivity({
      action: 'PO_STATUS_CHANGED',
      pharmacyId: validatedData.pharmacyId,
      details: { id: validatedData.id, status: validatedData.status },
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating purchase order status:', error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : 'Failed to update status',
    };
  }
};

// Delete purchase order and its items
export const deletePurchaseOrder = async (id: number, pharmacyId: number) => {
  try {
    // Validate input with Zod
    const validatedData = deletePurchaseOrderSchema.parse({ id, pharmacyId });

    const existing = await db
      .select()
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.id, validatedData.id),
          eq(purchaseOrders.pharmacyId, validatedData.pharmacyId),
        ),
      );

    if (!existing.length) {
      return { success: false, message: 'Purchase order not found' };
    }

    // Delete items first due to foreign key constraint
    await db
      .delete(purchaseOrderItems)
      .where(eq(purchaseOrderItems.purchaseOrderId, validatedData.id));

    await db
      .delete(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.id, validatedData.id),
          eq(purchaseOrders.pharmacyId, validatedData.pharmacyId),
        ),
      );

    revalidatePath('/purchase-orders');

    // Activity log
    const orderNumber = (existing[0] as { orderNumber?: string })?.orderNumber;
    await logActivity({
      action: 'PO_DELETED',
      pharmacyId: validatedData.pharmacyId,
      details: { id: validatedData.id, orderNumber: orderNumber ?? null },
    });

    return { success: true, message: 'Purchase order deleted' };
  } catch (error) {
    console.error('Error deleting purchase order:', error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Failed to delete purchase order',
    };
  }
};

// Confirm purchase order with supplier pricing and availability
export const confirmPurchaseOrder = async (
  id: number,
  pharmacyId: number,
  confirmedItems: Record<number, { unitCost: string; available: boolean }>,
) => {
  try {
    // Filter to available items only
    const availableItemsOnly = Object.fromEntries(
      Object.entries(confirmedItems).filter(([, item]) => item.available),
    );

    const validation = purchaseOrderConfirmationSchema.safeParse({
      confirmedItems: availableItemsOnly,
    });

    if (!validation.success) {
      return {
        success: false,
        message: validation.error.issues[0]?.message || 'Validation failed',
      };
    }

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

    let confirmedTotalCost = 0;

    // Update items with confirmed pricing and remove unavailable items
    for (const [itemId, itemData] of Object.entries(confirmedItems)) {
      const itemIdNum = parseInt(itemId);

      if (itemData.available) {
        const quantityResult = await db
          .select({ quantity: purchaseOrderItems.quantity })
          .from(purchaseOrderItems)
          .where(eq(purchaseOrderItems.id, itemIdNum))
          .limit(1);

        const quantity = quantityResult[0]?.quantity || 0;
        const itemTotal = parseFloat(itemData.unitCost) * quantity;
        confirmedTotalCost += itemTotal;

        await db
          .update(purchaseOrderItems)
          .set({ unitCost: itemData.unitCost })
          .where(eq(purchaseOrderItems.id, itemIdNum));
      } else {
        // Remove unavailable items
        await db
          .delete(purchaseOrderItems)
          .where(eq(purchaseOrderItems.id, itemIdNum));
      }
    }

    // Update order status and total cost
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

    // Activity log
    await logActivity({
      action: 'PO_CONFIRMED',
      pharmacyId,
      details: { id, totalCost: confirmedTotalCost.toFixed(2) },
    });

    return {
      success: true,
      message: 'Purchase order confirmed with supplier',
    };
  } catch (error) {
    console.error('Error confirming purchase order:', error);
    return { success: false, message: 'Failed to confirm purchase order' };
  }
};

// Update received quantities for order items (documentation only)
export const updateReceivedQuantities = async (
  orderId: number,
  pharmacyId: number,
  receivedItems: Record<number, number>,
) => {
  try {
    // Validate input with Zod
    const validatedData = updateReceivedQuantitiesSchema.parse({
      orderId,
      pharmacyId,
      receivedItems,
    });

    const orderExists = await db
      .select()
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.id, validatedData.orderId),
          eq(purchaseOrders.pharmacyId, validatedData.pharmacyId),
        ),
      );

    if (!orderExists.length) {
      return { success: false, message: 'Purchase order not found' };
    }

    // Update received quantities
    for (const [itemId, receivedQty] of Object.entries(
      validatedData.receivedItems,
    )) {
      if (receivedQty > 0) {
        await db
          .update(purchaseOrderItems)
          .set({ receivedQuantity: receivedQty })
          .where(eq(purchaseOrderItems.id, parseInt(itemId)));
      }
    }

    // Determine order status based on received quantities
    const allItems = await db
      .select({
        quantity: purchaseOrderItems.quantity,
        receivedQuantity: purchaseOrderItems.receivedQuantity,
      })
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.purchaseOrderId, validatedData.orderId));

    const allFullyReceived = allItems.every(
      (item) => item.receivedQuantity >= item.quantity,
    );
    const anyPartiallyReceived = allItems.some(
      (item) =>
        item.receivedQuantity > 0 && item.receivedQuantity < item.quantity,
    );

    const newStatus = allFullyReceived
      ? 'RECEIVED'
      : anyPartiallyReceived
      ? 'PARTIALLY_RECEIVED'
      : 'CONFIRMED';

    await db
      .update(purchaseOrders)
      .set({ status: newStatus })
      .where(
        and(
          eq(purchaseOrders.id, validatedData.orderId),
          eq(purchaseOrders.pharmacyId, validatedData.pharmacyId),
        ),
      );

    revalidatePath('/inventory/purchase-order');

    // Activity log
    await logActivity({
      action: 'PO_RECEIPT_UPDATED',
      pharmacyId: validatedData.pharmacyId,
      details: { id: validatedData.orderId, status: newStatus },
    });

    return {
      success: true,
      message: 'Received quantities updated',
    };
  } catch (error) {
    console.error('Error updating received quantities:', error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Failed to update received quantities',
    };
  }
};

// Mark all items as received - documentation only by default
export const receiveAllItems = async (
  orderId: number,
  pharmacyId: number,
  updateInventory: boolean = false,
) => {
  try {
    // Validate input with Zod
    const validatedData = receiveAllItemsSchema.parse({ orderId, pharmacyId });

    const orderItems = await db
      .select({
        id: purchaseOrderItems.id,
        productId: purchaseOrderItems.productId,
        quantity: purchaseOrderItems.quantity,
        receivedQuantity: purchaseOrderItems.receivedQuantity,
        unitCost: purchaseOrderItems.unitCost,
      })
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.purchaseOrderId, validatedData.orderId));

    if (!orderItems.length) {
      return { success: false, message: 'No items found for this order' };
    }

    await db.transaction(async (tx) => {
      // Mark all items as fully received
      for (const item of orderItems) {
        await tx
          .update(purchaseOrderItems)
          .set({ receivedQuantity: item.quantity })
          .where(eq(purchaseOrderItems.id, item.id));

        // Optional inventory update (disabled by default for manual control)
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
                  eq(products.pharmacyId, validatedData.pharmacyId),
                  sql`${products.deletedAt} IS NULL`,
                ),
              );
          }
        }
      }

      // Update order status
      await tx
        .update(purchaseOrders)
        .set({ status: 'RECEIVED' })
        .where(
          and(
            eq(purchaseOrders.id, validatedData.orderId),
            eq(purchaseOrders.pharmacyId, validatedData.pharmacyId),
          ),
        );
    });

    revalidatePath('/inventory/purchase-order');
    revalidatePath('/products');

    // Activity log
    await logActivity({
      action: 'PO_RECEIVED',
      pharmacyId: validatedData.pharmacyId,
      details: { id: validatedData.orderId },
    });

    return { success: true, message: 'All items marked as received' };
  } catch (error) {
    console.error('Error receiving all items:', error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Failed to mark items as received',
    };
  }
};

// Record partial item receipts - documentation only by default
export const partiallyReceiveItems = async (
  orderId: number,
  pharmacyId: number,
  receivedItems: Record<number, number>,
  updateInventory: boolean = false,
) => {
  try {
    // Validate input with Zod
    const validatedData = partiallyReceiveItemsSchema.parse({
      orderId,
      pharmacyId,
      receivedItems,
    });

    await db.transaction(async (tx) => {
      // Update received quantities for documentation
      for (const [itemId, receivedQty] of Object.entries(
        validatedData.receivedItems,
      )) {
        if (receivedQty > 0) {
          const itemIdNum = parseInt(itemId);

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

            // Optional inventory update (disabled by default for manual control)
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
                      eq(products.pharmacyId, validatedData.pharmacyId),
                      sql`${products.deletedAt} IS NULL`,
                    ),
                  );
              }
            }
          }
        }
      }

      // Determine order status based on received quantities
      const allItems = await tx
        .select({
          quantity: purchaseOrderItems.quantity,
          receivedQuantity: purchaseOrderItems.receivedQuantity,
        })
        .from(purchaseOrderItems)
        .where(eq(purchaseOrderItems.purchaseOrderId, validatedData.orderId));

      const allFullyReceived = allItems.every(
        (item) => item.receivedQuantity >= item.quantity,
      );
      const anyPartiallyReceived = allItems.some(
        (item) => item.receivedQuantity > 0,
      );

      const newStatus = allFullyReceived
        ? 'RECEIVED'
        : anyPartiallyReceived
        ? 'PARTIALLY_RECEIVED'
        : 'CONFIRMED';

      await tx
        .update(purchaseOrders)
        .set({ status: newStatus })
        .where(
          and(
            eq(purchaseOrders.id, validatedData.orderId),
            eq(purchaseOrders.pharmacyId, validatedData.pharmacyId),
          ),
        );
    });

    revalidatePath('/inventory/purchase-order');
    revalidatePath('/products');

    // Activity log
    await logActivity({
      action: 'PO_PARTIALLY_RECEIVED',
      pharmacyId: validatedData.pharmacyId,
      details: { id: validatedData.orderId },
    });

    return { success: true, message: 'Receipt quantities updated' };
  } catch (error) {
    console.error('Error updating received items:', error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Failed to update receipt quantities',
    };
  }
};
