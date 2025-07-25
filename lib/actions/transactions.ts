'use server';

import { db } from '@/database/drizzle';
import { eq, and, like, desc, inArray } from 'drizzle-orm';
import { sales, saleItems, products, users } from '@/database/schema';
import { Transaction } from '@/types';

export const getTransactions = async (
  pharmacyId: number,
  searchTerm?: string,
): Promise<Transaction[]> => {
  try {
    // 1. Get sales with user info
    const salesList = await db
      .select({
        id: sales.id,
        invoiceNumber: sales.invoiceNumber,
        totalAmount: sales.totalAmount,
        discount: sales.discount,
        paymentMethod: sales.paymentMethod,
        createdAt: sales.createdAt,
        userId: users.id,
        fullName: users.fullName,
      })
      .from(sales)
      .leftJoin(users, eq(sales.userId, users.id))
      .where(
        and(
          eq(sales.pharmacyId, pharmacyId),
          searchTerm ? like(sales.invoiceNumber, `%${searchTerm}%`) : undefined,
        ),
      )
      .orderBy(desc(sales.createdAt));

    const saleIds = salesList.map((s) => s.id);

    // 2. Get related sale items
    const items = await db
      .select({
        id: saleItems.id,
        saleId: saleItems.saleId,
        productName: products.name,
        quantity: saleItems.quantity,
        unitPrice: saleItems.unitPrice,
        subtotal: saleItems.subtotal,
      })
      .from(saleItems)
      .leftJoin(products, eq(saleItems.productId, products.id))
      .where(inArray(saleItems.saleId, saleIds));

    // 3. Group sale items by saleId
    const groupedItems = saleIds.reduce((acc, id) => {
      acc[id] = items
        .filter((item) => item.saleId === id)
        .map((i) => ({
          id: i.id,
          productName: i.productName ?? '',
          quantity: i.quantity ?? 0,
          unitPrice: i.unitPrice ?? '0.00',
          subtotal: i.subtotal ?? '0.00',
        }));
      return acc;
    }, {} as Record<number, Transaction['items']>);

    // 4. Build Transaction[] using your global interface
    const transactions: Transaction[] = salesList.map((s) => ({
      id: s.id,
      invoiceNumber: s.invoiceNumber ?? '',
      totalAmount: s.totalAmount ?? '0.00',
      discount: s.discount ?? '0.00',
      paymentMethod: s.paymentMethod ?? 'CASH',
      createdAt: s.createdAt ?? new Date(),
      user: {
        id: typeof s.userId === 'number' ? s.userId : undefined,
        fullName: s.fullName ?? '',
      },
      items: groupedItems[s.id] ?? [],
    }));

    return transactions;
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }
};
