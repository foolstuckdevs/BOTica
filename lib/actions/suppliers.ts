'use server';

import { db } from '@/database/drizzle';
import { suppliers } from '@/database/schema';
import { SupplierParams } from '@/types';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

/**
 * Get suppliers for a specific pharmacy
 */
export const getSuppliers = async (pharmacyId: number) => {
  try {
    return await db
      .select()
      .from(suppliers)
      .orderBy(suppliers.name)
      .where(eq(suppliers.pharmacyId, pharmacyId));
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return [];
  }
};

/**
 * Create a new supplier for a pharmacy
 */
export const createSupplier = async (
  params: SupplierParams & { pharmacyId: number },
) => {
  try {
    const existingSupplier = await db
      .select()
      .from(suppliers)
      .where(
        and(
          eq(suppliers.name, params.name),
          eq(suppliers.pharmacyId, params.pharmacyId),
        ),
      );

    if (existingSupplier.length > 0) {
      return { success: false, message: 'Supplier already exists' };
    }

    const newSupplier = await db.insert(suppliers).values(params).returning();

    revalidatePath('/suppliers');

    return {
      success: true,
      data: JSON.parse(JSON.stringify(newSupplier[0])),
    };
  } catch (error) {
    console.error('Error creating supplier:', error);
    return { success: false, message: 'Failed to create supplier' };
  }
};

/**
 * Update a supplier by pharmacy
 */
export const updateSupplier = async (
  data: { id: number; pharmacyId: number } & SupplierParams,
) => {
  try {
    const existingSupplier = await db
      .select()
      .from(suppliers)
      .where(
        and(
          eq(suppliers.id, data.id),
          eq(suppliers.pharmacyId, data.pharmacyId),
        ),
      );

    if (existingSupplier.length === 0) {
      return { success: false, message: 'Supplier not found' };
    }

    // Check for name conflict in same pharmacy
    const nameCheck = await db
      .select()
      .from(suppliers)
      .where(
        and(
          eq(suppliers.name, data.name),
          eq(suppliers.pharmacyId, data.pharmacyId),
        ),
      );

    if (nameCheck.length > 0 && nameCheck[0].id !== data.id) {
      return { success: false, message: 'Supplier name already exists' };
    }

    await db
      .update(suppliers)
      .set({
        name: data.name,
        contactPerson: data.contactPerson,
        phone: data.phone,
        email: data.email,
        address: data.address,
      })
      .where(
        and(
          eq(suppliers.id, data.id),
          eq(suppliers.pharmacyId, data.pharmacyId),
        ),
      );

    revalidatePath('/suppliers');

    return { success: true };
  } catch (error) {
    console.error('Error updating supplier:', error);
    return { success: false, message: 'Failed to update supplier' };
  }
};

/**
 * Delete a supplier by pharmacy
 */
export const deleteSupplier = async (id: number, pharmacyId: number) => {
  try {
    const existingSupplier = await db
      .select()
      .from(suppliers)
      .where(and(eq(suppliers.id, id), eq(suppliers.pharmacyId, pharmacyId)));

    if (existingSupplier.length === 0) {
      return { success: false, message: 'Supplier not found' };
    }

    await db
      .delete(suppliers)
      .where(and(eq(suppliers.id, id), eq(suppliers.pharmacyId, pharmacyId)));

    revalidatePath('/suppliers');

    return { success: true, message: 'Supplier deleted successfully' };
  } catch (error) {
    console.error('Error deleting supplier:', error);
    return { success: false, message: 'Failed to delete supplier' };
  }
};
