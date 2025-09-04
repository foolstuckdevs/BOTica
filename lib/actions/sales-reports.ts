'use server';

import { db } from '@/database/drizzle';
import { sales, saleItems, products, categories } from '@/database/schema';
import { eq, and, gte, lte, sum, count, sql, desc } from 'drizzle-orm';
import { getBatchProfitDataSchema } from '@/lib/validations';
import {
  PeriodType,
  SalesOverviewData,
  ProductPerformanceData,
  BatchProfitData,
} from '@/types';

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

    // Calculate date ranges for batch profit (simplified for month only)
    const now = new Date();
    const philippinesOffset = 8 * 60;
    const localTime = new Date(now.getTime() + philippinesOffset * 60 * 1000);

    const monthStart = new Date(
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
    monthStart.setTime(monthStart.getTime() - philippinesOffset * 60 * 1000);

    const monthEnd = new Date(
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
    monthEnd.setTime(monthEnd.getTime() - philippinesOffset * 60 * 1000);

    // Query to get batch profit data
    const result = await db
      .select({
        productId: products.id,
        productName: products.name,
        categoryName: categories.name,
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
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .where(
        and(
          eq(products.pharmacyId, validatedData.pharmacyId),
          gte(sales.createdAt, monthStart),
          lte(sales.createdAt, monthEnd),
        ),
      )
      .groupBy(
        products.id,
        products.name,
        categories.name,
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
        categoryName: row.categoryName || 'Uncategorized',
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

// OPTIMIZED: Consolidated sales report data fetcher - replaces multiple separate calls
export const getSalesReportData = async (pharmacyId: number) => {
  try {
    const now = new Date();
    const philippinesOffset = 8 * 60; // 8 hours in minutes
    const localTime = new Date(now.getTime() + philippinesOffset * 60 * 1000);

    // Calculate all date ranges upfront
    const today = new Date(
      localTime.toISOString().split('T')[0] + 'T00:00:00.000Z',
    );
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 7);

    const monthStart = new Date(today);
    monthStart.setDate(monthStart.getDate() - 30);

    // Single consolidated query for all sales overview data (30 days)
    const salesOverviewQuery = db
      .select({
        date: sql<string>`DATE(${sales.createdAt} AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila')`,
        totalSales: sum(sales.totalAmount),
        transactions: count(sales.id),
      })
      .from(sales)
      .where(
        and(
          eq(sales.pharmacyId, pharmacyId),
          gte(sales.createdAt, monthStart),
          lte(sales.createdAt, tomorrow),
        ),
      )
      .groupBy(
        sql`DATE(${sales.createdAt} AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila')`,
      )
      .orderBy(
        sql`DATE(${sales.createdAt} AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila')`,
      );

    // Single consolidated query for cost and items data (30 days)
    const costAndItemsQuery = db
      .select({
        date: sql<string>`DATE(${sales.createdAt} AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila')`,
        totalItems: sum(saleItems.quantity),
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
          gte(sales.createdAt, monthStart),
          lte(sales.createdAt, tomorrow),
        ),
      )
      .groupBy(
        sql`DATE(${sales.createdAt} AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila')`,
      )
      .orderBy(
        sql`DATE(${sales.createdAt} AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila')`,
      );

    // Single consolidated query for all product performance data (30 days)
    const productPerformanceQuery = db
      .select({
        date: sql<string>`DATE(${sales.createdAt} AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila')`,
        productId: saleItems.productId,
        name: products.name,
        brandName: products.brandName,
        categoryName: categories.name,
        totalQuantity: sum(saleItems.quantity),
        totalRevenue: sum(saleItems.subtotal),
        costPrice: products.costPrice,
        unit: products.unit,
      })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .innerJoin(products, eq(saleItems.productId, products.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(
        and(
          eq(sales.pharmacyId, pharmacyId),
          gte(sales.createdAt, monthStart),
          lte(sales.createdAt, tomorrow),
        ),
      )
      .groupBy(
        sql`DATE(${sales.createdAt} AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila')`,
        saleItems.productId,
        products.name,
        products.brandName,
        categories.name,
        products.costPrice,
        products.unit,
      )
      .orderBy(
        sql`DATE(${sales.createdAt} AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila')`,
        desc(sum(saleItems.quantity)),
      );

    // Batch profit data query (keep existing logic)
    const batchProfitQuery = getBatchProfitData(pharmacyId, 'month');

    // Execute all queries in parallel
    const [salesResults, costResults, productResults, batchProfitData] =
      await Promise.all([
        salesOverviewQuery,
        costAndItemsQuery,
        productPerformanceQuery,
        batchProfitQuery,
      ]);

    // Process results into structured format
    const processedData = processSalesReportData(
      salesResults,
      costResults,
      productResults,
      today,
      weekStart,
      monthStart,
    );

    return {
      ...processedData,
      batchProfitData,
    };
  } catch (error) {
    console.error('Error fetching consolidated sales report data:', error);
    throw error;
  }
};

// Helper function to process raw data into structured format
function processSalesReportData(
  salesResults: Array<{
    date: string;
    totalSales: string | null;
    transactions: number;
  }>,
  costResults: Array<{
    date: string;
    totalItems: string | null;
    totalCost: string | null;
  }>,
  productResults: Array<{
    date: string;
    productId: number;
    name: string;
    brandName: string | null;
    categoryName: string | null;
    totalQuantity: string | null;
    totalRevenue: string | null;
    costPrice: string | null;
    unit: string | null;
  }>,
  today: Date,
  weekStart: Date,
  monthStart: Date,
) {
  // Create maps for efficient lookup
  const salesMap = new Map(salesResults.map((item) => [item.date, item]));
  const costMap = new Map(costResults.map((item) => [item.date, item]));

  // Helper to aggregate data for date ranges
  const aggregateByDateRange = (
    startDate: Date,
    endDate: Date,
  ): SalesOverviewData => {
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];

    let totalSales = 0,
      totalCost = 0,
      transactions = 0,
      totalItems = 0;

    for (const [date, salesData] of salesMap) {
      if (date >= start && date <= end) {
        totalSales += Number(salesData.totalSales) || 0;
        transactions += Number(salesData.transactions) || 0;
      }
    }

    for (const [date, costData] of costMap) {
      if (date >= start && date <= end) {
        totalCost += Number(costData.totalCost) || 0;
        totalItems += Number(costData.totalItems) || 0;
      }
    }

    return {
      totalSales: Number(totalSales.toFixed(2)),
      totalCost: Number(totalCost.toFixed(2)),
      profit: Number((totalSales - totalCost).toFixed(2)),
      transactions,
      totalItems,
    };
  };

  // Generate period data
  const todayData = aggregateByDateRange(today, today);
  const weekData = aggregateByDateRange(weekStart, today);
  const monthData = aggregateByDateRange(monthStart, today);

  // Process product performance data
  const processProducts = (
    startDate: Date,
    endDate: Date,
  ): ProductPerformanceData[] => {
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];

    const productMap = new Map<string, ProductPerformanceData>();

    productResults
      .filter((item) => item.date >= start && item.date <= end)
      .forEach((item) => {
        const key = `${item.name}__${item.brandName ?? ''}`; // group by name+brand
        const existing = productMap.get(key);
        const quantity = Number(item.totalQuantity) || 0;
        const revenue = Number(item.totalRevenue) || 0;
        const costPrice = Number(item.costPrice) || 0;
        const profit = revenue - costPrice * quantity;

        if (existing) {
          existing.quantity += quantity;
          existing.revenue += revenue;
          existing.profit += profit;
        } else {
          productMap.set(key, {
            name: item.name,
            brandName: item.brandName,
            category: item.categoryName || 'Uncategorized',
            quantity,
            revenue: Number(revenue.toFixed(2)),
            profit: Number(profit.toFixed(2)),
          });
        }
      });

    return Array.from(productMap.values()).sort(
      (a, b) => b.quantity - a.quantity,
    );
  };

  const todayProducts = processProducts(today, today);
  const weekProducts = processProducts(weekStart, today);
  const monthProducts = processProducts(monthStart, today);

  // Generate comprehensive data for client-side filtering
  const comprehensiveSalesData = generateComprehensiveSalesData(
    salesMap,
    costMap,
  );
  const comprehensiveProductData =
    generateComprehensiveProductData(productResults);

  return {
    salesData: {
      today: todayData,
      week: weekData,
      month: monthData,
    },
    productData: {
      today: todayProducts,
      week: weekProducts,
      month: monthProducts,
    },
    comprehensiveSalesData,
    comprehensiveProductData,
  };
}

function generateComprehensiveSalesData(
  salesMap: Map<
    string,
    { date: string; totalSales: string | null; transactions: number }
  >,
  costMap: Map<
    string,
    { date: string; totalItems: string | null; totalCost: string | null }
  >,
) {
  const allDates = new Set([...salesMap.keys(), ...costMap.keys()]);
  const dailyData: Array<SalesOverviewData & { date: string }> = [];

  allDates.forEach((date) => {
    const salesData = salesMap.get(date);
    const costData = costMap.get(date);

    const totalSales = Number(salesData?.totalSales) || 0;
    const totalCost = Number(costData?.totalCost) || 0;
    const profit = totalSales - totalCost;

    dailyData.push({
      date,
      totalSales: Number(totalSales.toFixed(2)),
      totalCost: Number(totalCost.toFixed(2)),
      profit: Number(profit.toFixed(2)),
      transactions: Number(salesData?.transactions) || 0,
      totalItems: Number(costData?.totalItems) || 0,
    });
  });

  return dailyData.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}

function generateComprehensiveProductData(
  productResults: Array<{
    date: string;
    productId: number;
    name: string;
    brandName: string | null;
    categoryName: string | null;
    totalQuantity: string | null;
    totalRevenue: string | null;
    costPrice: string | null;
    unit: string | null;
  }>,
) {
  return productResults.map((item) => {
    const quantity = Number(item.totalQuantity) || 0;
    const revenue = Number(item.totalRevenue) || 0;
    const costPrice = Number(item.costPrice) || 0;
    const totalCost = costPrice * quantity;
    const profit = revenue - totalCost;

    return {
      date: item.date,
      name: item.name,
      brandName: item.brandName,
      category: item.categoryName || 'Uncategorized',
      quantity,
      revenue: Number(revenue.toFixed(2)),
      profit: Number(profit.toFixed(2)),
      unit: item.unit,
    };
  });
}
