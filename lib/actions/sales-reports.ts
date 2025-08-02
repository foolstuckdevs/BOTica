'use server';

import { db } from '@/database/drizzle';
import { sales, saleItems, products, categories } from '@/database/schema';
import { eq, and, gte, lte, sum, count, sql, desc } from 'drizzle-orm';
import {
  getSalesOverviewSchema,
  getSalesReportsComparisonSchema,
  getProductPerformanceSchema,
  getBatchProfitDataSchema,
  getBatchProfitSummarySchema,
} from '@/lib/validations';
import {
  PeriodType,
  SalesOverviewData,
  SalesComparisonData,
  ProductPerformanceData,
  BatchProfitData,
} from '@/types';

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

    case 'quarter':
      // Current quarter
      const currentQuarter = Math.floor(now.getMonth() / 3);
      currentStart = new Date(
        now.getFullYear(),
        currentQuarter * 3,
        1,
        0,
        0,
        0,
        0,
      );
      currentEnd = new Date(
        now.getFullYear(),
        currentQuarter * 3 + 3,
        0,
        23,
        59,
        59,
        999,
      );

      // Previous quarter
      const prevQuarter = currentQuarter - 1;
      const prevYear =
        prevQuarter < 0 ? now.getFullYear() - 1 : now.getFullYear();
      const adjustedPrevQuarter = prevQuarter < 0 ? 3 : prevQuarter;

      previousStart = new Date(
        prevYear,
        adjustedPrevQuarter * 3,
        1,
        0,
        0,
        0,
        0,
      );
      previousEnd = new Date(
        prevYear,
        adjustedPrevQuarter * 3 + 3,
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
  period: PeriodType = 'month',
): Promise<SalesOverviewData> => {
  try {
    // Validate input with Zod
    const validatedData = getSalesOverviewSchema.parse({ pharmacyId, period });

    const { currentStart, currentEnd } = getDateRanges(validatedData.period);
    return getSalesDataForRange(
      validatedData.pharmacyId,
      currentStart,
      currentEnd,
    );
  } catch (error) {
    console.error('Error getting sales overview:', error);
    return {
      totalSales: 0,
      totalCost: 0,
      profit: 0,
      transactions: 0,
      totalItems: 0,
    };
  }
};

// Function to get sales comparison (current vs previous period)
export const getSalesComparison = async (
  pharmacyId: number,
  period: PeriodType,
): Promise<SalesComparisonData> => {
  try {
    // Validate input with Zod
    const validatedData = getSalesReportsComparisonSchema.parse({
      pharmacyId,
      period,
    });

    const { currentStart, currentEnd, previousStart, previousEnd } =
      getDateRanges(validatedData.period);

    const [current, previous] = await Promise.all([
      getSalesDataForRange(validatedData.pharmacyId, currentStart, currentEnd),
      getSalesDataForRange(
        validatedData.pharmacyId,
        previousStart,
        previousEnd,
      ),
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
  } catch (error) {
    console.error('Error getting sales comparison:', error);
    // Return fallback data in case of error
    return {
      current: {
        totalSales: 0,
        totalCost: 0,
        profit: 0,
        transactions: 0,
        totalItems: 0,
      },
      previous: {
        totalSales: 0,
        totalCost: 0,
        profit: 0,
        transactions: 0,
        totalItems: 0,
      },
      salesGrowth: 0,
      profitGrowth: 0,
      transactionGrowth: 0,
    };
  }
};

// Get product performance data for a specific period
export const getProductPerformance = async (
  pharmacyId: number,
  period: PeriodType,
): Promise<ProductPerformanceData[]> => {
  try {
    // Validate input with Zod
    const validatedData = getProductPerformanceSchema.parse({
      pharmacyId,
      period,
    });

    const { currentStart, currentEnd } = getDateRanges(validatedData.period);

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
          eq(sales.pharmacyId, validatedData.pharmacyId),
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

// Batch Profit Functions
export async function getBatchProfitData(
  pharmacyId: number,
  period: PeriodType = 'month',
): Promise<BatchProfitData[]> {
  try {
    // Validate input with Zod
    const validatedData = getBatchProfitDataSchema.parse({
      pharmacyId,
      period,
    });

    const { currentStart: startDate, currentEnd: endDate } = getDateRanges(
      validatedData.period,
    );

    // Query to get batch profit data
    const result = await db
      .select({
        productId: products.id,
        productName: products.name,
        batch: products.lotNumber,
        expiry: products.expiryDate,
        costPrice: products.costPrice,
        sellingPrice: products.sellingPrice,
        currentQuantity: products.quantity,
        qtySold: sum(saleItems.quantity),
        totalRevenue: sum(saleItems.subtotal),
      })
      .from(saleItems)
      .innerJoin(products, eq(saleItems.productId, products.id))
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .where(
        and(
          eq(products.pharmacyId, validatedData.pharmacyId),
          gte(sales.createdAt, startDate),
          lte(sales.createdAt, endDate),
        ),
      )
      .groupBy(
        products.id,
        products.name,
        products.lotNumber,
        products.expiryDate,
        products.costPrice,
        products.sellingPrice,
        products.quantity,
      )
      .orderBy(desc(sum(saleItems.subtotal)));

    // Transform the data to match our interface
    const batchData: BatchProfitData[] = result.map((row) => {
      const qtySold = Number(row.qtySold) || 0;
      const revenue = Number(row.totalRevenue) || 0;
      const costPrice = Number(row.costPrice) || 0;
      const cost = qtySold * costPrice;
      const profit = revenue - cost;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

      return {
        id: `${row.productId}-${row.batch}`,
        productName: row.productName,
        batch: row.batch || 'N/A',
        expiry: row.expiry || 'N/A',
        qtySold,
        qtyRemaining: Number(row.currentQuantity) || 0,
        cost,
        revenue,
        profit,
        margin,
      };
    });

    return batchData;
  } catch (error) {
    console.error('Error fetching batch profit data:', error);
    return [];
  }
}

export async function getBatchProfitSummary(
  pharmacyId: number,
  period: PeriodType = 'month',
) {
  try {
    // Validate input with Zod
    const validatedData = getBatchProfitSummarySchema.parse({
      pharmacyId,
      period,
    });

    const batchData = await getBatchProfitData(
      validatedData.pharmacyId,
      validatedData.period,
    );

    const summary = {
      totalRevenue: batchData.reduce((sum, item) => sum + item.revenue, 0),
      totalCost: batchData.reduce((sum, item) => sum + item.cost, 0),
      totalProfit: batchData.reduce((sum, item) => sum + item.profit, 0),
      totalBatches: batchData.length,
      avgMargin: 0,
    };

    summary.avgMargin =
      summary.totalRevenue > 0
        ? (summary.totalProfit / summary.totalRevenue) * 100
        : 0;

    return summary;
  } catch (error) {
    console.error('Error fetching batch profit summary:', error);
    return {
      totalRevenue: 0,
      totalCost: 0,
      totalProfit: 0,
      totalBatches: 0,
      avgMargin: 0,
    };
  }
}
