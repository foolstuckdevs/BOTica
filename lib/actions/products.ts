'use server';

import { db } from '@/database/drizzle';
import { eq } from 'drizzle-orm';
import { categories, products, suppliers } from '@/database/schema';
import { ProductParams } from '@/types';
import { revalidatePath } from 'next/cache';

export const getProducts = async () => {
  try {
    return await db
      .select({
        id: products.id,
        name: products.name,
        genericName: products.genericName,
        categoryId: products.categoryId,
        categoryName: categories.name,
        barcode: products.barcode,
        batchNumber: products.batchNumber,
        expiryDate: products.expiryDate,
        quantity: products.quantity,
        costPrice: products.costPrice,
        sellingPrice: products.sellingPrice,
        minStockLevel: products.minStockLevel,
        unit: products.unit,
        supplierId: products.supplierId,
        supplierName: suppliers.name,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(suppliers, eq(products.supplierId, suppliers.id));
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
};

export const getProductById = async (id: number) => {
  try {
    const result = await db
      .select({
        id: products.id,
        name: products.name,
        genericName: products.genericName,
        categoryId: products.categoryId,
        categoryName: categories.name,
        unit: products.unit,
        batchNumber: products.batchNumber,
        barcode: products.barcode,
        expiryDate: products.expiryDate,
        quantity: products.quantity,
        costPrice: products.costPrice,
        sellingPrice: products.sellingPrice,
        minStockLevel: products.minStockLevel,
        supplierId: products.supplierId,
        supplierName: suppliers.name,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(suppliers, eq(products.supplierId, suppliers.id))
      .where(eq(products.id, id));

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Error fetching product with category:', error);
    return null;
  }
};

export const createProduct = async (params: ProductParams) => {
  try {
    const existingProduct = await db
      .select()
      .from(products)
      .where(eq(products.name, params.name));

    if (existingProduct.length > 0) {
      return { success: false, message: 'Product already exists' };
    }

    const newProduct = await db.insert(products).values(params).returning();

    revalidatePath('/products'); // ADDED: cache revalidation

    return {
      success: true,
      data: JSON.parse(JSON.stringify(newProduct[0])),
    };
  } catch (error) {
    console.error('Database error:', error);
    return {
      success: false,
      message: 'Failed to create product',
    };
  }
};

export const updateProduct = async (
  id: number,
  params: Partial<ProductParams>,
) => {
  try {
    const existingProduct = await db
      .select()
      .from(products)
      .where(eq(products.id, id));

    if (existingProduct.length === 0) {
      return { success: false, message: 'Product not found' };
    }

    // Check if new name already exists but ignore if it's the same product
    if (params.name) {
      const nameCheck = await db
        .select()
        .from(products)
        .where(eq(products.name, params.name));

      if (nameCheck.length > 0 && nameCheck[0].id !== id) {
        return { success: false, message: 'Product name already exists' };
      }
    }

    const updatedProduct = await db
      .update(products)
      .set(params)
      .where(eq(products.id, id))
      .returning();

    revalidatePath('/products'); // ADDED: cache revalidation

    return {
      success: true,
      data: JSON.parse(JSON.stringify(updatedProduct[0])),
    };
  } catch (error) {
    console.error('Error updating product:', error);
    return {
      success: false,
      message: 'Failed to update product',
    };
  }
};

export const deleteProduct = async (id: number) => {
  try {
    const existingProduct = await db
      .select()
      .from(products)
      .where(eq(products.id, id));

    if (existingProduct.length === 0) {
      return { success: false, message: 'Product not found' };
    }

    await db.delete(products).where(eq(products.id, id));

    revalidatePath('/products'); // ADDED: cache revalidation

    return {
      success: true,
      message: 'Product deleted successfully',
    };
  } catch (error) {
    console.error('Error deleting product:', error);
    return {
      success: false,
      message: 'Failed to delete product',
    };
  }
};
