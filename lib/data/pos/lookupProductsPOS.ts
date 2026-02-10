import { db } from '@/database/drizzle';
import { products, suppliers } from '@/database/schema';
import { and, eq, ilike, sql, or, asc, SQL } from 'drizzle-orm';

// Lightweight POS lookup (name/brand/lot). Excludes expired & deleted.
export interface POSLookupParams {
  pharmacyId: number;
  query?: string; // free text for name/brand/lot
  limit?: number; // hard cap (default 30)
  offset?: number; // for pagination (default 0)
}

export async function lookupProductsPOS({
  pharmacyId,
  query,
  limit = 30,
  offset = 0,
}: POSLookupParams) {
  const capped = Math.min(Math.max(limit, 1), 50);
  const safeOffset = Math.max(0, offset);

  const filters: SQL[] = [
    eq(products.pharmacyId, pharmacyId),
    sql`${products.deletedAt} IS NULL`,
  ];
  // Exclude expired stock
  filters.push(sql`${products.expiryDate} >= CURRENT_DATE`);

  // When browsing (no search), exclude out-of-stock products so
  // the returned page count matches visible cards (prevents empty gaps
  // and phantom "Load More" buttons).
  if (!query || query.length < 2) {
    filters.push(sql`${products.quantity} > 0`);
  }

  let whereExpr = and(...filters);

  if (query && query.length >= 2) {
    const q = `%${query}%`;
    whereExpr = and(
      ...filters,
      or(
        ilike(products.name, q),
        ilike(products.brandName, q),
        ilike(products.genericName, q),
        ilike(products.lotNumber, q),
        ilike(suppliers.name, q),
      ),
    );
  }

  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      brandName: products.brandName,
      lotNumber: products.lotNumber,
      expiryDate: products.expiryDate,
      sellingPrice: products.sellingPrice,
      quantity: products.quantity,
      unit: products.unit,
      imageUrl: products.imageUrl,
      genericName: products.genericName,
      supplierName: suppliers.name,
    })
    .from(products)
    .leftJoin(suppliers, eq(products.supplierId, suppliers.id))
    .where(whereExpr)
    .orderBy(asc(products.name), asc(products.expiryDate))
    .offset(safeOffset)
    .limit(capped);

  return rows;
}
