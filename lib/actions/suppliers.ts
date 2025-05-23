'use server';

import { db } from '@/database/drizzle';
import { suppliers } from '@/database/schema';
import { SupplierParams } from '@/types';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export const getSuppliers = async () => {
  try {
    return await db.select().from(suppliers);
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return [];
  }
};

export const createSupplier = async (params: SupplierParams) => {
  try {
    const existingSupplier = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.name, params.name));

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

export const updateSupplier = async (data: { id: number } & SupplierParams) => {
  try {
    const existingSupplier = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.id, data.id));

    if (existingSupplier.length === 0) {
      return { success: false, message: 'Supplier not found' };
    }

    // Check if new name already exists (excluding current supplier)
    const nameCheck = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.name, data.name));

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
      .where(eq(suppliers.id, data.id));

    revalidatePath('/suppliers');

    return { success: true };
  } catch (error) {
    console.error('Error updating supplier:', error);
    return { success: false, message: 'Failed to update supplier' };
  }
};

export const deleteSupplier = async (id: number) => {
  try {
    // Check if supplier exists
    const existingSupplier = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.id, id));

    if (existingSupplier.length === 0) {
      return { success: false, message: 'Supplier not found' };
    }

    await db.delete(suppliers).where(eq(suppliers.id, id));

    revalidatePath('/suppliers');

    return { success: true, message: 'Supplier deleted successfully' };
  } catch (error) {
    console.error('Error deleting supplier:', error);
    return { success: false, message: 'Failed to delete supplier' };
  }
};
