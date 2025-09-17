'use server';

import { db } from '@/database/drizzle';
import {
  products,
  saleItems,
  sales,
  pharmacies,
  notifications,
} from '@/database/schema';
import type { Pharmacy } from '@/types';
import { eq, and, gte, sql, gt } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { logActivity } from '@/lib/actions/activity';
import { processSaleSchema, pharmacyIdSchema } from '@/lib/validations';

type ProductRow = InferSelectModel<typeof products>;

// Get all products for POS

export const getAllProductsPOS = async (pharmacyId: number) => {
  try {
    // Validate with Zod
    pharmacyIdSchema.parse(pharmacyId);

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10); // 'YYYY-MM-DD'

    const result = await db
      .select({
        // Core sales essentials
        id: products.id,
        name: products.name,
        sellingPrice: products.sellingPrice,
        quantity: products.quantity,
        // Batch/expiry tracking (FEFO)
        lotNumber: products.lotNumber,
        expiryDate: products.expiryDate,
        // Enhanced UX
        imageUrl: products.imageUrl,
        unit: products.unit,
        brandName: products.brandName,
      })
      .from(products)
      .orderBy(products.name, products.expiryDate)
      .where(
        and(
          eq(products.pharmacyId, pharmacyId),
          gte(products.expiryDate, todayStr), // Exclude expired products
          sql`${products.deletedAt} IS NULL`,
        ),
      );

    return result;
  } catch (error) {
    console.error('Error fetching POS products:', error);
    return [];
  }
};

// Get pharmacy info
export const getPharmacy = async (
  pharmacyId: number,
): Promise<Pharmacy | null> => {
  // Validate with Zod
  pharmacyIdSchema.parse(pharmacyId);

  const pharmacyArr = await db
    .select()
    .from(pharmacies)
    .where(eq(pharmacies.id, pharmacyId));

  const pharmacy = pharmacyArr[0];
  if (pharmacy) {
    return {
      id: pharmacy.id,
      name: pharmacy.name,
      address: pharmacy.address ?? undefined,
      createdAt: pharmacy.createdAt ?? undefined,
    };
  }

  return null;
};

