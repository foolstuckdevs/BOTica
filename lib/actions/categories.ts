'use server'; //for the server actions to be executed on the server

import { db } from '@/database/drizzle';
import { categories } from '@/database/schema';
import { Categories } from '@/types';

export async function getCategories(): Promise<Categories[]> {
  try {
    const result = await db.select().from(categories);
    return result.map((c) => ({
      ...c,
      id: c.id.toString(),
    }));
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    return [];
  }
}
