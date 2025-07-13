'use server';

import { db } from '@/database/drizzle';
import { categories } from '@/database/schema';
import { Category, CategoryParams } from '@/types';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

/**
 * Get categories by pharmacy
 */
export async function getCategories(pharmacyId: number) {
  try {
    const result = await db
      .select()
      .from(categories)
      .where(eq(categories.pharmacyId, pharmacyId));

    return result;
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

/**
 * Create new category (with pharmacy scope)
 */
export async function createCategory(
  params: Pick<Category, 'name' | 'description'> & { pharmacyId: number },
) {
  try {
    const existingCategory = await db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.name, params.name),
          eq(categories.pharmacyId, params.pharmacyId),
        ),
      );

    if (existingCategory.length > 0) {
      return {
        success: false,
        message: 'Category with this name already exists',
      };
    }

    const newCategory = await db.insert(categories).values(params).returning();

    revalidatePath('/categories');

    return {
      success: true,
      data: JSON.parse(JSON.stringify(newCategory[0])),
    };
  } catch (error) {
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
  data: { id: number; pharmacyId: number } & CategoryParams,
) => {
  try {
    const existingCategory = await db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.id, data.id),
          eq(categories.pharmacyId, data.pharmacyId),
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
          eq(categories.name, data.name),
          eq(categories.pharmacyId, data.pharmacyId),
        ),
      );

    if (nameCheck.length > 0 && nameCheck[0].id !== data.id) {
      return { success: false, message: 'Category name already exists' };
    }

    await db
      .update(categories)
      .set({
        name: data.name,
        description: data.description,
      })
      .where(
        and(
          eq(categories.id, data.id),
          eq(categories.pharmacyId, data.pharmacyId),
        ),
      );

    revalidatePath('/categories');

    return { success: true };
  } catch (error) {
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
    const existingCategory = await db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.id, categoryId),
          eq(categories.pharmacyId, pharmacyId),
        ),
      );

    if (existingCategory.length === 0) {
      return { success: false, message: 'Category not found' };
    }

    await db
      .delete(categories)
      .where(
        and(
          eq(categories.id, categoryId),
          eq(categories.pharmacyId, pharmacyId),
        ),
      );

    revalidatePath('/categories');

    return {
      success: true,
      message: 'Category deleted successfully',
    };
  } catch (error) {
    console.error('Error deleting category:', error);
    return {
      success: false,
      message: 'An error occurred while deleting category',
    };
  }
};
