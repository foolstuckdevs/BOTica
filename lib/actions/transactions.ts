// lib/actions/transactions.ts
'use server';

import { db } from '@/database/drizzle';
import { and, eq, like, desc } from 'drizzle-orm';
import { sales, saleItems, products, users } from '@/database/schema';
import { revalidatePath } from 'next/cache';

export const getTransactions = async (pharmacyId: number, searchTerm?: string) => {
  try {
    return await db
      .select({
        id: sales.id,
        invoiceNumber: sales.invoiceNumber,
        totalAmount: sales.totalAmount,
        discount: sales.discount,
        paymentMethod: sales.paymentMethod,
        createdAt: sales.createdAt,
        user: {
          id: users.id,
          fullName: users.fullName,
        },
        items: {
          id: saleItems.id,
          productName: products.name,
          quantity: saleItems.quantity,
          unitPrice: saleItems.unitPrice,
          subtotal: saleItems.subtotal,
        },
      })
      .from(sales)
      .where(
        and(
          eq(sales.pharmacyId, pharmacyId),
          searchTerm ? like(sales.invoiceNumber, `%${searchTerm}%`) : undefined
        )
      )
      .leftJoin(users, eq(sales.userId, users.id))
      .leftJoin(saleItems, eq(sales.id, saleItems.saleId))
      .leftJoin(products, eq(saleItems.productId, products.id))
      .orderBy(desc(sales.createdAt));
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }
};