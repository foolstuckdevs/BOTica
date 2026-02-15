'use server';

import { db } from '@/database/drizzle';
import { eq, and, desc, sql, lt, notExists } from 'drizzle-orm';
import {
  notifications,
  notificationReads,
  notificationDismissals,
  products,
} from '@/database/schema';
import { NotificationParams } from '@/types';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';

const NOTIFICATIONS_PAGE_SIZE = 30;

/**
 * Build a per-user "not dismissed" subquery filter.
 * Only returns notifications that the current user has NOT dismissed.
 */
const notDismissedByUser = (userId: string) =>
  notExists(
    db
      .select({ one: sql`1` })
      .from(notificationDismissals)
      .where(
        and(
          eq(notificationDismissals.notificationId, notifications.id),
          eq(notificationDismissals.userId, userId),
        ),
      ),
  );

export const getNotifications = async (
  pharmacyId: number,
  options?: { cursor?: number; limit?: number },
) => {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.pharmacyId) {
      throw new Error('Unauthorized');
    }

    // Ensure user can only access their pharmacy's notifications
    if (session.user.pharmacyId !== pharmacyId) {
      throw new Error('Unauthorized access to pharmacy data');
    }

    const userId = session.user.id as string;
    const limit = options?.limit ?? NOTIFICATIONS_PAGE_SIZE;
    const cursor = options?.cursor;

    // Build where conditions — exclude dismissed notifications for this user
    const whereConditions = [
      eq(notifications.pharmacyId, pharmacyId),
      notDismissedByUser(userId),
    ];
    if (cursor) {
      // Cursor-based pagination: get notifications older than the cursor ID
      whereConditions.push(lt(notifications.id, cursor));
    }

    const result = await db
      .select({
        id: notifications.id,
        type: notifications.type,
        productId: notifications.productId,
        message: notifications.message,
        pharmacyId: notifications.pharmacyId,
        createdAt: notifications.createdAt,
        // Per-user read status via subquery
        isRead: sql<boolean>`EXISTS (
          SELECT 1 FROM notification_reads nr
          WHERE nr.notification_id = ${notifications.id}
            AND nr.user_id = ${userId}
        )`.as('is_read'),
        product: {
          id: products.id,
          name: products.name,
          brandName: products.brandName,
        },
      })
      .from(notifications)
      .leftJoin(products, eq(notifications.productId, products.id))
      .where(and(...whereConditions))
      .orderBy(desc(notifications.createdAt))
      .limit(limit + 1); // Fetch one extra to check if there are more

    const hasMore = result.length > limit;
    const items = hasMore ? result.slice(0, limit) : result;
    const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

    return {
      items,
      hasMore,
      nextCursor,
    };
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw new Error('Failed to fetch notifications');
  }
};

// Get total notification count for display purposes (per-user, excluding dismissed)
export const getTotalNotificationCount = async (pharmacyId: number) => {
  try {
    const session = await auth();
    if (
      !session?.user?.id ||
      !session?.user?.pharmacyId ||
      session.user.pharmacyId !== pharmacyId
    ) {
      throw new Error('Unauthorized');
    }

    const userId = session.user.id as string;

    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        and(
          eq(notifications.pharmacyId, pharmacyId),
          notDismissedByUser(userId),
        ),
      );

    return result?.count ?? 0;
  } catch (error) {
    console.error('Error fetching total notification count:', error);
    return 0;
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

    // Collect all existing notifications for this pharmacy in one query
    // so we can check membership in-memory instead of N queries.
    const existingNotifs = await db
      .select({
        productId: notifications.productId,
        type: notifications.type,
      })
      .from(notifications)
      .where(eq(notifications.pharmacyId, pharmacyId));

    const existingSet = new Set(
      existingNotifs.map((n) => `${n.productId}::${n.type}`),
    );

    /**
     * Only create a notification if one has NEVER existed for this
     * product + type combination.  This ensures:
     *  - Read notifications are not duplicated.
     *  - Dismissed notifications stay dismissed (per-user).
     *  - A new notification is only created when a condition is detected
     *    for the very first time (or after stock recovers and drops again,
     *    which is handled by the transition-based logic in sales/adjustments).
     */

    // Collect all new notifications, then batch-insert
    const pendingInserts: Array<{
      pharmacyId: number;
      productId: number;
      type: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'EXPIRING' | 'EXPIRED';
      message: string;
    }> = [];

    const enqueue = (
      type: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'EXPIRING' | 'EXPIRED',
      productId: number,
      message: string,
    ) => {
      const key = `${productId}::${type}`;
      if (existingSet.has(key)) return; // already notified — skip
      existingSet.add(key); // prevent duplicate within this run
      pendingInserts.push({ pharmacyId, productId, type, message });
    };

    // Process products
    for (const p of prodRows) {
      const productLabel = `${p.name}${p.brandName ? ` (${p.brandName})` : ''}`;

      if (p.quantity <= 0) {
        enqueue('OUT_OF_STOCK', p.id, `${productLabel} is out of stock.`);
        continue; // out-of-stock supersedes low stock
      }

      const minLevel = (p.minStockLevel as number) ?? 10;
      if (p.quantity <= minLevel) {
        enqueue('LOW_STOCK', p.id, `${productLabel} is low on stock.`);
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
          enqueue('EXPIRED', p.id, `${productLabel} has expired.`);
        } else if (exp <= in30Days) {
          enqueue('EXPIRING', p.id, `${productLabel} is expiring soon.`);
        }
      }
    }

    // Batch-insert all new notifications in a single query
    if (pendingInserts.length > 0) {
      await db.insert(notifications).values(pendingInserts);
    }
  } catch (error) {
    console.error('Error syncing inventory notifications:', error);
  }
};

