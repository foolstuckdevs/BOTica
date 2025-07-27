'use server';

import { db } from '@/database/drizzle';
import { sales, saleItems, products, categories } from '@/database/schema';
import { eq, and, gte, lte, sum, count, sql, desc } from 'drizzle-orm';

export type PeriodType = 'today' | 'yesterday' | 'week' | 'month';

export interface SalesOverviewData {
  totalSales: number;
  totalCost: number;
  profit: number;
  transactions: number;
  totalItems: number;
}

export interface SalesComparisonData {
  current: SalesOverviewData;
  previous: SalesOverviewData;
  salesGrowth: number;
  profitGrowth: number;
  transactionGrowth: number;
}

export interface ProductPerformanceData {
  name: string;
  category: string;
  quantity: number;
  revenue: number;
  profit: number;
}

// Helper function to get date ranges for different periods
const getDateRanges = (period: PeriodType) => {
  const now = new Date();
  let currentStart: Date,
    currentEnd: Date,
    previousStart: Date,
    previousEnd: Date;

  switch (period) {
    case 'today':
      currentStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0,
        0,
        0,
        0,
      );
      currentEnd = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999,
      );

      previousStart = new Date(currentStart);
      previousStart.setDate(previousStart.getDate() - 1);
      previousEnd = new Date(currentEnd);
      previousEnd.setDate(previousEnd.getDate() - 1);
      break;

    case 'yesterday':
      // Yesterday's full day
      currentStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 1,
        0,
        0,
        0,
        0,
      );
      currentEnd = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 1,
        23,
        59,
        59,
        999,
      );

      // Previous day (day before yesterday)
      previousStart = new Date(currentStart);
      previousStart.setDate(previousStart.getDate() - 1);
      previousEnd = new Date(currentEnd);
      previousEnd.setDate(previousEnd.getDate() - 1);
      break;

    case 'week':
      // Current week (Monday to Sunday)
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
      startOfWeek.setHours(0, 0, 0, 0);

      currentStart = startOfWeek;
      currentEnd = new Date(startOfWeek);
      currentEnd.setDate(currentEnd.getDate() + 6); // Sunday
      currentEnd.setHours(23, 59, 59, 999);

      // Previous week
      previousStart = new Date(currentStart);
      previousStart.setDate(previousStart.getDate() - 7);
      previousEnd = new Date(currentEnd);
      previousEnd.setDate(previousEnd.getDate() - 7);
      break;

    case 'month':
      // Current month
      currentStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      currentEnd = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );

      // Previous month
      previousStart = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1,
        0,
        0,
        0,
        0,
      );
      previousEnd = new Date(
        now.getFullYear(),
        now.getMonth(),
        0,
        23,
        59,
        59,
        999,
      );
      break;

    default:
      throw new Error('Invalid period type');
  }

  return { currentStart, currentEnd, previousStart, previousEnd };
};

// Get sales overview data for a specific date range
const getSalesDataForRange = async (
  pharmacyId: number,
  startDate: Date,
  endDate: Date,
): Promise<SalesOverviewData> => {
  try {
    // Get sales totals and transaction count
    const salesResult = await db
      .select({
        totalSales: sum(sales.totalAmount),
        transactions: count(sales.id),
      })
      .from(sales)
      .where(
        and(
          eq(sales.pharmacyId, pharmacyId),
          gte(sales.createdAt, startDate),
          lte(sales.createdAt, endDate),
        ),
      );

    // Get total items sold and cost calculation
    const itemsResult = await db
      .select({
        totalItems: sum(saleItems.quantity),
        totalCost: sum(products.costPrice), // This is an approximation
      })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .innerJoin(products, eq(saleItems.productId, products.id))
      .where(
        and(
          eq(sales.pharmacyId, pharmacyId),
          gte(sales.createdAt, startDate),
          lte(sales.createdAt, endDate),
        ),
      );

    const totalSales = Number(salesResult[0]?.totalSales) || 0;
    const transactions = Number(salesResult[0]?.transactions) || 0;
    const totalItems = Number(itemsResult[0]?.totalItems) || 0;

    // Calculate total cost by getting actual cost for items sold
    const costCalculation = await db
      .select({
        totalCost: sum(
          sql`CAST(${products.costPrice} AS NUMERIC) * ${saleItems.quantity}`,
        ),
      })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .innerJoin(products, eq(saleItems.productId, products.id))
      .where(
        and(
          eq(sales.pharmacyId, pharmacyId),
          gte(sales.createdAt, startDate),
          lte(sales.createdAt, endDate),
        ),
      );

    const totalCost = Number(costCalculation[0]?.totalCost) || 0;
    const profit = totalSales - totalCost;

    return {
      totalSales: Number(totalSales.toFixed(2)),
      totalCost: Number(totalCost.toFixed(2)),
      profit: Number(profit.toFixed(2)),
      transactions,
      totalItems,
    };
  } catch (error) {
    console.error('Error fetching sales data:', error);
    return {
      totalSales: 0,
      totalCost: 0,
      profit: 0,
      transactions: 0,
      totalItems: 0,
    };
  }
};

