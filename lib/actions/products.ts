'use server';

import { db } from '@/database/drizzle';
import { eq, and } from 'drizzle-orm';
import { categories, products, suppliers } from '@/database/schema';
import { ProductParams } from '@/types';
import { revalidatePath } from 'next/cache';

export const getProducts = async (pharmacyId: number) => {
  try {
    const result = await db
      .select({
        id: products.id,
        name: products.name,
        genericName: products.genericName,
        categoryId: products.categoryId,
        categoryName: categories.name,
        barcode: products.barcode,
        lotNumber: products.lotNumber,
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
        brandName: products.brandName,
        dosageForm: products.dosageForm,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(suppliers, eq(products.supplierId, suppliers.id))
      .where(eq(products.pharmacyId, pharmacyId));

    // FEFO Implementation: Sort by expiry date (earliest first), then by product name
    // Filter out expired products for safety and regulatory compliance
    const activeProducts = result.filter((product) => {
      const today = new Date();
      const expiryDate = new Date(product.expiryDate);
      return expiryDate >= today; // Only show products that haven't expired
    });

    return activeProducts.sort((a, b) => {
      // First sort by expiry date (FEFO)
      const expiryA = new Date(a.expiryDate);
      const expiryB = new Date(b.expiryDate);

      if (expiryA.getTime() !== expiryB.getTime()) {
        return expiryA.getTime() - expiryB.getTime();
      }

      // Then sort by product name for consistent grouping
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
};

export const getProductBatches = async (
  productName: string,
  pharmacyId: number,
) => {
  try {
    const result = await db
      .select({
        id: products.id,
        name: products.name,
        brandName: products.brandName,
        lotNumber: products.lotNumber,
        expiryDate: products.expiryDate,
        quantity: products.quantity,
        sellingPrice: products.sellingPrice,
      })
      .from(products)
      .where(
        and(
          eq(products.name, productName),
          eq(products.pharmacyId, pharmacyId),
        ),
      );

    // Sort by expiry date (FEFO) and filter out expired products
    const activeProducts = result.filter((product) => {
      const today = new Date();
      const expiryDate = new Date(product.expiryDate);
      return expiryDate >= today; // Only show products that haven't expired
    });

    return activeProducts.sort((a, b) => {
      const expiryA = new Date(a.expiryDate);
      const expiryB = new Date(b.expiryDate);
      return expiryA.getTime() - expiryB.getTime();
    });
  } catch (error) {
    console.error('Error fetching product batches:', error);
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
        lotNumber: products.lotNumber,
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
        brandName: products.brandName,
        dosageForm: products.dosageForm,
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
    // For batch tracking: Allow same barcode with different lot numbers
    // Only check for duplicate barcode + lot combination if both are provided
    if (params.barcode && params.lotNumber) {
      const existingProduct = await db
        .select()
        .from(products)
        .where(
          and(
            eq(products.barcode, params.barcode),
            eq(products.lotNumber, params.lotNumber),
            eq(products.pharmacyId, params.pharmacyId),
          ),
        );

      if (existingProduct.length > 0) {
        return {
          success: false,
          message: 'This lot number already exists for this product',
        };
      }
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

    // For updates, we don't need to check name uniqueness since multiple products
    // can have the same name with different brands, lots, or batches in pharmacy systems
    // Only check for barcode + lot number combination if both are being updated
    if (params.barcode && params.lotNumber) {
      const existingProduct = await db
        .select()
        .from(products)
        .where(
          and(
            eq(products.barcode, params.barcode),
            eq(products.lotNumber, params.lotNumber),
            eq(products.pharmacyId, pharmacyId),
          ),
        );

      if (existingProduct.length > 0 && existingProduct[0].id !== id) {
        return {
          success: false,
          message: 'This lot number already exists for this product',
        };
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
