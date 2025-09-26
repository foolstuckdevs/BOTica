import { db } from '@/database/drizzle';
import { activityLogs, users } from '@/database/schema';
import { and, desc, eq, ilike, or, sql, gte, lte } from 'drizzle-orm';

export interface ActivityPageParams {
  pharmacyId: number;
  page: number; // 1-based
  pageSize: number;
  search?: string; // matches action, user full name, or description JSON text
  prefixes?: string[]; // action prefixes (case-insensitive) e.g. ["PRODUCT_", "SALE_"]
  dateFrom?: string; // ISO date string (inclusive)
  dateTo?: string; // ISO date string (inclusive)
}

export async function listActivityPage(params: ActivityPageParams) {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize || 50));
  const offset = (page - 1) * pageSize;

  const filters: Array<
    | ReturnType<typeof eq>
    | ReturnType<typeof or>
    | ReturnType<typeof ilike>
    | ReturnType<typeof gte>
    | ReturnType<typeof lte>
  > = [eq(activityLogs.pharmacyId, params.pharmacyId)];

  if (params.search) {
    const likePattern = `%${params.search}%`;
    filters.push(
      or(
        ilike(activityLogs.action, likePattern),
        ilike(activityLogs.description, likePattern),
        ilike(users.fullName, likePattern),
      ),
    );
  }

  if (params.prefixes?.length) {
    const upper = params.prefixes.map((p) => p.toUpperCase());
    // action starts with any prefix
    filters.push(or(...upper.map((p) => ilike(activityLogs.action, `${p}%`))));
  }

  if (params.dateFrom) {
    filters.push(gte(activityLogs.createdAt, new Date(params.dateFrom)));
  }
  if (params.dateTo) {
    filters.push(lte(activityLogs.createdAt, new Date(params.dateTo)));
  }

  const where = and(...filters);

  const [{ total }] = await db
    .select({ total: sql<number>`COUNT(*)` })
    .from(activityLogs)
    .leftJoin(users, eq(users.id, activityLogs.userId))
    .where(where);

  const rows = await db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      description: activityLogs.description,
      createdAt: activityLogs.createdAt,
      userFullName: users.fullName,
    })
    .from(activityLogs)
    .leftJoin(users, eq(users.id, activityLogs.userId))
    .where(where)
    .orderBy(desc(activityLogs.createdAt))
    .limit(pageSize)
    .offset(offset);

  const data = rows.map((r) => ({
    id: r.id,
    action: r.action,
    details: parseDetails(r.description),
    createdAt: r.createdAt,
    userFullName: r.userFullName ?? null,
  }));

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return {
    data,
    total,
    page,
    pageSize,
    pageCount,
    hasNext: page < pageCount,
    hasPrev: page > 1,
  };
}

function parseDetails(val: unknown) {
  if (typeof val !== 'string') return null;
  try {
    return JSON.parse(val);
  } catch {
    return null;
  }
}
