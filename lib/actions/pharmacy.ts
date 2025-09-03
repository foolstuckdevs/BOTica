'use server';

import { db } from '@/database/drizzle';
import { pharmacies } from '@/database/schema';
import { eq } from 'drizzle-orm';
import type { Pharmacy } from '@/types';

export async function getPharmacy(
  pharmacyId: number,
): Promise<Pharmacy | null> {
  try {
    const rows = await db
      .select({
        id: pharmacies.id,
        name: pharmacies.name,
        address: pharmacies.address,
        phone: pharmacies.phone,
        createdAt: pharmacies.createdAt,
      })
      .from(pharmacies)
      .where(eq(pharmacies.id, pharmacyId))
      .limit(1);

    if (!rows.length) return null;
    return rows[0] as Pharmacy;
  } catch (e) {
    console.error('Failed to get pharmacy', e);
    return null;
  }
}
