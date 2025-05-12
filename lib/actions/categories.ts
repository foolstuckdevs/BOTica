'use server'; //for the server actions to be executed on the server

import { db } from '@/database/drizzle';
import { categories } from '@/database/schema';
import { Categories } from '@/types';
import { eq } from 'drizzle-orm';

export async function getCategories() {
  try {
    const result = await db.select().from(categories);
    return result.map((c) => ({
      ...c,
      id: c.id.toString(),
    }));
  } catch (error) {
    console.log(error);
    return []; // datatable expects only array for its data prop
  }
}

export async function createCategory(
  params: Pick<Categories, 'name' | 'description'>,
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

    return {
      success: true,
      data: JSON.parse(JSON.stringify(newCategory)),
    };
  } catch (error) {
    console.log(error);
    return {
      success: false,
      message: 'An error occurred while creating the category',
    };
  }
}

// temporary
export const deleteCategory = async (categoryId: number) => {
  try {
    await db.delete(categories).where(eq(categories.id, categoryId));

    return {
      success: true,
      message: 'Category deleted successfully',
    };
  } catch (error) {
    console.log(error);
    return {
      success: false,
      message: 'An error occurred while deleting category',
    };
  }
};
