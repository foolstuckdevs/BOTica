'use server';

import { db } from '@/database/drizzle';
import { eq, and, desc, sql, gt } from 'drizzle-orm';
import { notifications, products } from '@/database/schema';
import { NotificationParams } from '@/types';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';

export const getNotifications = async (pharmacyId: number) => {
  try {
    const session = await auth();
    if (!session?.user?.pharmacyId) {
      throw new Error('Unauthorized');
    }

    // Ensure user can only access their pharmacy's notifications
    if (session.user.pharmacyId !== pharmacyId) {
      throw new Error('Unauthorized access to pharmacy data');
    }

    // Decoupled: do not sync during read to avoid re-creating notifications on open

    const result = await db
      .select({
        id: notifications.id,
        type: notifications.type,
        productId: notifications.productId,
        message: notifications.message,
        isRead: notifications.isRead,
        pharmacyId: notifications.pharmacyId,
        createdAt: notifications.createdAt,
        product: {
          id: products.id,
          name: products.name,
          brandName: products.brandName,
        },
      })
      .from(notifications)
      .leftJoin(products, eq(notifications.productId, products.id))
      .where(eq(notifications.pharmacyId, pharmacyId))
      .orderBy(desc(notifications.createdAt))
      .limit(50); // Limit to last 50 notifications

    return result;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw new Error('Failed to fetch notifications');
  }
};

/**
 * Synchronize notifications with current inventory conditions for a pharmacy.
 * - OUT_OF_STOCK: quantity <= 0
 * - LOW_STOCK: 0 < quantity <= minStockLevel
 * - EXPIRED: expiryDate < today
 * - EXPIRING: 0 <= daysUntilExpiry <= 30
 */
export const syncInventoryNotifications = async (pharmacyId: number) => {
  try {
    const today = new Date();
    const in30Days = new Date();
    in30Days.setDate(today.getDate() + 30);
    const recentCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24h throttle

    // Fetch all active products for this pharmacy
    const prodRows = await db
      .select({
        id: products.id,
        name: products.name,
        brandName: products.brandName,
        quantity: products.quantity,
        minStockLevel: products.minStockLevel,
        expiryDate: products.expiryDate,
      })
      .from(products)
      .where(
        and(
          eq(products.pharmacyId, pharmacyId),
          sql`${products.deletedAt} IS NULL`,
        ),
      );

    // Utility to upsert a notification if not already present unread for same product/type
    const ensureNotification = async (
      type: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'EXPIRING' | 'EXPIRED',
      productId: number,
      message: string,
    ) => {
      // Throttle: don't create if an entry exists in the last 24h for same product/type
      const recent = await db
        .select({ id: notifications.id })
        .from(notifications)
        .where(
          and(
            eq(notifications.pharmacyId, pharmacyId),
            eq(notifications.productId, productId),
            eq(notifications.type, type),
            gt(notifications.createdAt, recentCutoff),
          ),
        )
        .limit(1);

      if (recent.length === 0) {
        await db.insert(notifications).values({
          pharmacyId,
          productId,
          type,
          message,
          isRead: false,
        });
      }
    };

    // Process products
    for (const p of prodRows) {
      const productLabel = `${p.name}${p.brandName ? ` (${p.brandName})` : ''}`;

      if (p.quantity <= 0) {
        await ensureNotification(
          'OUT_OF_STOCK',
          p.id,
          `${productLabel} is out of stock.`,
        );
        continue; // out-of-stock supersedes low stock
      }

      const minLevel = (p.minStockLevel as number) ?? 10;
      if (p.quantity <= minLevel) {
        await ensureNotification(
          'LOW_STOCK',
          p.id,
          `${productLabel} is low on stock.`,
        );
      }

      const expDate = p.expiryDate
        ? new Date(p.expiryDate as unknown as string)
        : null;
      if (expDate) {
        // Normalize to midnight for date-only comparison
        const exp = new Date(
          expDate.getFullYear(),
          expDate.getMonth(),
          expDate.getDate(),
        );
        const todayMid = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate(),
        );

        if (exp < todayMid) {
          await ensureNotification(
            'EXPIRED',
            p.id,
            `${productLabel} has expired.`,
          );
        } else if (exp <= in30Days) {
          await ensureNotification(
            'EXPIRING',
            p.id,
            `${productLabel} is expiring soon.`,
          );
        }
      }
    }
  } catch (error) {
    console.error('Error syncing inventory notifications:', error);
  }
};

