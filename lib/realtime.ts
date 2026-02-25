/**
 * Supabase Broadcast Realtime Layer
 *
 * Uses Supabase's pure WebSocket Broadcast (no DB dependency) to push
 * realtime events between server actions and connected clients.
 *
 * Server-side: call broadcastEvent() after a Drizzle mutation.
 * Client-side: call useRealtimeEvent() in any component that should refresh.
 */

// ── Channel & event constants ───────────────────────────────────────────────

/** Single broadcast channel for all pharmacy POS events */
export const REALTIME_CHANNEL = 'pharmacy-pos';

/** Event names pushed from server actions */
export const REALTIME_EVENTS = {
  /** A sale was completed (POS checkout) */
  SALE_COMPLETED: 'sale-completed',
  /** A sale was voided (pharmacy error correction) */
  SALE_VOIDED: 'sale-voided',
  /** Stock quantity changed (stock-in, adjustment, sale) */
  STOCK_UPDATED: 'stock-updated',
  /** A product was created / updated / deleted / restored */
  PRODUCT_CHANGED: 'product-changed',
  /** A new notification was created (low-stock, out-of-stock, expiry) */
  NOTIFICATION_CREATED: 'notification-created',
} as const;

export type RealtimeEventName =
  (typeof REALTIME_EVENTS)[keyof typeof REALTIME_EVENTS];

// ── Server-side broadcast helper ────────────────────────────────────────────

/**
 * Fire-and-forget broadcast from a server action.
 * Uses the existing Supabase client (only for WebSocket, not DB).
 */
export async function broadcastEvent(
  event: RealtimeEventName,
  payload: Record<string, unknown> = {},
) {
  try {
    // Dynamic import so this module stays tree-shakeable on the client
    const { supabase } = await import('@/database/supabase');
    const channel = supabase.channel(REALTIME_CHANNEL);

    await channel.send({
      type: 'broadcast',
      event,
      payload: { ...payload, _ts: Date.now() },
    });

    // Clean up the channel after sending
    await supabase.removeChannel(channel);
  } catch (err) {
    // Non-fatal — realtime is best-effort; the write already succeeded
    console.error(`[realtime] broadcast "${event}" failed:`, err);
  }
}
