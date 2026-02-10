'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/database/supabase';
import {
  REALTIME_CHANNEL,
  REALTIME_EVENTS,
  type RealtimeEventName,
} from '@/lib/realtime';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Subscribe to one or more Supabase Broadcast events and call a handler.
 *
 * @param events  - Events to listen for (e.g. ['sale-completed', 'stock-updated'])
 * @param handler - Called with the event name and payload
 */
export function useRealtimeEvent(
  events: RealtimeEventName[],
  handler: (event: RealtimeEventName, payload: Record<string, unknown>) => void,
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    let channel: RealtimeChannel | null = null;

    // Use a stable channel name per component instance
    const channelName = `${REALTIME_CHANNEL}-${Math.random().toString(36).slice(2, 8)}`;
    channel = supabase.channel(channelName);

    for (const event of events) {
      channel = channel.on('broadcast', { event }, (msg) => {
        handlerRef.current(event as RealtimeEventName, msg.payload as Record<string, unknown>);
      });
    }

    channel.subscribe();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
    // Re-subscribe only when the event list changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(events)]);
}

/**
 * Convenience hook: auto-refresh the current route (via router.refresh())
 * whenever any of the given realtime events fire.
 *
 * Uses a short debounce to avoid hammering the server when events arrive
 * in quick succession (e.g. bulk stock-in).
 */
export function useRealtimeRefresh(
  events: RealtimeEventName[],
  {
    debounceMs = 500,
    onEvent,
  }: {
    debounceMs?: number;
    onEvent?: (event: RealtimeEventName, payload: Record<string, unknown>) => void;
  } = {},
) {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedRefresh = useCallback(
    (event: RealtimeEventName, payload: Record<string, unknown>) => {
      onEvent?.(event, payload);

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        router.refresh();
      }, debounceMs);
    },
    [router, debounceMs, onEvent],
  );

  useRealtimeEvent(events, debouncedRefresh);
}

export { REALTIME_EVENTS };
