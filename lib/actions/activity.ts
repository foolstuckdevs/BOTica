'use server';

import { db } from '@/database/drizzle';
import { activityLogs, users } from '@/database/schema';
import { auth } from '@/auth';
import { desc, eq } from 'drizzle-orm';

type ActivityDetails = Record<string, unknown> | null;

export async function logActivity(params: {
  action: string;
  pharmacyId: number;
  details?: ActivityDetails;
  userId?: string;
}) {
  try {
    const userId =
      params.userId ?? ((await auth())?.user?.id as string | undefined);
    if (!userId) return; // silently ignore if no session

    await db.insert(activityLogs).values({
      userId,
      pharmacyId: params.pharmacyId,
      action: params.action,
      description: params.details ? JSON.stringify(params.details) : null,
    });
  } catch (err) {
    console.error('Activity log failed:', err);
  }
}

export async function getRecentActivity(
  pharmacyId: number,
  limit: number = 10,
  actionPrefixes?: string[],
) {
  const rows = await db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      details: activityLogs.description,
      createdAt: activityLogs.createdAt,
      userId: activityLogs.userId,
      username: users.fullName,
    })
    .from(activityLogs)
    .leftJoin(users, eq(users.id, activityLogs.userId))
    .where(eq(activityLogs.pharmacyId, pharmacyId))
    .orderBy(desc(activityLogs.createdAt))
    .limit(limit);

  const items = rows.map((r) => ({
    id: r.id,
    action: r.action,
    details: parseDetails(r.details),
    createdAt: r.createdAt,
    username: r.username ?? null,
  }));

  if (actionPrefixes?.length) {
    const prefixes = actionPrefixes.map((p) => p.toUpperCase());
    return items.filter((it) =>
      prefixes.some((pre) => it.action?.toUpperCase()?.startsWith(pre)),
    );
  }
  return items;
}

function parseDetails(val: unknown) {
  if (typeof val !== 'string') return null;
  try {
    return JSON.parse(val);
  } catch {
    return null;
  }
}
