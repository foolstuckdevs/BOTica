import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { lookupProductsPOS } from '@/lib/data/pos/lookupProductsPOS';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.pharmacyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query') || undefined;
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit') || '30', 10)
      : 30;
    const offset = searchParams.get('offset')
      ? parseInt(searchParams.get('offset') || '0', 10)
      : 0;

    const data = await lookupProductsPOS({
      pharmacyId: session.user.pharmacyId,
      query,
      limit,
      offset,
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('POS lookup error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
