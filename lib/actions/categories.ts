'use server';

import { db } from '@/database/drizzle';
import { categories } from '@/database/schema';
import { Category, CategoryParams } from '@/types';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function getCategories() {
  try {
    const result = await db.select().from(categories);
    return result;
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

export async function createCategory(
  params: Pick<Category, 'name' | 'description'>,
) {
  try {
    const existingCategory = await db
      .select()
      .from(categories)
      .where(eq(categories.name, params.name));

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

export const updateCategory = async (data: { id: number } & CategoryParams) => {
  try {
    const existingCategory = await db
      .select()
      .from(categories)
      .where(eq(categories.id, data.id));

    if (existingCategory.length === 0) {
      return { success: false, message: 'Category not found' };
    }

    // Check if new name already exists (excluding current category)
    const nameCheck = await db
      .select()
      .from(categories)
      .where(eq(categories.name, data.name));

    if (nameCheck.length > 0 && nameCheck[0].id !== data.id) {
      return { success: false, message: 'Category name already exists' };
    }

    await db
      .update(categories)
      .set({
        name: data.name,
        description: data.description,
      })
      .where(eq(categories.id, data.id));

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

export const deleteCategory = async (categoryId: number) => {
  try {
    const existingCategory = await db
      .select()
      .from(categories)
      .where(eq(categories.id, categoryId));

    if (existingCategory.length === 0) {
      return { success: false, message: 'Category not found' };
    }

    await db.delete(categories).where(eq(categories.id, categoryId));
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
