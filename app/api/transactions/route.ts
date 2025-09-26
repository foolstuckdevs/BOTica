import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { listTransactionsPage } from '@/lib/data/sales/listTransactionsPage';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.pharmacyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const pharmacyId = session.user.pharmacyId;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);
    const search = searchParams.get('search') || undefined;

    const data = await listTransactionsPage({
      pharmacyId,
      page,
      pageSize,
      search,
    });

    return NextResponse.json(data);
  } catch (e) {
    console.error('Transactions API error', e);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
