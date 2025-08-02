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

// Helper function to get date ranges for different periods using Philippines timezone (UTC+8)
const getDateRanges = (period: PeriodType) => {
  const now = new Date();
  // Convert to Philippines time (UTC+8)
  const philippinesOffset = 8 * 60; // 8 hours in minutes
  const localTime = new Date(now.getTime() + (philippinesOffset * 60 * 1000));
  
  let currentStart: Date,
    currentEnd: Date,
    previousStart: Date,
    previousEnd: Date;

  switch (period) {
    case 'today':
      // Today in Philippines timezone
      currentStart = new Date(Date.UTC(
        localTime.getUTCFullYear(),
        localTime.getUTCMonth(),
        localTime.getUTCDate(),
        0, 0, 0, 0
      ));
      // Convert back to UTC for database query
      currentStart.setTime(currentStart.getTime() - (philippinesOffset * 60 * 1000));
      
      currentEnd = new Date(Date.UTC(
        localTime.getUTCFullYear(),
        localTime.getUTCMonth(),
        localTime.getUTCDate(),
        23, 59, 59, 999
      ));
      // Convert back to UTC for database query
      currentEnd.setTime(currentEnd.getTime() - (philippinesOffset * 60 * 1000));

      // Yesterday in Philippines timezone
      const yesterdayLocal = new Date(localTime);
      yesterdayLocal.setUTCDate(yesterdayLocal.getUTCDate() - 1);
      
      previousStart = new Date(Date.UTC(
        yesterdayLocal.getUTCFullYear(),
        yesterdayLocal.getUTCMonth(),
        yesterdayLocal.getUTCDate(),
        0, 0, 0, 0
      ));
      previousStart.setTime(previousStart.getTime() - (philippinesOffset * 60 * 1000));
      
      previousEnd = new Date(Date.UTC(
        yesterdayLocal.getUTCFullYear(),
        yesterdayLocal.getUTCMonth(),
        yesterdayLocal.getUTCDate(),
        23, 59, 59, 999
      ));
      previousEnd.setTime(previousEnd.getTime() - (philippinesOffset * 60 * 1000));
      break;

    case 'yesterday':
      // Yesterday's full day in Philippines timezone
      const yesterdayLocalTime = new Date(localTime);
      yesterdayLocalTime.setUTCDate(yesterdayLocalTime.getUTCDate() - 1);
      
      currentStart = new Date(Date.UTC(
        yesterdayLocalTime.getUTCFullYear(),
        yesterdayLocalTime.getUTCMonth(),
        yesterdayLocalTime.getUTCDate(),
        0, 0, 0, 0
      ));
      currentStart.setTime(currentStart.getTime() - (philippinesOffset * 60 * 1000));
      
      currentEnd = new Date(Date.UTC(
        yesterdayLocalTime.getUTCFullYear(),
        yesterdayLocalTime.getUTCMonth(),
        yesterdayLocalTime.getUTCDate(),
        23, 59, 59, 999
      ));
      currentEnd.setTime(currentEnd.getTime() - (philippinesOffset * 60 * 1000));

      // Day before yesterday in Philippines timezone
      const dayBeforeYesterday = new Date(yesterdayLocalTime);
      dayBeforeYesterday.setUTCDate(dayBeforeYesterday.getUTCDate() - 1);
      
      previousStart = new Date(Date.UTC(
        dayBeforeYesterday.getUTCFullYear(),
        dayBeforeYesterday.getUTCMonth(),
        dayBeforeYesterday.getUTCDate(),
        0, 0, 0, 0
      ));
      previousStart.setTime(previousStart.getTime() - (philippinesOffset * 60 * 1000));
      
      previousEnd = new Date(Date.UTC(
        dayBeforeYesterday.getUTCFullYear(),
        dayBeforeYesterday.getUTCMonth(),
        dayBeforeYesterday.getUTCDate(),
        23, 59, 59, 999
      ));
      previousEnd.setTime(previousEnd.getTime() - (philippinesOffset * 60 * 1000));
      break;

    case 'week':
      // Current week (Monday to Sunday) in Philippines timezone
      const startOfWeek = new Date(localTime);
      // Get Monday of current week (0 = Sunday, 1 = Monday, etc.)
      const dayOfWeek = startOfWeek.getUTCDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // If Sunday, go back 6 days
      startOfWeek.setUTCDate(startOfWeek.getUTCDate() + mondayOffset);
      
      currentStart = new Date(Date.UTC(
        startOfWeek.getUTCFullYear(),
        startOfWeek.getUTCMonth(),
        startOfWeek.getUTCDate(),
        0, 0, 0, 0
      ));
      currentStart.setTime(currentStart.getTime() - (philippinesOffset * 60 * 1000));

      currentEnd = new Date(Date.UTC(
        startOfWeek.getUTCFullYear(),
        startOfWeek.getUTCMonth(),
        startOfWeek.getUTCDate() + 6, // Sunday
        23, 59, 59, 999
      ));
      currentEnd.setTime(currentEnd.getTime() - (philippinesOffset * 60 * 1000));

      // Previous week
      const previousWeekStart = new Date(startOfWeek);
      previousWeekStart.setUTCDate(previousWeekStart.getUTCDate() - 7);
      
      previousStart = new Date(Date.UTC(
        previousWeekStart.getUTCFullYear(),
        previousWeekStart.getUTCMonth(),
        previousWeekStart.getUTCDate(),
        0, 0, 0, 0
      ));
      previousStart.setTime(previousStart.getTime() - (philippinesOffset * 60 * 1000));
      
      previousEnd = new Date(Date.UTC(
        previousWeekStart.getUTCFullYear(),
        previousWeekStart.getUTCMonth(),
        previousWeekStart.getUTCDate() + 6,
        23, 59, 59, 999
      ));
      previousEnd.setTime(previousEnd.getTime() - (philippinesOffset * 60 * 1000));
      break;

    case 'month':
      // Current month in Philippines timezone
      currentStart = new Date(Date.UTC(
        localTime.getUTCFullYear(),
        localTime.getUTCMonth(),
        1, 0, 0, 0, 0
      ));
      currentStart.setTime(currentStart.getTime() - (philippinesOffset * 60 * 1000));
      
      currentEnd = new Date(Date.UTC(
        localTime.getUTCFullYear(),
        localTime.getUTCMonth() + 1,
        0, 23, 59, 59, 999
      ));
      currentEnd.setTime(currentEnd.getTime() - (philippinesOffset * 60 * 1000));

      // Previous month in Philippines timezone
      const previousMonthLocal = new Date(localTime);
      previousMonthLocal.setUTCMonth(previousMonthLocal.getUTCMonth() - 1);
      
      previousStart = new Date(Date.UTC(
        previousMonthLocal.getUTCFullYear(),
        previousMonthLocal.getUTCMonth(),
        1, 0, 0, 0, 0
      ));
      previousStart.setTime(previousStart.getTime() - (philippinesOffset * 60 * 1000));
      
      previousEnd = new Date(Date.UTC(
        previousMonthLocal.getUTCFullYear(),
        previousMonthLocal.getUTCMonth() + 1,
        0, 23, 59, 59, 999
      ));
      previousEnd.setTime(previousEnd.getTime() - (philippinesOffset * 60 * 1000));
      break;

    case 'quarter':
      // Current quarter in Philippines timezone
      const currentQuarter = Math.floor(localTime.getUTCMonth() / 3);
      currentStart = new Date(Date.UTC(
        localTime.getUTCFullYear(),
        currentQuarter * 3,
        1, 0, 0, 0, 0
      ));
      currentStart.setTime(currentStart.getTime() - (philippinesOffset * 60 * 1000));
      
      currentEnd = new Date(Date.UTC(
        localTime.getUTCFullYear(),
        currentQuarter * 3 + 3,
        0, 23, 59, 59, 999
      ));
      currentEnd.setTime(currentEnd.getTime() - (philippinesOffset * 60 * 1000));

      // Previous quarter in Philippines timezone
      const previousQuarterLocal = new Date(localTime);
      previousQuarterLocal.setUTCMonth(previousQuarterLocal.getUTCMonth() - 3);
      const previousQuarter = Math.floor(previousQuarterLocal.getUTCMonth() / 3);
      
      previousStart = new Date(Date.UTC(
        previousQuarterLocal.getUTCFullYear(),
        previousQuarter * 3,
        1, 0, 0, 0, 0
      ));
      previousStart.setTime(previousStart.getTime() - (philippinesOffset * 60 * 1000));
      
      previousEnd = new Date(Date.UTC(
        previousQuarterLocal.getUTCFullYear(),
        previousQuarter * 3 + 3,
        0, 23, 59, 59, 999
      ));
      previousEnd.setTime(previousEnd.getTime() - (philippinesOffset * 60 * 1000));
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
