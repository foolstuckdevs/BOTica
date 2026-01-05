'use server';

import { db } from '@/database/drizzle';
import { stockIns, stockInItems, suppliers, products } from '@/database/schema';
import { and, desc, eq, sql } from 'drizzle-orm';
import {
  createStockInSchema,
  getStockInByIdSchema,
  getStockInsSchema,
} from '@/lib/validations';
import type { StockIn, StockInItem, StockInParams } from '@/types';
import { revalidatePath } from 'next/cache';
import { logActivity } from '@/lib/actions/activity';

const toAmountString = (value: number) => value.toFixed(2);

const parseAmount = (value?: string | null) => {
  if (!value) return 0;
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const normalizeDate = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
};

export const getStockIns = async (pharmacyId: number): Promise<StockIn[]> => {
  const validated = getStockInsSchema.parse({ pharmacyId });

  const rows = await db
    .select({
      id: stockIns.id,
      supplierId: stockIns.supplierId,
      supplierName: suppliers.name,
      pharmacyId: stockIns.pharmacyId,
      createdBy: stockIns.createdBy,
      deliveryDate: stockIns.deliveryDate,
      attachmentUrl: stockIns.attachmentUrl,
      subtotal: stockIns.subtotal,
      discount: stockIns.discount,
      total: stockIns.total,
      createdAt: stockIns.createdAt,
      updatedAt: stockIns.updatedAt,
    })
    .from(stockIns)
    .leftJoin(suppliers, eq(stockIns.supplierId, suppliers.id))
    .where(eq(stockIns.pharmacyId, validated.pharmacyId))
    .orderBy(desc(stockIns.createdAt));

  return rows.map((row) => ({
    ...row,
    deliveryDate: normalizeDate(row.deliveryDate) ?? '',
    createdAt: normalizeDate(row.createdAt) ?? '',
    updatedAt: normalizeDate(row.updatedAt),
  })) as StockIn[];
};

export const getStockInById = async (
  id: number,
  pharmacyId: number,
): Promise<StockIn | null> => {
  const validated = getStockInByIdSchema.parse({ id, pharmacyId });

  const [header] = await db
    .select({
      id: stockIns.id,
      supplierId: stockIns.supplierId,
      supplierName: suppliers.name,
      pharmacyId: stockIns.pharmacyId,
      createdBy: stockIns.createdBy,
      deliveryDate: stockIns.deliveryDate,
      attachmentUrl: stockIns.attachmentUrl,
      subtotal: stockIns.subtotal,
      discount: stockIns.discount,
      total: stockIns.total,
      createdAt: stockIns.createdAt,
      updatedAt: stockIns.updatedAt,
    })
    .from(stockIns)
    .leftJoin(suppliers, eq(stockIns.supplierId, suppliers.id))
    .where(
      and(
        eq(stockIns.id, validated.id),
        eq(stockIns.pharmacyId, validated.pharmacyId),
      ),
    )
    .limit(1);

  if (!header) {
    return null;
  }

  const items = await db
    .select({
      id: stockInItems.id,
      stockInId: stockInItems.stockInId,
      productId: stockInItems.productId,
      productName: products.name,
      quantity: stockInItems.quantity,
      unitCost: stockInItems.unitCost,
      amount: stockInItems.amount,
      lotNumber: stockInItems.lotNumber,
      expiryDate: stockInItems.expiryDate,
    })
    .from(stockInItems)
    .leftJoin(products, eq(stockInItems.productId, products.id))
    .where(eq(stockInItems.stockInId, validated.id));

  const normalizedItems: StockInItem[] = items.map((row) => ({
    ...row,
    productName: row.productName ?? undefined,
    amount: row.amount ?? '0.00',
    expiryDate: normalizeDate(row.expiryDate),
    lotNumber: row.lotNumber ?? undefined,
  }));

  return {
    ...header,
    deliveryDate: normalizeDate(header.deliveryDate) ?? '',
    createdAt: normalizeDate(header.createdAt) ?? '',
    updatedAt: normalizeDate(header.updatedAt),
    items: normalizedItems,
  } as StockIn;
};