// Main function to get sales overview for a specific period
export const getSalesOverview = async (
  pharmacyId: number,
  period: PeriodType,
): Promise<SalesOverviewData> => {
  const { currentStart, currentEnd } = getDateRanges(period);
  return getSalesDataForRange(pharmacyId, currentStart, currentEnd);
};

// Function to get sales comparison (current vs previous period)
export const getSalesComparison = async (
  pharmacyId: number,
  period: PeriodType,
): Promise<SalesComparisonData> => {
  const { currentStart, currentEnd, previousStart, previousEnd } =
    getDateRanges(period);

  const [current, previous] = await Promise.all([
    getSalesDataForRange(pharmacyId, currentStart, currentEnd),
    getSalesDataForRange(pharmacyId, previousStart, previousEnd),
  ]);

  // Calculate growth percentages
  const salesGrowth =
    previous.totalSales === 0
      ? current.totalSales > 0
        ? 100
        : 0
      : ((current.totalSales - previous.totalSales) / previous.totalSales) *
        100;

  const profitGrowth =
    previous.profit === 0
      ? current.profit > 0
        ? 100
        : 0
      : ((current.profit - previous.profit) / previous.profit) * 100;

  const transactionGrowth =
    previous.transactions === 0
      ? current.transactions > 0
        ? 100
        : 0
      : ((current.transactions - previous.transactions) /
          previous.transactions) *
        100;

  return {
    current,
    previous,
    salesGrowth: Number(salesGrowth.toFixed(1)),
    profitGrowth: Number(profitGrowth.toFixed(1)),
    transactionGrowth: Number(transactionGrowth.toFixed(1)),
  };
};

// Get product performance data for a specific period
export const getProductPerformance = async (
  pharmacyId: number,
  period: PeriodType,
): Promise<ProductPerformanceData[]> => {
  try {
    const { currentStart, currentEnd } = getDateRanges(period);

    const result = await db
      .select({
        productId: saleItems.productId,
        name: products.name,
        categoryName: categories.name,
        totalQuantity: sum(saleItems.quantity),
        totalRevenue: sum(saleItems.subtotal),
        costPrice: products.costPrice,
      })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .innerJoin(products, eq(saleItems.productId, products.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(
        and(
          eq(sales.pharmacyId, pharmacyId),
          gte(sales.createdAt, currentStart),
          lte(sales.createdAt, currentEnd),
        ),
      )
      .groupBy(
        saleItems.productId,
        products.name,
        categories.name,
        products.costPrice,
      )
      .orderBy(desc(sum(saleItems.quantity)));

    return result.map((item) => {
      const quantity = Number(item.totalQuantity) || 0;
      const revenue = Number(item.totalRevenue) || 0;
      const costPrice = Number(item.costPrice) || 0;
      const totalCost = costPrice * quantity;
      const profit = revenue - totalCost;

      return {
        name: item.name,
        category: item.categoryName || 'Uncategorized',
        quantity,
        revenue: Number(revenue.toFixed(2)),
        profit: Number(profit.toFixed(2)),
      };
    });
  } catch (error) {
    console.error('Error fetching product performance data:', error);
    return [];
  }
};
