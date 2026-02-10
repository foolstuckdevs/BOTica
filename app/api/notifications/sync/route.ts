import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { syncInventoryNotifications } from '@/lib/actions/notifications';
import { broadcastEvent, REALTIME_EVENTS } from '@/lib/realtime';

/**
 * POST /api/notifications/sync
 *
 * Triggers a one-time inventory notification sync for the authenticated
 * user's pharmacy. Creates EXPIRING, EXPIRED, LOW_STOCK, and OUT_OF_STOCK
 * notifications for products that match those conditions (with 24h dedup).
 *
 * Called by the client on mount and periodically (every 30 min) so that
 * products gradually approaching expiry are caught in a timely manner.
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.pharmacyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await syncInventoryNotifications(session.user.pharmacyId);

    // Let connected clients know new notifications may exist
    broadcastEvent(REALTIME_EVENTS.NOTIFICATION_CREATED, {
      pharmacyId: session.user.pharmacyId,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Notification sync error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