export const createStockIn = async (
  payload: StockInParams & { pharmacyId: number; createdBy: string },
) => {
  const validated = createStockInSchema.parse(payload);

  return await db.transaction(async (tx) => {
    const itemsWithProducts = await Promise.all(
      validated.items.map(async (item) => {
        const [originalProduct] = await tx
          .select()
          .from(products)
          .where(
            and(
              eq(products.id, item.productId),
              eq(products.pharmacyId, validated.pharmacyId),
              sql`${products.deletedAt} IS NULL`,
            ),
          )
          .limit(1);

        if (!originalProduct) {
          throw new Error('Product not found for stock-in record.');
        }

        // Normalize dates for comparison
        const itemLotNumber = item.lotNumber?.trim() || null;
        const itemExpiryDate = item.expiryDate
          ? new Date(item.expiryDate).toISOString().slice(0, 10)
          : null;
        const productLotNumber = originalProduct.lotNumber?.trim() || null;
        const productExpiryDate = originalProduct.expiryDate
          ? new Date(originalProduct.expiryDate).toISOString().slice(0, 10)
          : null;

        // Check if lot number or expiry date differs
        const lotDiffers = itemLotNumber && itemLotNumber !== productLotNumber;
        const expiryDiffers =
          itemExpiryDate && itemExpiryDate !== productExpiryDate;

        // Check if cost differs (for updating existing product's selling price)
        const itemCost = parseAmount(item.unitCost);
        const productCost = parseAmount(originalProduct.costPrice);
        const costDiffers =
          productCost > 0 && Math.abs(itemCost - productCost) >= 0.01;

        let targetProductId = item.productId;
        let shouldUpdateSellingPrice = false;

        if (lotDiffers || expiryDiffers) {
          // Check if a product with the same name + lot + expiry already exists
          const existingConditions = [
            eq(products.name, originalProduct.name),
            eq(products.pharmacyId, validated.pharmacyId),
            sql`${products.deletedAt} IS NULL`,
          ];

          if (itemLotNumber) {
            existingConditions.push(eq(products.lotNumber, itemLotNumber));
          } else {
            existingConditions.push(sql`${products.lotNumber} IS NULL`);
          }

          if (itemExpiryDate) {
            existingConditions.push(eq(products.expiryDate, itemExpiryDate));
          } else {
            existingConditions.push(sql`${products.expiryDate} IS NULL`);
          }

          const [existingProduct] = await tx
            .select({ id: products.id })
            .from(products)
            .where(and(...existingConditions))
            .limit(1);

          if (existingProduct) {
            // Use the existing product with matching lot/expiry
            targetProductId = existingProduct.id;
          } else {
            // Calculate selling price based on original markup percentage
            const originalCost = parseAmount(originalProduct.costPrice);
            const originalSelling = parseAmount(originalProduct.sellingPrice);
            const newCost = parseAmount(item.unitCost);

            let newSellingPrice: string;
            if (originalCost > 0) {
              // Calculate markup percentage and apply to new cost
              const markupPercentage =
                (originalSelling - originalCost) / originalCost;
              const calculatedSelling = newCost * (1 + markupPercentage);
              newSellingPrice = calculatedSelling.toFixed(2);
            } else {
              // If original cost was 0, use original selling price or default markup (20%)
              newSellingPrice =
                originalSelling > 0
                  ? originalProduct.sellingPrice
                  : (newCost * 1.2).toFixed(2);
            }

            // Create a new product entry with the new lot/expiry
            const [newProduct] = await tx
              .insert(products)
              .values({
                name: originalProduct.name,
                genericName: originalProduct.genericName,
                categoryId: originalProduct.categoryId,
                lotNumber: itemLotNumber,
                brandName: originalProduct.brandName,
                dosageForm: originalProduct.dosageForm,
                expiryDate: itemExpiryDate,
                quantity: 0, // Will be updated below
                costPrice: item.unitCost,
                sellingPrice: newSellingPrice,
                minStockLevel: originalProduct.minStockLevel,
                unit: originalProduct.unit,
                supplierId: validated.supplierId ?? originalProduct.supplierId,
                imageUrl: originalProduct.imageUrl,
                pharmacyId: validated.pharmacyId,
              })
              .returning({ id: products.id });

            targetProductId = newProduct.id;
          }
        } else if (costDiffers) {
          // Cost changed but same lot/expiry - mark for selling price update on existing product
          shouldUpdateSellingPrice = true;
        }

        return {
          product: { id: targetProductId, pharmacyId: validated.pharmacyId },
          item: { ...item, productId: targetProductId },
          originalProduct,
          shouldUpdateSellingPrice,
        };
      }),
    );

    const computedSubtotal = itemsWithProducts.reduce((total, current) => {
      const lineAmount =
        current.item.quantity * Number.parseFloat(current.item.unitCost);
      return total + (Number.isNaN(lineAmount) ? 0 : lineAmount);
    }, 0);

    const discount = parseAmount(validated.discount);
    // Always compute total from subtotal - discount to ensure consistency
    const total = Math.max(computedSubtotal - discount, 0);

    const [newStockIn] = await tx
      .insert(stockIns)
      .values({
        supplierId: validated.supplierId ?? null,
        pharmacyId: validated.pharmacyId,
        createdBy: validated.createdBy,
        deliveryDate: validated.deliveryDate,
        attachmentUrl: validated.attachmentUrl,
        subtotal: toAmountString(computedSubtotal),
        discount: toAmountString(discount),
        total: toAmountString(total),
      })
      .returning();

    for (const entry of itemsWithProducts) {
      const amount =
        entry.item.quantity * Number.parseFloat(entry.item.unitCost);
      await tx.insert(stockInItems).values({
        stockInId: newStockIn.id,
        productId: entry.item.productId,
        quantity: entry.item.quantity,
        unitCost: entry.item.unitCost,
        amount: toAmountString(Number.isNaN(amount) ? 0 : amount),
        lotNumber: entry.item.lotNumber || null,
        expiryDate: entry.item.expiryDate ?? null,
      });

      // Build update object - always update quantity
      const updateData: Record<string, unknown> = {
        quantity: sql`${products.quantity} + ${entry.item.quantity}`,
      };

      // For cost-only changes: only update cost & selling price if user explicitly provided a new selling price
      // This preserves historical pricing accuracy for reports
      if (entry.shouldUpdateSellingPrice && entry.item.sellingPrice) {
        updateData.costPrice = entry.item.unitCost;
        updateData.sellingPrice = entry.item.sellingPrice;
      } else if (!entry.shouldUpdateSellingPrice) {
        // For new batches or no cost change, update cost price normally
        updateData.costPrice = entry.item.unitCost;
      }
      // If shouldUpdateSellingPrice is true but no selling price provided,
      // don't update cost - just add to stock quantity

      await tx
        .update(products)
        .set(updateData)
        .where(
          and(
            eq(products.id, entry.item.productId),
            eq(products.pharmacyId, validated.pharmacyId),
          ),
        );
    }

    await logActivity({
      action: 'STOCKIN_RECEIVED',
      pharmacyId: validated.pharmacyId,
      details: {
        id: newStockIn.id,
        items: validated.items.length,
      },
      userId: validated.createdBy,
    });

    revalidatePath('/inventory/stock-in');
    revalidatePath('/products');

    return {
      success: true,
      data: newStockIn,
    } as const;
  });
};
