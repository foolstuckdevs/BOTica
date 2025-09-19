'use client';
import { useCallback } from 'react';
import { useInactivityLogout } from '@/hooks/useInactivityLogout';
import { toast } from 'sonner';

interface Props {
  role?: string;
}

export default function InactivityWatcher({ role }: Props) {
  const handleWarn = useCallback(() => {
    toast.message('Session will expire soon due to inactivity', {
      description: 'Move your mouse or press a key to stay signed in.',
    });
  }, []);

  const handleTimeout = useCallback(() => {
    toast.error('You have been logged out due to inactivity');
  }, []);

  useInactivityLogout({
    role,
    pharmacistTimeoutMs: 60 * 60 * 1000, // 60 minutes
    adminTimeoutMs: 60 * 60 * 1000, // 60 minutes
    warningMs: 60 * 1000, // warn 1 minute before
    onWarn: handleWarn,
    onTimeout: handleTimeout,
  });

  return null;
}
