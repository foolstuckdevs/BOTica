import { db } from '@/database/drizzle';
import { products, categories, suppliers } from '@/database/schema';
import { and, eq, sql } from 'drizzle-orm';
import { pharmacyIdSchema } from '@/lib/validations';

export interface ProductListFilters {
  search?: string;
  status?: 'low' | 'out' | 'expiring' | 'expired';
  categoryId?: number; // optional
  supplierId?: number; // optional
}

export interface ProductListPageParams extends ProductListFilters {
  pharmacyId: number;
  page: number; // 1-based
  pageSize: number; // <= 100 enforced upstream
}

export async function listProductsPage(params: ProductListPageParams) {
  const { pharmacyId, page, pageSize } = params;
  pharmacyIdSchema.parse(pharmacyId);
  const safePage = Math.max(1, page || 1);
  const clampedSize = Math.min(Math.max(pageSize || 50, 1), 100);
  const offset = (safePage - 1) * clampedSize;

  // Build predicates
  const predicates = [
    eq(products.pharmacyId, pharmacyId),
    sql`${products.deletedAt} IS NULL`,
  ];

  if (params.search) {
    const s = `%${params.search}%`;
    predicates.push(
      sql`(${products.name} ILIKE ${s} OR ${products.brandName} ILIKE ${s} OR ${products.genericName} ILIKE ${s} OR ${products.lotNumber} ILIKE ${s})`,
    );
  }
  if (params.categoryId) {
    predicates.push(eq(products.categoryId, params.categoryId));
  }
  if (params.supplierId) {
    predicates.push(eq(products.supplierId, params.supplierId));
  }
  if (params.status) {
    const now = sql`NOW()`;
    switch (params.status) {
      case 'low':
        predicates.push(
          sql`${products.quantity} > 0 AND ${products.quantity} <= ${products.minStockLevel}`,
        );
        break;
      case 'out':
        predicates.push(sql`${products.quantity} = 0`);
        break;
      case 'expiring':
        predicates.push(
          sql`${products.expiryDate} > ${now} AND ${products.expiryDate} <= (${now} + interval '30 days')`,
        );
        break;
      case 'expired':
        predicates.push(sql`${products.expiryDate} < ${now}`);
        break;
    }
  }

  const where = and(...predicates);

  // Total count
  const [{ total }] = await db
    .select({ total: sql<number>`COUNT(*)` })
    .from(products)
    .where(where);

  // Page rows
  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      genericName: products.genericName,
      categoryId: products.categoryId,
      categoryName: categories.name,
      barcode: products.barcode,
      lotNumber: products.lotNumber,
      expiryDate: products.expiryDate,
      quantity: products.quantity,
      costPrice: products.costPrice,
      sellingPrice: products.sellingPrice,
      minStockLevel: products.minStockLevel,
      unit: products.unit,
      supplierId: products.supplierId,
      supplierName: suppliers.name,
      imageUrl: products.imageUrl,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
      brandName: products.brandName,
      dosageForm: products.dosageForm,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(suppliers, eq(products.supplierId, suppliers.id))
    .where(where)
    .orderBy(products.name)
    .limit(clampedSize)
    .offset(offset);

  const pageCount = Math.max(1, Math.ceil(total / clampedSize));

  return {
    data: rows,
    page: safePage,
    pageSize: clampedSize,
    total,
    pageCount,
    hasNext: safePage < pageCount,
    hasPrev: safePage > 1,
  };
}
