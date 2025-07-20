// lib/actions/sales.ts
'use server';

import { db } from '@/database/drizzle';
import { eq, and } from 'drizzle-orm';
import { products, sales, saleItems } from '@/database/schema';
import { revalidatePath } from 'next/cache';

export const processSale = async (
  cartItems: Array<{
    productId: number;
    quantity: number;
    unitPrice: string;
  }>,
  paymentMethod: 'CASH' | 'GCASH',
  discount: number,
  pharmacyId: number,
  userId: string,
  cashReceived: number = 0
) => {
  try {
    // Calculate total amount
    const totalAmount = cartItems.reduce(
      (total, item) => total + parseFloat(item.unitPrice) * item.quantity,
      0
    );
    
    const discountedTotal = totalAmount - discount;
    const change = paymentMethod === 'CASH' ? cashReceived - discountedTotal : 0;

    // Validate cash payment
    if (paymentMethod === 'CASH' && cashReceived < discountedTotal) {
      throw new Error('Insufficient cash received');
    }

    // 1. Validate all products and quantities
    const productValidations = await Promise.all(
      cartItems.map(async (item) => {
        const product = await db
          .select()
          .from(products)
          .where(
            and(
              eq(products.id, item.productId),
              eq(products.pharmacyId, pharmacyId)
            )
          )
          .execute();

        if (product.length === 0) {
          throw new Error(`Product ${item.productId} not found`);
        }

        if (product[0].quantity < item.quantity) {
          throw new Error(
            `Insufficient stock for ${product[0].name} (Requested: ${item.quantity}, Available: ${product[0].quantity})`
          );
        }

        return product[0];
      })
    );

    // 2. Create the sale record
    const newSale = await db.insert(sales).values({
      invoiceNumber: `INV-${Date.now()}`,
      totalAmount: totalAmount,
      discount,
      paymentMethod,
      cashReceived: paymentMethod === 'CASH' ? cashReceived.toString() : '0',
      change: paymentMethod === 'CASH' ? Math.max(0, change).toString() : '0',
      userId,
      pharmacyId,
    }).returning();

    // 3. Create sale items and update product quantities
    await Promise.all(
      cartItems.map(async (item) => {
        // Create sale item
        await db.insert(saleItems).values({
          saleId: newSale[0].id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: (parseFloat(item.unitPrice) * item.quantity).toString(),
        });

        // Update product quantity
        await db
          .update(products)
          .set({
            quantity: productValidations.find(p => p.id === item.productId)!.quantity - item.quantity,
          })
          .where(
            and(
              eq(products.id, item.productId),
              eq(products.pharmacyId, pharmacyId)
            )
          );
      })
    );

    revalidatePath('/sales/pos');
    revalidatePath('/products');
    
    return {
      success: true,
      data: newSale[0],
      change,
      message: 'Sale processed successfully',
    };
  } catch (error) {
    console.error('Error processing sale:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to process sale',
    };
  }
};