'use server';

import { auth } from '@/auth';
import { products, categories, suppliers } from '@/database/schema';
import { eq, and, gte, lte, count, sql, asc } from 'drizzle-orm';
import { formatInTimeZone } from 'date-fns-tz';
import { addDays } from 'date-fns';
import {
  InventoryOverviewData,
  ExpiringProductData,
  LowStockProductData,
} from '@/types';
import { db } from '@/database/drizzle';

export async function getInventoryReportData(pharmacyId: number) {
  const session = await auth();
  if (!session?.user?.pharmacyId) {
    throw new Error('Unauthorized');
  }

  // Get current date in Philippines timezone
  const now = new Date();
  const today = new Date(formatInTimeZone(now, 'Asia/Manila', 'yyyy-MM-dd'));
  const thirtyDaysFromNow = addDays(today, 30);
  const ninetyDaysFromNow = addDays(today, 90);

  // 1. Get overview data (total products, value)
  const overviewResults = await db
    .select({
      totalProducts: count(products.id),
      totalValue: sql<string>`COALESCE(SUM(${products.quantity} * ${products.costPrice}), 0)`,
      lowStockCount: count(
        sql`CASE WHEN ${products.quantity} <= ${products.minStockLevel} THEN 1 END`,
      ),
      expiringCount: count(
        sql`CASE WHEN ${
          products.expiryDate
        } <= ${thirtyDaysFromNow.toISOString()} AND ${
          products.quantity
        } > 0 THEN 1 END`,
      ),
      outOfStockCount: count(
        sql`CASE WHEN ${products.quantity} = 0 THEN 1 END`,
      ),
    })
    .from(products)
    .where(
      and(
        eq(products.pharmacyId, pharmacyId),
        sql`${products.deletedAt} IS NULL`,
      ),
    );

  // 2. Get expiring products (next 30/90 days)
  const expiringResults = await db
    .select({
      id: products.id,
      name: products.name,
      brandName: products.brandName,
      lotNumber: products.lotNumber,
      expiryDate: products.expiryDate,
      daysRemaining: sql<number>`EXTRACT(DAY FROM (${
        products.expiryDate
      }::timestamp - ${today.toISOString()}::timestamp))`,
      quantity: products.quantity,
      value: sql<string>`${products.quantity} * ${products.costPrice}`,
      sellingPrice: products.sellingPrice,
      costPrice: products.costPrice,
      unit: products.unit,
      categoryId: products.categoryId,
      categoryName: categories.name,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(
      and(
        eq(products.pharmacyId, pharmacyId),
        gte(products.quantity, 1),
        lte(products.expiryDate, ninetyDaysFromNow.toISOString()),
      ),
    )
    .orderBy(asc(products.expiryDate));

  // 3. Get low stock products
  const lowStockResults = await db
    .select({
      id: products.id,
      name: products.name,
      brandName: products.brandName,
      lotNumber: products.lotNumber,
      quantity: products.quantity,
      minStockLevel: products.minStockLevel,
      supplierId: suppliers.id,
      supplierName: suppliers.name,
      lastRestockDate: products.updatedAt,
      value: sql<string>`${products.quantity} * ${products.costPrice}`,
      unit: products.unit,
      categoryId: products.categoryId,
      categoryName: categories.name,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(suppliers, eq(products.supplierId, suppliers.id))
    .where(
      and(
        eq(products.pharmacyId, pharmacyId),
        lte(products.quantity, products.minStockLevel),
        sql`${products.deletedAt} IS NULL`,
      ),
    )
    .orderBy(asc(products.quantity));

  // Note: Category breakdown and value-by-range are intentionally omitted for a simpler report

  // Process overview data
  const overview: InventoryOverviewData = {
    totalProducts: Number(overviewResults[0]?.totalProducts || 0),
    totalValue: parseFloat(overviewResults[0]?.totalValue || '0'),
    lowStockCount: Number(overviewResults[0]?.lowStockCount || 0),
    expiringCount: Number(overviewResults[0]?.expiringCount || 0),
    outOfStockCount: Number(overviewResults[0]?.outOfStockCount || 0),
  };

  // Process expiring products
  const expiringProducts: ExpiringProductData[] = expiringResults.map(
    (result) => ({
      id: result.id,
      name: result.name,
      brandName: result.brandName,
      lotNumber: result.lotNumber,
      expiryDate: result.expiryDate,
      daysRemaining: result.daysRemaining,
      quantity: result.quantity,
      value: parseFloat(result.value || '0'),
      sellingPrice: parseFloat(result.sellingPrice || '0'),
      costPrice: parseFloat(result.costPrice || '0'),
      unit: result.unit,
      categoryId: result.categoryId,
      categoryName: result.categoryName || 'Uncategorized',
      urgency:
        result.daysRemaining <= 30
          ? 'critical'
          : result.daysRemaining <= 60
          ? 'warning'
          : 'normal',
    }),
  );

  // Process low stock products
  const lowStockProducts: LowStockProductData[] = lowStockResults.map(
    (result) => ({
      id: result.id,
      name: result.name,
      brandName: result.brandName,
      lotNumber: result.lotNumber,
      quantity: result.quantity,
      reorderPoint: result.minStockLevel,
      supplierId: result.supplierId,
      supplierName: result.supplierName || 'N/A',
      lastRestockDate: result.lastRestockDate,
      value: parseFloat(result.value || '0'),
      unit: result.unit,
      categoryId: result.categoryId,
      categoryName: result.categoryName || 'Uncategorized',
      status:
        result.quantity === 0
          ? 'out_of_stock'
          : result.quantity <= result.minStockLevel * 0.5
          ? 'critical'
          : 'low',
    }),
  );

  return {
    overview,
    expiringProducts,
    lowStockProducts,
  };
}