// Process a sale transaction
export const processSale = async (
  cartItems: Array<{
    productId: number;
    quantity: number;
    unitPrice: string;
  }>,
  paymentMethod: 'CASH',
  discount: number,
  pharmacyId: number,
  userId: string,
  cashReceived: number = 0,
) => {
  try {
    // Validate all parameters with Zod
    const validatedData = processSaleSchema.parse({
      cartItems,
      paymentMethod,
      discount,
      pharmacyId,
      userId,
      cashReceived,
    });

    const totalAmount = validatedData.cartItems.reduce(
      (total, item) => total + parseFloat(item.unitPrice) * item.quantity,
      0,
    );

    const discountedTotal = totalAmount - validatedData.discount;
    const change = validatedData.cashReceived - discountedTotal;

    if (validatedData.cashReceived < discountedTotal) {
      throw new Error('Insufficient cash received');
    }

    const result = await db.transaction(async (tx) => {
      const transitionNotices: Array<{
        type: 'LOW_STOCK' | 'OUT_OF_STOCK';
        productId: number;
        message: string;
      }> = [];
      // 1. Validate and fetch product stocks
      const validatedProducts: ProductRow[] = (await Promise.all(
        validatedData.cartItems.map(async (item) => {
          const found = await tx
            .select()
            .from(products)
            .where(
              and(
                eq(products.id, item.productId),
                eq(products.pharmacyId, validatedData.pharmacyId),
                sql`${products.deletedAt} IS NULL`,
              ),
            );

          const product = found[0] as ProductRow;
          if (!product) {
            throw new Error(`Product ${item.productId} not found`);
          }

          if (product.quantity < item.quantity) {
            throw new Error(
              `Insufficient stock for ${product.name} (Requested: ${item.quantity}, Available: ${product.quantity})`,
            );
          }

          return product as ProductRow;
        }),
      )) as ProductRow[];

      // 2. Insert into sales table
      const [newSale] = await tx
        .insert(sales)
        .values({
          invoiceNumber: `INV-${Date.now()}`,
          totalAmount: totalAmount.toFixed(2),
          discount: validatedData.discount.toFixed(2),
          paymentMethod: validatedData.paymentMethod,
          amountReceived: validatedData.cashReceived.toFixed(2),
          changeDue: Math.max(0, change).toFixed(2),
          userId: validatedData.userId,
          pharmacyId: validatedData.pharmacyId,
        })
        .returning();

      // 3. Insert sale items and update product stock
      for (const item of validatedData.cartItems) {
        const product = validatedProducts.find((p) => p.id === item.productId)!;
        const prevQty: number = product.quantity as number;
        const newQty: number = prevQty - item.quantity;
        const minLevel: number = (product.minStockLevel as number) ?? 10;
        const label = `${product.name}${
          product.brandName ? ` (${product.brandName})` : ''
        }`;

        await tx.insert(saleItems).values({
          saleId: newSale.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: (parseFloat(item.unitPrice) * item.quantity).toFixed(2),
        });

        await tx
          .update(products)
          .set({
            quantity: product.quantity - item.quantity,
          })
          .where(
            and(
              eq(products.id, item.productId),
              eq(products.pharmacyId, validatedData.pharmacyId),
            ),
          );

        // Determine threshold crossings for targeted notifications
        if (prevQty > 0 && newQty <= 0) {
          transitionNotices.push({
            type: 'OUT_OF_STOCK',
            productId: item.productId,
            message: `${label} is out of stock.`,
          });
        } else if (prevQty > minLevel && newQty <= minLevel) {
          transitionNotices.push({
            type: 'LOW_STOCK',
            productId: item.productId,
            message: `${label} is low on stock.`,
          });
        }
      }

      return {
        sale: newSale,
        change,
        transitionNotices,
      };
    });

    // Create targeted notifications for threshold crossings (with 24h dedupe)
    try {
      const recentCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      for (const n of result.transitionNotices) {
        try {
          const recent = await db
            .select({ id: notifications.id })
            .from(notifications)
            .where(
              and(
                eq(notifications.pharmacyId, validatedData.pharmacyId),
                eq(notifications.productId, n.productId),
                eq(notifications.type, n.type),
                gt(notifications.createdAt, recentCutoff),
              ),
            )
            .limit(1);

          if (recent.length === 0) {
            await db.insert(notifications).values({
              type: n.type,
              productId: n.productId,
              message: n.message,
              pharmacyId: validatedData.pharmacyId,
              isRead: false,
            });
          }
        } catch (innerErr) {
          console.error(
            'Non-fatal: failed to create sale notification',
            innerErr,
          );
        }
      }
    } catch (err) {
      console.error('Non-fatal: error during sale notifications dispatch', err);
    }

    // Note: we intentionally do NOT call a full inventory sync here to avoid
    // re-creating notifications immediately after user deletes/marks them.
    // Targeted notifications for threshold crossings were already inserted above with 24h dedupe.

    // Revalidate inventory and POS pages
    revalidatePath('/sales/pos');
    revalidatePath('/products');

    // Activity log
    await logActivity({
      action: 'SALE_COMPLETED',
      pharmacyId: validatedData.pharmacyId,
      details: {
        id: result.sale.id,
        invoiceNumber: result.sale.invoiceNumber,
        totalAmount: result.sale.totalAmount,
        discount: result.sale.discount,
        paymentMethod: result.sale.paymentMethod,
      },
    });

    return {
      success: true,
      data: result.sale,
      change: result.change,
      message: 'Sale processed successfully',
    };
  } catch (error) {
    console.error('Error processing sale:', error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : 'Failed to process sale',
    };
  }
};
