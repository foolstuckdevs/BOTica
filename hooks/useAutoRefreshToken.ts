'use client';
import { useCallback, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { needsRefresh } from '@/lib/auth/refresh-tokens';

// Lightweight polling + event-based trigger to refresh session when JWT near expiry.
export function useAutoRefreshToken(intervalMs = 60_000) {
  const { data: session, update } = useSession();
  const refreshingRef = useRef(false);

  const attemptRefresh = useCallback(async () => {
    if (refreshingRef.current) return;
    const rawExpires = (session as unknown as { expires?: string })?.expires;
    const exp = rawExpires
      ? Math.floor(new Date(rawExpires).getTime() / 1000)
      : undefined;
    if (!needsRefresh(exp)) return;
    try {
      refreshingRef.current = true;
      const res = await fetch('/api/auth/refresh', { method: 'POST' });
      if (res.status === 204) {
        // Force session update
        await update();
      } else if (res.status === 401) {
        // Will be handled by middleware / sign-in redirect on next nav
      }
    } catch {
      // silent
    } finally {
      refreshingRef.current = false;
    }
  }, [session, update]);

  useEffect(() => {
    const id = setInterval(attemptRefresh, intervalMs);
    // Also try once on mount
    attemptRefresh();
    return () => clearInterval(id);
  }, [attemptRefresh, intervalMs]);
}
