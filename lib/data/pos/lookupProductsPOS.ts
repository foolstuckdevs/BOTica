import { db } from '@/database/drizzle';
import { products } from '@/database/schema';
import { and, eq, ilike, sql, or, asc, SQL } from 'drizzle-orm';

// Lightweight POS lookup (name/brand/lot or barcode exact). Excludes expired & deleted.
export interface POSLookupParams {
  pharmacyId: number;
  query?: string; // free text for name/brand/lot
  barcode?: string; // exact or prefix?
  limit?: number; // hard cap (default 30)
  offset?: number; // for pagination (default 0)
}

export async function lookupProductsPOS({
  pharmacyId,
  query,
  barcode,
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

  let whereExpr = and(...filters);

  if (barcode) {
    // Prioritize barcode exact match - if provided we ignore free text for speed
    whereExpr = and(...filters, eq(products.barcode, barcode));
  } else if (query && query.length >= 2) {
    const q = `%${query}%`;
    whereExpr = and(
      ...filters,
      or(
        ilike(products.name, q),
        ilike(products.brandName, q),
        ilike(products.lotNumber, q),
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
    })
    .from(products)
    .where(whereExpr)
    .orderBy(asc(products.name), asc(products.expiryDate))
    .offset(safeOffset)
    .limit(capped);

  return rows;
}
