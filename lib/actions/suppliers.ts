'use server';

import { db } from '@/database/drizzle';
import { suppliers } from '@/database/schema';
import { SupplierParams } from '@/types';
import {
  getSuppliersSchema,
  createSupplierSchema,
  updateSupplierSchema,
  deleteSupplierSchema,
} from '@/lib/validations';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { canEditMasterData } from '@/lib/helpers/rbac';
import { logActivity } from '@/lib/actions/activity';

/**
 * Get suppliers for a specific pharmacy
 */
export const getSuppliers = async (pharmacyId: number) => {
  try {
    // Validate input with Zod
    const validatedData = getSuppliersSchema.parse({ pharmacyId });

    return await db
      .select()
      .from(suppliers)
      .orderBy(suppliers.name)
      .where(eq(suppliers.pharmacyId, validatedData.pharmacyId));
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof Error && 'issues' in error) {
      const zodError = error as { issues: Array<{ message: string }> };
      console.error(
        'Validation error in getSuppliers:',
        zodError.issues[0]?.message,
      );
      return [];
    }

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
    // RBAC: Admin-only for master data mutations (suppliers)
    if (!(await canEditMasterData())) {
      return { success: false, message: 'Unauthorized' };
    }
    // Validate input with Zod
    const validatedData = createSupplierSchema.parse(params);

    const existingSupplier = await db
      .select()
      .from(suppliers)
      .where(
        and(
          eq(suppliers.name, validatedData.name),
          eq(suppliers.pharmacyId, validatedData.pharmacyId),
        ),
      );

    if (existingSupplier.length > 0) {
      return { success: false, message: 'Supplier already exists' };
    }

    const newSupplier = await db
      .insert(suppliers)
      .values(validatedData)
      .returning();

    revalidatePath('/suppliers');

    await logActivity({
      action: 'SUPPLIER_CREATED',
      pharmacyId: validatedData.pharmacyId,
      details: { id: newSupplier[0]?.id, name: validatedData.name },
    });

    return {
      success: true,
      data: JSON.parse(JSON.stringify(newSupplier[0])),
    };
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof Error && 'issues' in error) {
      const zodError = error as { issues: Array<{ message: string }> };
      return {
        success: false,
        message: zodError.issues[0]?.message || 'Invalid input data',
      };
    }

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
    // RBAC: Admin-only for master data mutations (suppliers)
    if (!(await canEditMasterData())) {
      return { success: false, message: 'Unauthorized' };
    }
    // Validate input with Zod
    const validatedData = updateSupplierSchema.parse(data);

    const existingSupplier = await db
      .select()
      .from(suppliers)
      .where(
        and(
          eq(suppliers.id, validatedData.id),
          eq(suppliers.pharmacyId, validatedData.pharmacyId),
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
          eq(suppliers.name, validatedData.name),
          eq(suppliers.pharmacyId, validatedData.pharmacyId),
        ),
      );

    if (nameCheck.length > 0 && nameCheck[0].id !== validatedData.id) {
      return { success: false, message: 'Supplier name already exists' };
    }

    await db
      .update(suppliers)
      .set({
        name: validatedData.name,
        contactPerson: validatedData.contactPerson,
        phone: validatedData.phone,
        email: validatedData.email,
        address: validatedData.address,
      })
      .where(
        and(
          eq(suppliers.id, validatedData.id),
          eq(suppliers.pharmacyId, validatedData.pharmacyId),
        ),
      );

    revalidatePath('/suppliers');

    await logActivity({
      action: 'SUPPLIER_UPDATED',
      pharmacyId: validatedData.pharmacyId,
      details: { id: validatedData.id, name: validatedData.name },
    });

    return { success: true };
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof Error && 'issues' in error) {
      const zodError = error as { issues: Array<{ message: string }> };
      return {
        success: false,
        message: zodError.issues[0]?.message || 'Invalid input data',
      };
    }

    console.error('Error updating supplier:', error);
    return { success: false, message: 'Failed to update supplier' };
  }
};

/**
 * Delete a supplier by pharmacy
 */
export const deleteSupplier = async (id: number, pharmacyId: number) => {
  try {
    // RBAC: Admin-only for master data mutations (suppliers)
    if (!(await canEditMasterData())) {
      return { success: false, message: 'Unauthorized' };
    }
    // Validate input with Zod
    const validatedData = deleteSupplierSchema.parse({ id, pharmacyId });

    const existingSupplier = await db
      .select()
      .from(suppliers)
      .where(
        and(
          eq(suppliers.id, validatedData.id),
          eq(suppliers.pharmacyId, validatedData.pharmacyId),
        ),
      );

    if (existingSupplier.length === 0) {
      return { success: false, message: 'Supplier not found' };
    }

    await db
      .delete(suppliers)
      .where(
        and(
          eq(suppliers.id, validatedData.id),
          eq(suppliers.pharmacyId, validatedData.pharmacyId),
        ),
      );

    revalidatePath('/suppliers');

    await logActivity({
      action: 'SUPPLIER_DELETED',
      pharmacyId: validatedData.pharmacyId,
      details: {
        id: validatedData.id,
        name: (existingSupplier[0] as { name?: string })?.name,
      },
    });

    return { success: true, message: 'Supplier deleted successfully' };
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof Error && 'issues' in error) {
      const zodError = error as { issues: Array<{ message: string }> };
      return {
        success: false,
        message: zodError.issues[0]?.message || 'Invalid input data',
      };
    }

    console.error('Error deleting supplier:', error);
    return { success: false, message: 'Failed to delete supplier' };
  }
};
