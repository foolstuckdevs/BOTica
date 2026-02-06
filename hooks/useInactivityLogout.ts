'use client';
import { useEffect, useRef } from 'react';
import { signOut } from 'next-auth/react';
import { logAutoLogout } from '@/lib/actions/auto-logout';

interface Options {
  assistantTimeoutMs?: number; // default 15 min
  adminTimeoutMs?: number; // default 60 min
  warningMs?: number; // warn 60s before
  role?: string;
  onWarn?: () => void;
  onTimeout?: () => void;
}

// Tracks user activity (mousemove, keydown, click, scroll, touch) and logs out after inactivity.
export function useInactivityLogout({
  assistantTimeoutMs = 15 * 60 * 1000,
  adminTimeoutMs = 60 * 60 * 1000,
  warningMs = 60 * 1000,
  role,
  onWarn,
  onTimeout,
}: Options) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef = useRef<NodeJS.Timeout | null>(null);
  const warnedRef = useRef(false);

  useEffect(() => {
    const timeoutMs = role === 'Admin' ? adminTimeoutMs : assistantTimeoutMs;
    if (!timeoutMs) return;

    function clearTimers() {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
    }

    function schedule() {
      clearTimers();
      warnedRef.current = false;
      if (timeoutMs > warningMs) {
        warningRef.current = setTimeout(() => {
          warnedRef.current = true;
          onWarn?.();
        }, timeoutMs - warningMs);
      }
      timerRef.current = setTimeout(async () => {
        onTimeout?.();
        // Log the auto-logout activity before signing out
        await logAutoLogout();
        await signOut({ callbackUrl: '/sign-in?reason=idle' });
      }, timeoutMs);
    }

    function activityHandler() {
      // Only reset if we've not already timed out
      schedule();
    }

    schedule();
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((ev) =>
      window.addEventListener(ev, activityHandler, { passive: true }),
    );
    return () => {
      clearTimers();
      events.forEach((ev) => window.removeEventListener(ev, activityHandler));
    };
  }, [role, assistantTimeoutMs, adminTimeoutMs, warningMs, onWarn, onTimeout]);
}
