import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { lookupProducts } from '@/lib/data/products/lookupProducts';

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.pharmacyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const pharmacyId = session.user.pharmacyId;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!, 10)
      : 20;

    const data = await lookupProducts({ pharmacyId, search, limit });
    return NextResponse.json({ data });
  } catch (err) {
    console.error('Product lookup failed:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
