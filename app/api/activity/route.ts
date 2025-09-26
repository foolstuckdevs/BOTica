import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { listActivityPage } from '@/lib/data/activity/listActivityPage';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.pharmacyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);
    const search = searchParams.get('search') || undefined;
    const prefixesParam = searchParams.get('prefixes');
    const prefixes = prefixesParam
      ? prefixesParam
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean)
      : undefined;
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;

    const result = await listActivityPage({
      pharmacyId: session.user.pharmacyId,
      page,
      pageSize,
      search,
      prefixes,
      dateFrom,
      dateTo,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('Activity pagination error:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
