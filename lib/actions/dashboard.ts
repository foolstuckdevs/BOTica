'use server';

import { db } from '@/database/drizzle';
import { products, saleItems, sales } from '@/database/schema';
import { eq, and, gte, lte, sum, desc, sql } from 'drizzle-orm';
import {
  getSalesComparisonSchema,
  getProductStockSummariesSchema,
  getTopSellingProductsSchema,
  getLowStockProductsSchema,
} from '@/lib/validations';
import { ChartDataPoint, ChartMetrics } from '@/types';

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

    // Use Philippines timezone (UTC+8) to match business operations
    const now = new Date();

    // Convert to Philippines time (UTC+8)
    const philippinesOffset = 8 * 60; // 8 hours in minutes
    const localTime = new Date(now.getTime() + philippinesOffset * 60 * 1000);

    // Get today's date in Philippines timezone
    const startOfToday = new Date(
      Date.UTC(
        localTime.getUTCFullYear(),
        localTime.getUTCMonth(),
        localTime.getUTCDate(),
        0,
        0,
        0,
        0,
      ),
    );
    // Adjust back to store in UTC but represents Philippines midnight
    startOfToday.setTime(
      startOfToday.getTime() - philippinesOffset * 60 * 1000,
    );

    const endOfToday = new Date(
      Date.UTC(
        localTime.getUTCFullYear(),
        localTime.getUTCMonth(),
        localTime.getUTCDate(),
        23,
        59,
        59,
        999,
      ),
    );
    // Adjust back to store in UTC but represents Philippines end of day
    endOfToday.setTime(endOfToday.getTime() - philippinesOffset * 60 * 1000);

    // Get yesterday's date in Philippines timezone
    const yesterdayLocal = new Date(localTime);
    yesterdayLocal.setUTCDate(yesterdayLocal.getUTCDate() - 1);

    const startOfYesterday = new Date(
      Date.UTC(
        yesterdayLocal.getUTCFullYear(),
        yesterdayLocal.getUTCMonth(),
        yesterdayLocal.getUTCDate(),
        0,
        0,
        0,
        0,
      ),
    );
    startOfYesterday.setTime(
      startOfYesterday.getTime() - philippinesOffset * 60 * 1000,
    );

    const endOfYesterday = new Date(
      Date.UTC(
        yesterdayLocal.getUTCFullYear(),
        yesterdayLocal.getUTCMonth(),
        yesterdayLocal.getUTCDate(),
        23,
        59,
        59,
        999,
      ),
    );
    endOfYesterday.setTime(
      endOfYesterday.getTime() - philippinesOffset * 60 * 1000,
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
    // Use Philippines timezone (UTC+8) for consistent month calculation
    const philippinesOffset = 8 * 60; // 8 hours in minutes
    const localTime = new Date(now.getTime() + philippinesOffset * 60 * 1000);

    const startOfMonth = new Date(
      Date.UTC(
        localTime.getUTCFullYear(),
        localTime.getUTCMonth(),
        1,
        0,
        0,
        0,
        0,
      ),
    );
    // Convert to UTC for database query
    startOfMonth.setTime(
      startOfMonth.getTime() - philippinesOffset * 60 * 1000,
    );

    const endOfMonth = new Date(
      Date.UTC(
        localTime.getUTCFullYear(),
        localTime.getUTCMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      ),
    );
    // Convert to UTC for database query
    endOfMonth.setTime(endOfMonth.getTime() - philippinesOffset * 60 * 1000);

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

// Get daily sales data for chart
export const getChartData = async (
  pharmacyId: number,
  days: number = 30,
): Promise<ChartDataPoint[]> => {
  try {
    // Calculate date range in Philippines timezone (UTC+8)
    const now = new Date();
    const philippinesOffset = 8 * 60; // 8 hours in minutes
    const localTime = new Date(now.getTime() + philippinesOffset * 60 * 1000);

    const endDate = new Date(localTime);
    const startDate = new Date(localTime);
    startDate.setUTCDate(endDate.getUTCDate() - days);

    // Reset to start of day in Philippines time, then convert to UTC for storage
    startDate.setUTCHours(0, 0, 0, 0);
    startDate.setTime(startDate.getTime() - philippinesOffset * 60 * 1000);

    // Set end date to end of current day in Philippines time, then convert to UTC
    endDate.setUTCHours(23, 59, 59, 999);
    endDate.setTime(endDate.getTime() - philippinesOffset * 60 * 1000);

    // Get daily aggregated data
    const result = await db
      .select({
        date: sql<string>`DATE(${sales.createdAt})`,
        totalSales: sum(sales.totalAmount),
        totalCost: sum(
          sql`CAST(${products.costPrice} AS NUMERIC) * ${saleItems.quantity}`,
        ),
        transactionCount: sql<number>`COUNT(DISTINCT ${sales.id})`,
      })
      .from(sales)
      .innerJoin(saleItems, eq(sales.id, saleItems.saleId))
      .innerJoin(products, eq(saleItems.productId, products.id))
      .where(
        and(
          eq(sales.pharmacyId, pharmacyId),
          gte(sales.createdAt, startDate),
          lte(sales.createdAt, endDate),
        ),
      )
      .groupBy(sql`DATE(${sales.createdAt})`)
      .orderBy(sql`DATE(${sales.createdAt})`);

    // Create array of all dates in range
    const chartData: ChartDataPoint[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];

      // Find data for this date
      const dayData = result.find((r) => r.date === dateStr);

      const salesAmount = Number(dayData?.totalSales) || 0;
      const costAmount = Number(dayData?.totalCost) || 0;
      const transactionCount = Number(dayData?.transactionCount) || 0;

      chartData.push({
        date: dateStr,
        sales: salesAmount,
        purchases: costAmount,
        grossProfit: salesAmount - costAmount,
        transactionCount,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return chartData;
  } catch (error) {
    console.error('Error fetching chart data:', error);
    return [];
  }
};

// Get aggregated metrics for a time period
export const getChartMetrics = async (
  pharmacyId: number,
  days: number = 30,
): Promise<ChartMetrics> => {
  try {
    const data = await getChartData(pharmacyId, days);

    const totalSales = data.reduce((sum, d) => sum + d.sales, 0);
    const totalCost = data.reduce((sum, d) => sum + d.purchases, 0);
    const totalProfit = totalSales - totalCost;
    const totalTransactions = data.reduce(
      (sum, d) => sum + d.transactionCount,
      0,
    );
    const profitMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

    // Calculate averages
    const avgDailySales = data.length > 0 ? totalSales / data.length : 0;
    const avgDailyTransactions =
      data.length > 0 ? totalTransactions / data.length : 0;

    return {
      totalSales: Number(totalSales.toFixed(2)),
      totalCost: Number(totalCost.toFixed(2)),
      totalProfit: Number(totalProfit.toFixed(2)),
      totalTransactions,
      profitMargin: Number(profitMargin.toFixed(1)),
      avgDailySales: Number(avgDailySales.toFixed(2)),
      avgDailyTransactions: Number(avgDailyTransactions.toFixed(1)),
      daysWithSales: data.filter((d) => d.sales > 0).length,
    };
  } catch (error) {
    console.error('Error calculating chart metrics:', error);
    return {
      totalSales: 0,
      totalCost: 0,
      totalProfit: 0,
      totalTransactions: 0,
      profitMargin: 0,
      avgDailySales: 0,
      avgDailyTransactions: 0,
      daysWithSales: 0,
    };
  }
};
