//home/iantristanlandagura/Desktop/SCHOOL/BSIT-4/System/BOT-ica/lib/actions/products.ts
'use server';

import { db } from '@/database/drizzle';
import { eq, and } from 'drizzle-orm';
import { categories, products, suppliers } from '@/database/schema';
import { ProductParams } from '@/types';
import { revalidatePath } from 'next/cache';

export const getProducts = async (pharmacyId: number) => {
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
        imageUrl: products.imageUrl,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(suppliers, eq(products.supplierId, suppliers.id))
      .where(eq(products.pharmacyId, pharmacyId));
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
};

export const getProductById = async (id: number, pharmacyId: number) => {
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
        imageUrl: products.imageUrl,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(suppliers, eq(products.supplierId, suppliers.id))
      .where(and(eq(products.id, id), eq(products.pharmacyId, pharmacyId)));

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Error fetching product with category:', error);
    return null;
  }
};

export const createProduct = async (
  params: ProductParams & { pharmacyId: number },
) => {
  try {
    const existingProduct = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.name, params.name),
          eq(products.pharmacyId, params.pharmacyId),
        ),
      );

    if (existingProduct.length > 0) {
      return { success: false, message: 'Product already exists' };
    }

    const newProduct = await db.insert(products).values(params).returning();

    revalidatePath('/products');

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
  pharmacyId: number,
) => {
  try {
    const existingProduct = await db
      .select()
      .from(products)
      .where(and(eq(products.id, id), eq(products.pharmacyId, pharmacyId)));

    if (existingProduct.length === 0) {
      return { success: false, message: 'Product not found' };
    }

    if (params.name) {
      const nameCheck = await db
        .select()
        .from(products)
        .where(
          and(
            eq(products.name, params.name),
            eq(products.pharmacyId, pharmacyId),
          ),
        );

      if (nameCheck.length > 0 && nameCheck[0].id !== id) {
        return { success: false, message: 'Product name already exists' };
      }
    }

    if (params.imageUrl === '' && existingProduct[0].imageUrl) {
      const { deleteImageFromSupabase } = await import('@/lib/utils');
      await deleteImageFromSupabase(existingProduct[0].imageUrl!);
    }

    const updatedProduct = await db
      .update(products)
      .set(params)
      .where(and(eq(products.id, id), eq(products.pharmacyId, pharmacyId)))
      .returning();

    revalidatePath('/products');

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

export const deleteProduct = async (id: number, pharmacyId: number) => {
  try {
    const existingProduct = await db
      .select()
      .from(products)
      .where(and(eq(products.id, id), eq(products.pharmacyId, pharmacyId)));

    if (existingProduct.length === 0) {
      return { success: false, message: 'Product not found' };
    }

    await db
      .delete(products)
      .where(and(eq(products.id, id), eq(products.pharmacyId, pharmacyId)));

    revalidatePath('/products');

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

