'use server';

import { auth } from '@/auth';

export type Role = 'Admin' | 'Pharmacist';

// Returns the user's role from the server session
export const getUserRole = async (): Promise<Role | undefined> => {
  const session = await auth();
  return (session?.user?.role as Role | undefined) ?? undefined;
};

// Capability: Admin-only for master data (products, categories, suppliers)
export const canEditMasterData = async () => {
  const role = await getUserRole();
  return role === 'Admin';
};