export const getUnreadNotificationCount = async (pharmacyId: number) => {
  try {
    const session = await auth();
    if (!session?.user?.pharmacyId) {
      throw new Error('Unauthorized');
    }

    // Ensure user can only access their pharmacy's notifications
    if (session.user.pharmacyId !== pharmacyId) {
      throw new Error('Unauthorized access to pharmacy data');
    }

    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(
        and(
          eq(notifications.pharmacyId, pharmacyId),
          eq(notifications.isRead, false),
        ),
      );

    return result[0]?.count || 0;
  } catch (error) {
    console.error('Error fetching unread notification count:', error);
    return 0;
  }
};

export const markNotificationAsRead = async (notificationId: number) => {
  try {
    const session = await auth();
    if (!session?.user?.pharmacyId) {
      throw new Error('Unauthorized');
    }

    // First, verify the notification belongs to the user's pharmacy
    const notification = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, notificationId))
      .limit(1);

    if (
      !notification.length ||
      notification[0].pharmacyId !== session.user.pharmacyId
    ) {
      throw new Error('Notification not found or unauthorized');
    }

    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, notificationId));

    revalidatePath('/dashboard');
    revalidatePath('/notifications');

    return { success: true };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw new Error('Failed to mark notification as read');
  }
};

export const markAllNotificationsAsRead = async (pharmacyId: number) => {
  try {
    const session = await auth();
    if (!session?.user?.pharmacyId) {
      throw new Error('Unauthorized');
    }

    // Ensure user can only access their pharmacy's notifications
    if (session.user.pharmacyId !== pharmacyId) {
      throw new Error('Unauthorized access to pharmacy data');
    }

    await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.pharmacyId, pharmacyId),
          eq(notifications.isRead, false),
        ),
      );

    revalidatePath('/dashboard');
    revalidatePath('/notifications');

    return { success: true };
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw new Error('Failed to mark all notifications as read');
  }
};

export const createNotification = async (
  notificationData: NotificationParams,
) => {
  try {
    const session = await auth();
    if (!session?.user?.pharmacyId) {
      throw new Error('Unauthorized');
    }

    // Ensure user can only create notifications for their pharmacy
    if (session.user.pharmacyId !== notificationData.pharmacyId) {
      throw new Error('Unauthorized access to pharmacy data');
    }

    const result = await db
      .insert(notifications)
      .values({
        type: notificationData.type,
        productId: notificationData.productId,
        message: notificationData.message,
        pharmacyId: notificationData.pharmacyId,
        isRead: false,
      })
      .returning();

    revalidatePath('/dashboard');
    revalidatePath('/notifications');

    return result[0];
  } catch (error) {
    console.error('Error creating notification:', error);
    throw new Error('Failed to create notification');
  }
};

export const deleteNotification = async (notificationId: number) => {
  try {
    const session = await auth();
    if (!session?.user?.pharmacyId) {
      throw new Error('Unauthorized');
    }

    // First, verify the notification belongs to the user's pharmacy
    const notification = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, notificationId))
      .limit(1);

    if (
      !notification.length ||
      notification[0].pharmacyId !== session.user.pharmacyId
    ) {
      throw new Error('Notification not found or unauthorized');
    }

    await db.delete(notifications).where(eq(notifications.id, notificationId));

    revalidatePath('/dashboard');
    revalidatePath('/notifications');

    return { success: true };
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw new Error('Failed to delete notification');
  }
};
