'use client';
import { useEffect } from 'react';
import { useAutoRefreshToken } from '@/hooks/useAutoRefreshToken';

export default function SessionLifecycle() {
  // Refresh every minute if within threshold
  useAutoRefreshToken(60_000);
  // Could add more lifecycle behaviors here later
  useEffect(() => {}, []);
  return null;
}