/**
 * Get the count of unread notifications for the current user.
 * A notification is "unread" if:
 *   1. It has NOT been dismissed by this user, AND
 *   2. It has NOT been read by this user.
 */
export const getUnreadNotificationCount = async (pharmacyId: number) => {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.pharmacyId) {
      throw new Error('Unauthorized');
    }

    // Ensure user can only access their pharmacy's notifications
    if (session.user.pharmacyId !== pharmacyId) {
      throw new Error('Unauthorized access to pharmacy data');
    }

    const userId = session.user.id as string;

    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(
        and(
          eq(notifications.pharmacyId, pharmacyId),
          notDismissedByUser(userId),
          // Not read by this user
          notExists(
            db
              .select({ one: sql`1` })
              .from(notificationReads)
              .where(
                and(
                  eq(notificationReads.notificationId, notifications.id),
                  eq(notificationReads.userId, userId),
                ),
              ),
          ),
        ),
      );

    return result[0]?.count || 0;
  } catch (error) {
    console.error('Error fetching unread notification count:', error);
    return 0;
  }
};

/**
 * Mark a single notification as read FOR THE CURRENT USER.
 * Inserts a row into notification_reads (idempotent via ON CONFLICT DO NOTHING).
 */
export const markNotificationAsRead = async (notificationId: number) => {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.pharmacyId) {
      throw new Error('Unauthorized');
    }

    const userId = session.user.id as string;

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

    // Insert per-user read record
    await db
      .insert(notificationReads)
      .values({ notificationId, userId })
      .onConflictDoNothing();

    revalidatePath('/dashboard');
    revalidatePath('/notifications');

    return { success: true };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw new Error('Failed to mark notification as read');
  }
};

/**
 * Mark ALL non-dismissed, unread notifications as read for the current user.
 */
export const markAllNotificationsAsRead = async (pharmacyId: number) => {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.pharmacyId) {
      throw new Error('Unauthorized');
    }

    // Ensure user can only access their pharmacy's notifications
    if (session.user.pharmacyId !== pharmacyId) {
      throw new Error('Unauthorized access to pharmacy data');
    }

    const userId = session.user.id as string;

    // Get all unread, non-dismissed notification IDs for this user
    const unreadNotifs = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.pharmacyId, pharmacyId),
          notDismissedByUser(userId),
          notExists(
            db
              .select({ one: sql`1` })
              .from(notificationReads)
              .where(
                and(
                  eq(notificationReads.notificationId, notifications.id),
                  eq(notificationReads.userId, userId),
                ),
              ),
          ),
        ),
      );

    if (unreadNotifs.length > 0) {
      await db.insert(notificationReads).values(
        unreadNotifs.map((n) => ({
          notificationId: n.id,
          userId,
        })),
      ).onConflictDoNothing();
    }

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

/**
 * Dismiss a notification FOR THE CURRENT USER only.
 * The notification row remains in the DB so other users can still see it.
 * Inserts a row into notification_dismissals (idempotent).
 */
export const deleteNotification = async (notificationId: number) => {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.pharmacyId) {
      throw new Error('Unauthorized');
    }

    const userId = session.user.id as string;

    // Verify the notification belongs to the user's pharmacy
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

    // Insert dismissal record instead of deleting the row
    await db
      .insert(notificationDismissals)
      .values({ notificationId, userId })
      .onConflictDoNothing();

    revalidatePath('/dashboard');
    revalidatePath('/notifications');

    return { success: true };
  } catch (error) {
    console.error('Error dismissing notification:', error);
    throw new Error('Failed to dismiss notification');
  }
};
