'use server'; //for the server actions to be executed on the server

// Next.js automatically caches server-rendered pages and fetch results to improve performance.
// To ensure your data stays fresh after creating or deleting a category, you should add revalidatePath() inside your createCategory and deleteCategory server actions. This will clear the cache for the affected route (e.g., /categories), prompting a re-fetch on the next render.

import { db } from '@/database/drizzle';
import { categories } from '@/database/schema';
import { Category, CategoryFormValues } from '@/types';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function getCategories() {
  try {
    const result = await db.select().from(categories);
    return result;
  } catch (error) {
    console.log(error);
    return []; // datatable expects only array for its data prop
  }
}

export async function createCategory(
  params: Pick<Category, 'name' | 'description'>,
) {
  try {
    // check if category exists
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
    revalidatePath('/categories'); // Clears cache refresh the page

    return {
      success: true,
      data: JSON.parse(JSON.stringify(newCategory)),
    };
  } catch (error) {
    console.log(error);
    return {
      success: false,
      message: 'An error occurred while creating new category',
    };
  }
}

export const deleteCategory = async (categoryId: number) => {
  try {
    await db.delete(categories).where(eq(categories.id, categoryId));
    revalidatePath('/categories');
    return {
      success: true,
      message: 'Category deleted',
    };
  } catch (error) {
    console.log(error);
    return {
      success: false,
      message: 'An error occurred while deleting category',
    };
  }
};

export const updateCategory = async (
  data: { id: number } & CategoryFormValues,
) => {
  try {
    await db
      .update(categories)
      .set({
        name: data.name,
        description: data.description,
      })
      .where(eq(categories.id, data.id));

    return { success: true };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      error: 'Failed to update category',
    };
  }
};
