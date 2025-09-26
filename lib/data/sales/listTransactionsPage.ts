import { db } from '@/database/drizzle';
import { sales, saleItems, products, users } from '@/database/schema';
import { and, eq, like, desc, inArray, sql } from 'drizzle-orm';
import { getTransactionsSchema } from '@/lib/validations';

export interface TransactionsPageParams {
  pharmacyId: number;
  page: number; // 1-based
  pageSize: number;
  search?: string;
}

export async function listTransactionsPage(params: TransactionsPageParams) {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize || 50));
  const offset = (page - 1) * pageSize;

  // Base validation (re-use zod for pharmacy + optional searchTerm)
  getTransactionsSchema.parse({
    pharmacyId: params.pharmacyId,
    searchTerm: params.search,
  });

  const filters: (ReturnType<typeof like> | ReturnType<typeof eq>)[] = [
    eq(sales.pharmacyId, params.pharmacyId),
  ];
  if (params.search) {
    filters.push(like(sales.invoiceNumber, `%${params.search}%`));
  }
  const where = and(...filters);

  const [{ total }] = await db
    .select({ total: sql<number>`COUNT(*)` })
    .from(sales)
    .where(where);

  const salesList = await db
    .select({
      id: sales.id,
      invoiceNumber: sales.invoiceNumber,
      totalAmount: sales.totalAmount,
      discount: sales.discount,
      amountReceived: sales.amountReceived,
      changeDue: sales.changeDue,
      paymentMethod: sales.paymentMethod,
      createdAt: sales.createdAt,
      userId: users.id,
      fullName: users.fullName,
    })
    .from(sales)
    .leftJoin(users, eq(sales.userId, users.id))
    .where(where)
    .orderBy(desc(sales.createdAt))
    .limit(pageSize)
    .offset(offset);

  const saleIds = salesList.map((s) => s.id);
  interface LineItemRow {
    id: number;
    productName: string;
    quantity: number;
    unitPrice: string;
    subtotal: string;
  }
  let itemGroups: Record<number, LineItemRow[]> = {};
  if (saleIds.length) {
    const items = await db
      .select({
        id: saleItems.id,
        saleId: saleItems.saleId,
        productName: products.name,
        quantity: saleItems.quantity,
        unitPrice: saleItems.unitPrice,
        subtotal: saleItems.subtotal,
      })
      .from(saleItems)
      .leftJoin(products, eq(saleItems.productId, products.id))
      .where(inArray(saleItems.saleId, saleIds));

    itemGroups = saleIds.reduce<Record<number, LineItemRow[]>>((acc, id) => {
      acc[id] = items
        .filter((i) => i.saleId === id)
        .map<LineItemRow>((i) => ({
          id: i.id,
          productName: i.productName ?? '',
          quantity: i.quantity ?? 0,
          unitPrice: i.unitPrice ?? '0.00',
          subtotal: i.subtotal ?? '0.00',
        }));
      return acc;
    }, {});
  }

  const transactions = salesList.map((s) => ({
    id: s.id,
    invoiceNumber: s.invoiceNumber ?? '',
    totalAmount: s.totalAmount ?? '0.00',
    discount: s.discount ?? '0.00',
    amountReceived: s.amountReceived ?? '0.00',
    changeDue: s.changeDue ?? '0.00',
    paymentMethod: s.paymentMethod ?? 'CASH',
    createdAt: s.createdAt ?? new Date(),
    user: { id: s.userId, fullName: s.fullName ?? '' },
    items: itemGroups[s.id] ?? [],
  }));

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return {
    data: transactions,
    total,
    page,
    pageSize,
    pageCount,
    hasNext: page < pageCount,
    hasPrev: page > 1,
  };
}
