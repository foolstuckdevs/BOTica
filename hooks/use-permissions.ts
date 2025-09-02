'use client';

import { useSession } from 'next-auth/react';

export type Role = 'Admin' | 'Pharmacist' | undefined;

// Simple client-side permissions derived from the NextAuth session.
// Note: Server remains the source of truth; this only gates UI affordances.
export function usePermissions() {
  const { data: session, status } = useSession();
  const role = (session?.user?.role as Role) ?? undefined;
  const isAdmin = role === 'Admin';
  const hasPharmacy = !!session?.user?.pharmacyId;

  return {
    role,
    isAdmin,
    hasPharmacy,
    canEditMasterData: isAdmin,
    loaded: status !== 'loading',
  } as const;
}

export default usePermissions;
