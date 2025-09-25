'use client';
import { useCallback, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { needsRefresh } from '@/lib/auth/refresh-tokens';

// Enhanced: visibility-aware + exponential backoff
export function useAutoRefreshToken(intervalMs = 60_000) {
  const { data: session, update } = useSession();
  const refreshingRef = useRef(false);
  const failureCountRef = useRef(0);
  const lastAttemptRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const schedule = useCallback((fn: () => void, delay: number) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(fn, delay);
  }, []);

  const attemptRefresh = useCallback(async () => {
    const now = Date.now();
    lastAttemptRef.current = now;
    if (refreshingRef.current) return;

    const rawExpires = (session as unknown as { expires?: string })?.expires;
    const exp = rawExpires
      ? Math.floor(new Date(rawExpires).getTime() / 1000)
      : undefined;

    if (!needsRefresh(exp)) return; // Not close to expiry
    try {
      refreshingRef.current = true;
      const res = await fetch('/api/auth/refresh', { method: 'POST' });
      if (res.status === 204) {
        failureCountRef.current = 0; // reset backoff
        await update();
      } else if (res.status === 401) {
        // Unauthorized; let middleware handle redirect later. Increase backoff.
        failureCountRef.current += 1;
      } else {
        failureCountRef.current += 1;
      }
    } catch {
      failureCountRef.current += 1;
    } finally {
      refreshingRef.current = false;
    }
  }, [session, update]);

  // Main loop: uses dynamic interval (backoff) + visibility gating
  useEffect(() => {
    let stopped = false;

    const loop = async () => {
      if (stopped) return;
      // Skip while tab hidden to save resources
      if (!document.hidden) {
        await attemptRefresh();
      }
      const backoff = failureCountRef.current
        ? Math.min(5 * 60_000, 30_000 * 2 ** (failureCountRef.current - 1)) // 30s, 60s, 120s, capped 5m
        : intervalMs;
      schedule(loop, backoff);
    };

    // Kick off initial attempt soon (not blocking paint)
    schedule(loop, 2_000);

    const onVisibility = () => {
      if (!document.hidden) {
        // On becoming visible, try soon (slight debounce)
        schedule(loop, 500);
      }
    };
    const onFocus = () => {
      // On window focus, try immediately (independent quick attempt)
      attemptRefresh();
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);

    return () => {
      stopped = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
    };
  }, [attemptRefresh, intervalMs, schedule]);
}
