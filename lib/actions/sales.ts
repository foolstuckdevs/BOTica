'use server';

import { db } from '@/database/drizzle';
import { products, saleItems, sales, pharmacies } from '@/database/schema';
import type { Pharmacy } from '@/types';
import { eq, and, gte, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { logActivity } from '@/lib/actions/activity';
import { processSaleSchema, pharmacyIdSchema } from '@/lib/validations';

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
      // 1. Validate and fetch product stocks
      const validatedProducts = await Promise.all(
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

          const product = found[0];
          if (!product) {
            throw new Error(`Product ${item.productId} not found`);
          }

          if (product.quantity < item.quantity) {
            throw new Error(
              `Insufficient stock for ${product.name} (Requested: ${item.quantity}, Available: ${product.quantity})`,
            );
          }

          return product;
        }),
      );

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
      }

      return {
        sale: newSale,
        change,
      };
    });

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
