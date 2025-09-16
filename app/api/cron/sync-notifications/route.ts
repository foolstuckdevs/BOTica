import { NextResponse } from 'next/server';
import { db } from '@/database/drizzle';
import { pharmacies } from '@/database/schema';
import { syncInventoryNotifications } from '@/lib/actions/notifications';

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const url = new URL(request.url);
  const header = request.headers.get('x-cron-secret');
  const authHeader = request.headers.get('authorization');
  const token = url.searchParams.get('token');
  let provided = header ?? token ?? '';
  if (!provided && authHeader && authHeader.startsWith('Bearer ')) {
    provided = authHeader.slice('Bearer '.length);
  }

  if (!secret || provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const pharmList = await db.select({ id: pharmacies.id }).from(pharmacies);
    for (const p of pharmList) {
      await syncInventoryNotifications(p.id);
    }
    return NextResponse.json({ success: true, count: pharmList.length });
  } catch (err) {
    console.error('Cron sync failed', err);
    return NextResponse.json({ error: 'Cron sync failed' }, { status: 500 });
  }
}
