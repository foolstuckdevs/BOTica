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
  // Purchase order feature removed; no server actions remain.
  export {};
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
