'use server';

import { db } from '@/database/drizzle';
import { eq, and, sql } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';
import {
  categories,
  products,
  suppliers,
  saleItems,
  inventoryAdjustments,
  purchaseOrderItems,
} from '@/database/schema';
import { ProductParams } from '@/types';
import { revalidatePath } from 'next/cache';
import {
  pharmacyIdSchema,
  productIdSchema,
  createProductSchema,
  updateProductSchema,
  getProductBatchesSchema,
} from '@/lib/validations';
import type { Product } from '@/types';
import { canEditMasterData } from '@/lib/helpers/rbac';
import { logActivity } from '@/lib/actions/activity';

// Drizzle product row type and a narrowed subset used in update checks
type ProductRow = InferSelectModel<typeof products>;
type ExistingProductSubset = Pick<
  ProductRow,
  | 'expiryDate'
  | 'unit'
  | 'dosageForm'
  | 'supplierId'
  | 'quantity'
  | 'lotNumber'
  | 'costPrice'
  | 'imageUrl'
>;

// NOTE: Legacy unpaginated getProducts() removed. Use listProductsPage() via /api/products.

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
          sql`COALESCE(${products.deletedAt}, NULL) IS NULL`,
        ),
      );

    // Sort by expiry date (FEFO) and filter out expired products
    const activeProducts = result.filter((product) => {
      if (!product.expiryDate) return true; // If no expiry date, include product
      const today = new Date();
      const expiryDate = new Date(product.expiryDate);
      return expiryDate >= today; // Only show products that haven't expired
    });

    return activeProducts.sort((a, b) => {
      if (!a.expiryDate && !b.expiryDate) return 0;
      if (!a.expiryDate) return 1; // No expiry date goes to end
      if (!b.expiryDate) return -1; // No expiry date goes to end
      const expiryA = new Date(a.expiryDate);
      const expiryB = new Date(b.expiryDate);
      return expiryA.getTime() - expiryB.getTime();
    });
  } catch (error) {
    console.error('Error fetching product batches:', error);
    return [];
  }
};

export const getProductById = async (
  id: number,
  pharmacyId: number,
): Promise<(Product & { hasReferences?: boolean }) | null> => {
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
      .where(
        and(
          eq(products.id, id),
          eq(products.pharmacyId, pharmacyId),
          sql`${products.deletedAt} IS NULL`,
        ),
      );

    if (result.length === 0) return null;

    // Determine if product is referenced by transactions/adjustments/receipts (EXISTS-based)
    const [{ hasReferences }] = await db
      .select({
        hasReferences: sql<boolean>`(
          EXISTS (SELECT 1 FROM ${saleItems} WHERE ${saleItems.productId} = ${id})
          OR EXISTS (SELECT 1 FROM ${inventoryAdjustments} WHERE ${inventoryAdjustments.productId} = ${id})
          OR EXISTS (
            SELECT 1 FROM ${purchaseOrderItems}
            WHERE ${purchaseOrderItems.productId} = ${id}
              AND COALESCE(${purchaseOrderItems.receivedQuantity}, 0) > 0
          )
        )`,
      })
      .from(products)
      .where(and(eq(products.id, id), eq(products.pharmacyId, pharmacyId)));

    return {
      ...(result[0] as unknown as Product),
      hasReferences,
    };
  } catch (error) {
    console.error('Error fetching product with category:', error);
    return null;
  }
};

