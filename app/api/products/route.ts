import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { listProductsPage } from '@/lib/data/products/listProductsPage';

// Supports: page, pageSize, search, status(low|out|expiring|expired), categoryId, supplierId
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
    const status = searchParams.get('status') as
      | 'low'
      | 'out'
      | 'expiring'
      | 'expired'
      | undefined;
    const categoryId = searchParams.get('categoryId')
      ? parseInt(searchParams.get('categoryId')!, 10)
      : undefined;
    const supplierId = searchParams.get('supplierId')
      ? parseInt(searchParams.get('supplierId')!, 10)
      : undefined;

    const data = await listProductsPage({
      pharmacyId,
      page,
      pageSize,
      search,
      status,
      categoryId,
      supplierId,
    });

    return NextResponse.json(data);
  } catch (err) {
    console.error('Paginated products fetch failed', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
