'use server';

import { db } from '@/database/drizzle';
import { eq, and } from 'drizzle-orm';
import { categories, products, suppliers, saleItems } from '@/database/schema';
import { ProductParams } from '@/types';
import { revalidatePath } from 'next/cache';
import {
  pharmacyIdSchema,
  productIdSchema,
  createProductSchema,
  updateProductSchema,
  getProductBatchesSchema,
} from '@/lib/validations';

export const getProducts = async (pharmacyId: number) => {
  try {
    // Validate with Zod
    pharmacyIdSchema.parse(pharmacyId);

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
      .orderBy(products.name)
      .where(eq(products.pharmacyId, pharmacyId));

    return result;
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
    // Validate with Zod
    getProductBatchesSchema.parse({ productName, pharmacyId });

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
    // Validate with Zod
    productIdSchema.parse(id);
    pharmacyIdSchema.parse(pharmacyId);

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
    // Validate with Zod
    const validatedData = createProductSchema.parse(params);

    // For batch tracking: Allow same barcode with different batch/lot numbers
    // Only check for duplicate barcode + lot combination if both are provided
    if (validatedData.barcode && validatedData.lotNumber) {
      const existingProduct = await db
        .select()
        .from(products)
        .where(
          and(
            eq(products.barcode, validatedData.barcode),
            eq(products.lotNumber, validatedData.lotNumber),
            eq(products.pharmacyId, validatedData.pharmacyId),
          ),
        );

      if (existingProduct.length > 0) {
        return {
          success: false,
          message: 'A product with this barcode and lot number already exists.',
        };
      }
    }

    const newProduct = await db
      .insert(products)
      .values(validatedData)
      .returning();

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
    // Validate with Zod
    const validatedData = updateProductSchema.parse({ id, params, pharmacyId });

    const existingProductArr = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.id, validatedData.id),
          eq(products.pharmacyId, validatedData.pharmacyId),
        ),
      );

    if (existingProductArr.length === 0) {
      return { success: false, message: 'Product not found' };
    }
    const existingProduct = existingProductArr[0];

    // Prevent changing lot number if product is in use
    if (
      validatedData.params.lotNumber &&
      validatedData.params.lotNumber !== existingProduct.lotNumber
    ) {
      const isInUse = await db
        .select()
        .from(saleItems)
        .where(eq(saleItems.productId, validatedData.id));
      if (isInUse.length > 0) {
        return {
          success: false,
          message:
            "This product has existing records - lot number can't be changed",
        };
      }
    }

    // Only check for duplicate barcode+lot if either is being changed
    const willUpdateBarcode =
      typeof validatedData.params.barcode === 'string' &&
      validatedData.params.barcode !== existingProduct.barcode;
    const willUpdateLot =
      typeof validatedData.params.lotNumber === 'string' &&
      validatedData.params.lotNumber !== existingProduct.lotNumber;
    if (willUpdateBarcode || willUpdateLot) {
      const newBarcode =
        typeof validatedData.params.barcode === 'string'
          ? validatedData.params.barcode
          : existingProduct.barcode;
      const newLot =
        typeof validatedData.params.lotNumber === 'string'
          ? validatedData.params.lotNumber
          : existingProduct.lotNumber;
      if (typeof newBarcode === 'string' && typeof newLot === 'string') {
        const duplicate = await db
          .select()
          .from(products)
          .where(
            and(
              eq(products.barcode, newBarcode),
              eq(products.lotNumber, newLot),
              eq(products.pharmacyId, validatedData.pharmacyId),
            ),
          );
        if (duplicate.length > 0 && duplicate[0].id !== validatedData.id) {
          return {
            success: false,
            message:
              'A product with this barcode and lot number already exists in your pharmacy records.',
          };
        }
      }
    }

    // Handle image deletion if imageUrl is set to empty string
    if (validatedData.params.imageUrl === '' && existingProduct.imageUrl) {
      const { deleteImageFromSupabase } = await import('@/lib/utils');
      await deleteImageFromSupabase(existingProduct.imageUrl);
    }

    const updatedProductArr = await db
      .update(products)
      .set(validatedData.params)
      .where(
        and(
          eq(products.id, validatedData.id),
          eq(products.pharmacyId, validatedData.pharmacyId),
        ),
      )
      .returning();

    revalidatePath('/products');

    return {
      success: true,
      data: JSON.parse(JSON.stringify(updatedProductArr[0])),
    };
  } catch (error) {
    console.error('Error updating product:', error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : 'Failed to update product',
    };
  }
};

export const deleteProduct = async (id: number, pharmacyId: number) => {
  try {
    // Validate with Zod
    productIdSchema.parse(id);
    pharmacyIdSchema.parse(pharmacyId);

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
