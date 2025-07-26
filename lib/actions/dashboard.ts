'use server';

import { db } from '@/database/drizzle';
import { products, saleItems, sales } from '@/database/schema';
import { eq, and, gte, lte, sum, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

// Helper: Get total sales within a date range
const getSalesTotalForRange = async (
  pharmacyId: number,
  start: Date,
  end: Date,
): Promise<number> => {
  const result = await db
    .select({ total: sum(sales.totalAmount).as('total') })
    .from(sales)
    .where(
      and(
        eq(sales.pharmacyId, pharmacyId),
        gte(sales.createdAt, start),
        lte(sales.createdAt, end),
      ),
    );

  return Number(result[0]?.total) || 0;
};

// Main function: Compare today vs yesterday
export const getSalesComparison = async (
  pharmacyId: number,
): Promise<{
  todaysSales: number;
  yesterdaysSales: number;
  percentageChange: number;
  trend: 'up' | 'down' | 'equal';
}> => {
  const now = new Date();

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0,
  );
  const endOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  );

  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const endOfYesterday = new Date(
    startOfYesterday.getFullYear(),
    startOfYesterday.getMonth(),
    startOfYesterday.getDate(),
    23,
    59,
    59,
    999,
  );

  // Fetch both totals in parallel
  const [todaysSales, yesterdaysSales] = await Promise.all([
    getSalesTotalForRange(pharmacyId, startOfToday, endOfToday),
    getSalesTotalForRange(pharmacyId, startOfYesterday, endOfYesterday),
  ]);

  // Calculate % change
  const percentageChange =
    yesterdaysSales === 0
      ? todaysSales > 0
        ? 100
        : 0
      : ((todaysSales - yesterdaysSales) / yesterdaysSales) * 100;

  return {
    todaysSales: Number(todaysSales.toFixed(2)),
    yesterdaysSales: Number(yesterdaysSales.toFixed(2)),
    percentageChange: Math.round(percentageChange * 10) / 10,
    trend:
      todaysSales > yesterdaysSales
        ? ('up' as const)
        : todaysSales < yesterdaysSales
        ? ('down' as const)
        : ('equal' as const),
  };
};

export const getProductStockSummaries = async (pharmacyId: number) => {
  try {
    return await db
      .select({
        id: products.id,
        expiryDate: products.expiryDate,
        quantity: products.quantity,
        minStockLevel: products.minStockLevel,
      })
      .from(products)
      .where(eq(products.pharmacyId, pharmacyId));
  } catch (error) {
    console.error('Error fetching product summaries:', error);
    return [];
  }
};

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

export const getTopSellingProducts = async (
  pharmacyId: number,
  limit: number = 5,
) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );

  const result = await db
    .select({
      productId: saleItems.productId,
      name: products.name,
      totalSales: sum(saleItems.quantity).as('totalSales'),
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .innerJoin(products, eq(saleItems.productId, products.id))
    .where(
      and(
        eq(sales.pharmacyId, pharmacyId),
        gte(sales.createdAt, startOfMonth),
        lte(sales.createdAt, endOfMonth),
      ),
    )
    .groupBy(saleItems.productId, products.name)
    .orderBy(desc(sum(saleItems.quantity)))
    .limit(limit);

  // Total quantity for percentage calculation
  const totalUnits = result.reduce((sum, p) => {
    const quantity = Number(p.totalSales) || 0;
    return sum + quantity;
  }, 0);

  return result.map((p) => {
    const sales = Number(p.totalSales) || 0;
    return {
      name: p.name,
      sales,
      percentage: totalUnits ? Math.round((sales / totalUnits) * 1000) / 10 : 0,
      color: undefined,
    };
  });
};

export const getLowStockProducts = async (
  pharmacyId: number,
  limit: number = 10,
) => {
  try {
    const result = await db
      .select({
        id: products.id,
        name: products.name,
        genericName: products.genericName,
        quantity: products.quantity,
        minStockLevel: products.minStockLevel,
        dosageForm: products.dosageForm,
      })
      .from(products)
      .where(
        and(
          eq(products.pharmacyId, pharmacyId),
          // Only show products where current stock <= minimum stock level AND quantity > 0
          lte(products.quantity, products.minStockLevel),
          gte(products.quantity, 0),
        ),
      )
      .orderBy(products.quantity) // Show lowest stock first
      .limit(limit);

    return result.map((product) => ({
      id: product.id,
      product: product.name,
      genericName: product.genericName,
      currentStock: product.quantity,
      minThreshold: product.minStockLevel,
      category: product.dosageForm, // Using dosageForm as category for now
    }));
  } catch (error) {
    console.error('Error fetching low stock products:', error);
    return [];
  }
};
