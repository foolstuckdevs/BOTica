'use server';

import { db } from '@/database/drizzle';
import { products, saleItems, sales } from '@/database/schema';
import { eq, and, gte, lte, sum, desc } from 'drizzle-orm';
import {
  getSalesComparisonSchema,
  getProductStockSummariesSchema,
  getTopSellingProductsSchema,
  getLowStockProductsSchema,
} from '@/lib/validations';

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
  try {
    // Validate input with Zod
    const validatedData = getSalesComparisonSchema.parse({ pharmacyId });

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
      getSalesTotalForRange(validatedData.pharmacyId, startOfToday, endOfToday),
      getSalesTotalForRange(
        validatedData.pharmacyId,
        startOfYesterday,
        endOfYesterday,
      ),
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
  } catch (error) {
    console.error('Error getting sales comparison:', error);
    return {
      todaysSales: 0,
      yesterdaysSales: 0,
      percentageChange: 0,
      trend: 'equal' as const,
    };
  }
};

export const getProductStockSummaries = async (pharmacyId: number) => {
  try {
    // Validate input with Zod
    const validatedData = getProductStockSummariesSchema.parse({ pharmacyId });

    return await db
      .select({
        id: products.id,
        expiryDate: products.expiryDate,
        quantity: products.quantity,
        minStockLevel: products.minStockLevel,
      })
      .from(products)
      .where(eq(products.pharmacyId, validatedData.pharmacyId));
  } catch (error) {
    console.error('Error fetching product summaries:', error);
    return [];
  }
};

export const getTopSellingProducts = async (
  pharmacyId: number,
  limit: number = 5,
) => {
  try {
    // Validate input with Zod
    const validatedData = getTopSellingProductsSchema.parse({
      pharmacyId,
      limit,
    });

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
          eq(sales.pharmacyId, validatedData.pharmacyId),
          gte(sales.createdAt, startOfMonth),
          lte(sales.createdAt, endOfMonth),
        ),
      )
      .groupBy(saleItems.productId, products.name)
      .orderBy(desc(sum(saleItems.quantity)))
      .limit(validatedData.limit);

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
        percentage: totalUnits
          ? Math.round((sales / totalUnits) * 1000) / 10
          : 0,
        color: undefined,
      };
    });
  } catch (error) {
    console.error('Error getting top selling products:', error);
    return [];
  }
};

export const getLowStockProducts = async (
  pharmacyId: number,
  limit: number = 10,
) => {
  try {
    // Validate input with Zod
    const validatedData = getLowStockProductsSchema.parse({
      pharmacyId,
      limit,
    });

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
          eq(products.pharmacyId, validatedData.pharmacyId),
          // Only show products where current stock <= minimum stock level AND quantity > 0
          lte(products.quantity, products.minStockLevel),
          gte(products.quantity, 0),
        ),
      )
      .orderBy(products.quantity) // Show lowest stock first
      .limit(validatedData.limit);

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
