'use server';

import { auth } from '@/auth';

export type Role = 'Admin' | 'Pharmacist';

// Returns the user's role from the server session
export const getUserRole = async (): Promise<Role | undefined> => {
  const session = await auth();
  return (session?.user?.role as Role | undefined) ?? undefined;
};

// Generic role checker
export const requireRole = async (allowed: Role[]) => {
  const role = await getUserRole();
  return !!role && allowed.includes(role);
};

// Capability: Admin-only for master data (products, categories, suppliers)
export const canEditMasterData = async () => {
  const role = await getUserRole();
  return role === 'Admin';
};

// Optional assert variant if you want to throw instead of returning booleans
export const assertCanEditMasterData = async () => {
  if (!(await canEditMasterData())) {
    throw new Error('Unauthorized');
  }
};
