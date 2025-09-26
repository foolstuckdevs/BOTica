import { db } from '@/database/drizzle';
import { products, suppliers } from '@/database/schema';
import { sql, and, eq } from 'drizzle-orm';
import { pharmacyIdSchema } from '@/lib/validations';

export interface ProductLookupParams {
  pharmacyId: number;
  search: string;
  limit?: number; // default 20
}

export async function lookupProducts(params: ProductLookupParams) {
  const { pharmacyId, search } = params;
  pharmacyIdSchema.parse(pharmacyId);
  const trimmed = search.trim();
  if (trimmed.length < 2) return [];
  const limit = Math.min(Math.max(params.limit ?? 20, 1), 50);
  const pattern = `%${trimmed}%`;

  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      brandName: products.brandName,
      genericName: products.genericName,
      lotNumber: products.lotNumber,
      supplierName: suppliers.name,
      quantity: products.quantity,
      expiryDate: products.expiryDate,
      unit: products.unit,
      minStockLevel: products.minStockLevel,
    })
    .from(products)
    .leftJoin(suppliers, eq(products.supplierId, suppliers.id))
    .where(
      and(
        eq(products.pharmacyId, pharmacyId),
        sql`${products.deletedAt} IS NULL`,
        sql`(${products.name} ILIKE ${pattern} OR ${products.brandName} ILIKE ${pattern} OR ${products.genericName} ILIKE ${pattern} OR ${products.lotNumber} ILIKE ${pattern})`,
      ),
    )
    .orderBy(products.name)
    .limit(limit);

  return rows;
}
