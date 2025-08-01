'use server';

import { db } from '@/database/drizzle';
import { products, saleItems, sales, pharmacies } from '@/database/schema';
import type { Pharmacy } from '@/types';
import { eq, and, gte } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

// Get all products for POS
// export const getAllProductsPOS = async (
//   pharmacyId: number,
//   page: number = 1,
//   pageSize: number = 20,
// ) => {
//   try {
//     const offset = (page - 1) * pageSize;
//     // Use UTC date string for DB comparison
//     const today = new Date();
//     const todayStr = today.toISOString().slice(0, 10); // 'YYYY-MM-DD'

//     const result = await db
//       .select({
//         id: products.id,
//         name: products.name,
//         barcode: products.barcode,
//         sellingPrice: products.sellingPrice,
//         quantity: products.quantity,
//         expiryDate: products.expiryDate,
//         lotNumber: products.lotNumber,
//         brandName: products.brandName,
//         genericName: products.genericName,
//       })
//       .from(products)
//       .where(
//         and(
//           eq(products.pharmacyId, pharmacyId),
//           gte(products.expiryDate, todayStr), // Exclude expired products
//         ),
//       )
//       .orderBy(products.name)
//       .limit(pageSize)
//       .offset(offset);

//     return result;
//   } catch (error) {
//     console.error('Error fetching POS products:', error);
//     return [];
//   }
// };

export const getAllProductsPOS = async (pharmacyId: number) => {
  try {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10); // 'YYYY-MM-DD'

    const result = await db
      .select({
        id: products.id,
        name: products.name,
        barcode: products.barcode,
        sellingPrice: products.sellingPrice,
        quantity: products.quantity,
        expiryDate: products.expiryDate,
        lotNumber: products.lotNumber,
        brandName: products.brandName,
        genericName: products.genericName,
      })
      .from(products)
      .orderBy(products.name, products.expiryDate)
      .where(
        and(
          eq(products.pharmacyId, pharmacyId),
          gte(products.expiryDate, todayStr), // Exclude expired products
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
    const totalAmount = cartItems.reduce(
      (total, item) => total + parseFloat(item.unitPrice) * item.quantity,
      0,
    );

    const discountedTotal = totalAmount - discount;
    const change = cashReceived - discountedTotal;

    if (cashReceived < discountedTotal) {
      throw new Error('Insufficient cash received');
    }

    const result = await db.transaction(async (tx) => {
      // 1. Validate and fetch product stocks
      const validatedProducts = await Promise.all(
        cartItems.map(async (item) => {
          const found = await tx
            .select()
            .from(products)
            .where(
              and(
                eq(products.id, item.productId),
                eq(products.pharmacyId, pharmacyId),
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
          discount: discount.toFixed(2),
          paymentMethod,
          amountReceived: cashReceived.toFixed(2),
          changeDue: Math.max(0, change).toFixed(2),
          userId,
          pharmacyId,
        })
        .returning();

      // 3. Insert sale items and update product stock
      for (const item of cartItems) {
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
              eq(products.pharmacyId, pharmacyId),
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