export const createProduct = async (
  params: ProductParams & { pharmacyId: number },
) => {
  try {
    // RBAC: Admin-only for master data mutations (products)
    if (!(await canEditMasterData())) {
      return { success: false, message: 'Unauthorized' };
    }
    // Validate with Zod
    const validatedData = createProductSchema.parse(params);

    // Check for duplicate: same name + lot number + expiry date
    // This ensures each batch is unique even for products with same name
    if (
      validatedData.name &&
      validatedData.lotNumber &&
      validatedData.expiryDate
    ) {
      const existingProduct = await db
        .select()
        .from(products)
        .where(
          and(
            eq(products.name, validatedData.name),
            eq(products.lotNumber, validatedData.lotNumber),
            eq(products.expiryDate, validatedData.expiryDate),
            eq(products.pharmacyId, validatedData.pharmacyId),
            sql`${products.deletedAt} IS NULL`,
          ),
        );

      if (existingProduct.length > 0) {
        return {
          success: false,
          message:
            'A product with this name, lot number, and expiry date already exists.',
        };
      }
    }

    const newProduct = await db
      .insert(products)
      .values(validatedData)
      .returning();

    // Log activity
    await logActivity({
      action: 'PRODUCT_CREATED',
      pharmacyId: validatedData.pharmacyId,
      details: {
        id: newProduct[0]?.id,
        name: validatedData.name,
        brandName: validatedData.brandName ?? null,
        categoryId: validatedData.categoryId ?? null,
      },
    });

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
    // RBAC: Admin-only for master data mutations (products)
    if (!(await canEditMasterData())) {
      return { success: false, message: 'Unauthorized' };
    }
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
    const existingProduct = existingProductArr[0] as ExistingProductSubset;

    // Check references
    const [{ hasReferences, hasSales }] = await db
      .select({
        hasReferences: sql<boolean>`(
          EXISTS (SELECT 1 FROM ${saleItems} WHERE ${saleItems.productId} = ${validatedData.id})
          OR EXISTS (SELECT 1 FROM ${inventoryAdjustments} WHERE ${inventoryAdjustments.productId} = ${validatedData.id})
          OR EXISTS (
            SELECT 1 FROM ${purchaseOrderItems}
            WHERE ${purchaseOrderItems.productId} = ${validatedData.id}
              AND COALESCE(${purchaseOrderItems.receivedQuantity}, 0) > 0
          )
        )`,
        hasSales: sql<boolean>`EXISTS (SELECT 1 FROM ${saleItems} WHERE ${saleItems.productId} = ${validatedData.id})`,
      })
      .from(products)
      .where(
        and(
          eq(products.id, validatedData.id),
          eq(products.pharmacyId, validatedData.pharmacyId),
        ),
      );

    // lotNumber immutability is handled below together with other identity fields when referenced

    // Disallow direct quantity changes via update; use adjustments/PO
    if (
      Object.prototype.hasOwnProperty.call(validatedData.params, 'quantity') &&
      validatedData.params.quantity !== undefined &&
      validatedData.params.quantity !== existingProduct.quantity
    ) {
      return {
        success: false,
        message:
          'Quantity cannot be edited directly. Use Inventory Adjustments or Purchase Order receiving to change stock.',
      };
    }

    // If referenced, freeze identity/traceability fields and barcode/supplier
    if (hasReferences) {
      const normalizeDate = (d: string | Date) => {
        const dt = typeof d === 'string' ? new Date(d) : d;
        return new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 10);
      };

      const attemptedChanges: string[] = [];
      if (
        validatedData.params.expiryDate &&
        existingProduct.expiryDate &&
        normalizeDate(validatedData.params.expiryDate) !==
          normalizeDate(existingProduct.expiryDate)
      )
        attemptedChanges.push('expiryDate');
      if (validatedData.params.expiryDate && !existingProduct.expiryDate)
        attemptedChanges.push('expiryDate');
      if (
        validatedData.params.lotNumber &&
        validatedData.params.lotNumber !== existingProduct.lotNumber
      )
        attemptedChanges.push('lotNumber');
      if (
        validatedData.params.unit &&
        validatedData.params.unit !== existingProduct.unit
      )
        attemptedChanges.push('unit');
      if (
        validatedData.params.dosageForm &&
        validatedData.params.dosageForm !== existingProduct.dosageForm
      )
        attemptedChanges.push('dosageForm');
      if (
        validatedData.params.supplierId !== undefined &&
        validatedData.params.supplierId !== existingProduct.supplierId
      )
        attemptedChanges.push('supplierId');

      if (attemptedChanges.length > 0) {
        return {
          success: false,
          message: `This product is referenced by existing records; the following field(s) cannot be changed: ${attemptedChanges.join(
            ', ',
          )}.`,
        };
      }
    }

    // If sales exist, lock costPrice to avoid altering historical profit calc
    if (
      hasSales &&
      validatedData.params.costPrice !== undefined &&
      validatedData.params.costPrice !== existingProduct.costPrice
    ) {
      return {
        success: false,
        message:
          'Cost price cannot be changed after sales exist for this product. Update cost via new purchase receipts instead.',
      };
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

    // Log activity
    await logActivity({
      action: 'PRODUCT_UPDATED',
      pharmacyId: validatedData.pharmacyId,
      details: {
        id: validatedData.id,
        changes: Object.keys(validatedData.params ?? {}),
      },
    });

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
    // RBAC: Admin-only for master data mutations (products)
    if (!(await canEditMasterData())) {
      return { success: false, message: 'Unauthorized' };
    }
    // Validate with Zod
    productIdSchema.parse(id);
    pharmacyIdSchema.parse(pharmacyId);

    const existingProduct = await db
      .select({
        id: products.id,
        name: products.name,
        imageUrl: products.imageUrl,
      })
      .from(products)
      .where(and(eq(products.id, id), eq(products.pharmacyId, pharmacyId)));

    if (existingProduct.length === 0) {
      return { success: false, message: 'Product not found' };
    }

    // Check references (single EXISTS-based query)
    const [{ hasReferences }] = await db
      .select({
        hasReferences: sql<boolean>`(
          EXISTS (SELECT 1 FROM ${saleItems} WHERE ${saleItems.productId} = ${id})
          OR EXISTS (SELECT 1 FROM ${inventoryAdjustments} WHERE ${inventoryAdjustments.productId} = ${id})
          OR EXISTS (
            SELECT 1 FROM ${purchaseOrderItems}
            WHERE ${purchaseOrderItems.productId} = ${id}
              AND COALESCE(${purchaseOrderItems.receivedQuantity}, 0) > 0
          )
        )`,
      })
      .from(products)
      .where(and(eq(products.id, id), eq(products.pharmacyId, pharmacyId)));

    if (hasReferences) {
      // Soft delete when referenced
      await db
        .update(products)
        .set({ deletedAt: sql`NOW()` })
        .where(and(eq(products.id, id), eq(products.pharmacyId, pharmacyId)));
      // Revalidate products and inventory report pages
      revalidatePath('/products');
      revalidatePath('/inventory/products');
      revalidatePath('/reports/inventory');
      await logActivity({
        action: 'PRODUCT_ARCHIVED',
        pharmacyId,
        details: { id, name: (existingProduct[0] as { name?: string })?.name },
      });
      return {
        success: true,
        message: 'Product archived (still linked to records)',
      };
    }

    // Attempt hard delete; fall back to soft delete on FK failure
    try {
      await db
        .delete(products)
        .where(and(eq(products.id, id), eq(products.pharmacyId, pharmacyId)));
      // Cleanup image if any (only on hard delete)
      const imageUrl = (existingProduct[0] as { imageUrl?: string | null })
        ?.imageUrl;
      if (imageUrl) {
        try {
          const { deleteImageFromSupabase } = await import('@/lib/utils');
          await deleteImageFromSupabase(imageUrl);
        } catch (e) {
          console.warn('Failed to delete product image from storage:', e);
        }
      }
      // Revalidate products and inventory report pages
      revalidatePath('/products');
      revalidatePath('/inventory/products');
      revalidatePath('/reports/inventory');
      await logActivity({
        action: 'PRODUCT_DELETED',
        pharmacyId,
        details: { id, name: (existingProduct[0] as { name?: string })?.name },
      });
      return {
        success: true,
        message: 'Product deleted permanently',
      };
    } catch {
      await db
        .update(products)
        .set({ deletedAt: sql`NOW()` })
        .where(and(eq(products.id, id), eq(products.pharmacyId, pharmacyId)));
      // Revalidate products and inventory report pages
      revalidatePath('/products');
      revalidatePath('/inventory/products');
      revalidatePath('/reports/inventory');
      await logActivity({
        action: 'PRODUCT_ARCHIVED',
        pharmacyId,
        details: { id, name: (existingProduct[0] as { name?: string })?.name },
      });
      return {
        success: true,
        message: 'Product archived (linked to past transactions)',
      };
    }
  } catch (error) {
    console.error('Error deleting product:', error);
    return {
      success: false,
      message: 'Failed to delete product',
    };
  }
};
