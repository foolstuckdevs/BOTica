'use server';

import { z } from 'zod';
import { db } from '@/database/drizzle';
import { categories } from '@/database/schema';
import { CategoryParams } from '@/types';
import {
  getCategoriesSchema,
  createCategorySchema,
  updateCategorySchema,
  deleteCategorySchema,
} from '@/lib/validations';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { canEditMasterData } from '@/lib/helpers/rbac';
import { logActivity } from '@/lib/actions/activity';

/**
 * Get categories by pharmacy
 */
export async function getCategories(pharmacyId: number) {
  try {
    // Validate input with Zod
    const validatedData = getCategoriesSchema.parse({ pharmacyId });

    const result = await db
      .select()
      .from(categories)
      .orderBy(categories.name)
      .where(eq(categories.pharmacyId, validatedData.pharmacyId));

    return result;
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof Error && 'issues' in error) {
      const zodError = error as { issues: Array<{ message: string }> };
      console.error(
        'Validation error in getCategories:',
        zodError.issues[0]?.message,
      );
      return [];
    }

    console.error('Error fetching categories:', error);
    return [];
  }
}

/**
 * Create new category (with pharmacy scope)
 */
export async function createCategory(
  params: CategoryParams & { pharmacyId: number },
) {
  try {
    // RBAC: Admin-only for master data mutations (categories)
    if (!(await canEditMasterData())) {
      return { success: false, message: 'Unauthorized' } as const;
    }
    // Validate input with Zod
    const validatedData = createCategorySchema.parse(params);

    const existingCategory = await db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.name, validatedData.name),
          eq(categories.pharmacyId, validatedData.pharmacyId),
        ),
      );

    if (existingCategory.length > 0) {
      return {
        success: false,
        message: 'Category with this name already exists',
      };
    }

    const newCategory = await db
      .insert(categories)
      .values({
        ...validatedData,
        description: validatedData.description ?? null,
      })
      .returning();

    revalidatePath('/categories');

    await logActivity({
      action: 'CATEGORY_CREATED',
      pharmacyId: validatedData.pharmacyId,
      details: { id: newCategory[0]?.id, name: validatedData.name },
    });

    return {
      success: true,
      data: JSON.parse(JSON.stringify(newCategory[0])),
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

    console.error('Error creating category:', error);
    return {
      success: false,
      message: 'An error occurred while creating new category',
    };
  }
}

/**
 * Update category (with pharmacy check)
 */
export const updateCategory = async (
  data: z.infer<typeof updateCategorySchema>,
) => {
  try {
    // RBAC: Admin-only for master data mutations (categories)
    if (!(await canEditMasterData())) {
      return { success: false, message: 'Unauthorized' } as const;
    }
    // Validate input with Zod
    const validatedData = updateCategorySchema.parse(data);

    const existingCategory = await db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.id, validatedData.id),
          eq(categories.pharmacyId, validatedData.pharmacyId),
        ),
      );

    if (existingCategory.length === 0) {
      return { success: false, message: 'Category not found' };
    }

    // Check if new name exists in the same pharmacy, excluding this category
    const nameCheck = await db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.name, validatedData.name),
          eq(categories.pharmacyId, validatedData.pharmacyId),
        ),
      );

    if (nameCheck.length > 0 && nameCheck[0].id !== validatedData.id) {
      return { success: false, message: 'Category name already exists' };
    }

    await db
      .update(categories)
      .set({
        name: validatedData.name,
        description: validatedData.description ?? null,
      })
      .where(
        and(
          eq(categories.id, validatedData.id),
          eq(categories.pharmacyId, validatedData.pharmacyId),
        ),
      );

    revalidatePath('/categories');

    await logActivity({
      action: 'CATEGORY_UPDATED',
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

    console.error('Error updating category:', error);
    return {
      success: false,
      message: 'Failed to update category',
    };
  }
};

/**
 * Delete category (with pharmacy check)
 */
export const deleteCategory = async (
  categoryId: number,
  pharmacyId: number,
) => {
  try {
    // RBAC: Admin-only for master data mutations (categories)
    if (!(await canEditMasterData())) {
      return { success: false, message: 'Unauthorized' } as const;
    }
    // Validate input with Zod
    const validatedData = deleteCategorySchema.parse({
      id: categoryId,
      pharmacyId,
    });

    const existingCategory = await db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.id, validatedData.id),
          eq(categories.pharmacyId, validatedData.pharmacyId),
        ),
      );

    if (existingCategory.length === 0) {
      return { success: false, message: 'Category not found' };
    }

    await db
      .delete(categories)
      .where(
        and(
          eq(categories.id, validatedData.id),
          eq(categories.pharmacyId, validatedData.pharmacyId),
        ),
      );

    revalidatePath('/categories');

    await logActivity({
      action: 'CATEGORY_DELETED',
      pharmacyId: validatedData.pharmacyId,
      details: { id: validatedData.id, name: existingCategory[0]?.name },
    });

    return {
      success: true,
      message: 'Category deleted successfully',
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

    console.error('Error deleting category:', error);
    return {
      success: false,
      message: 'An error occurred while deleting category',
    };
  }
};
