import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { getActivityFilterOptions } from '@/lib/data/activity/listActivityPage';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.pharmacyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await getActivityFilterOptions(session.user.pharmacyId);
    return NextResponse.json(result);
  } catch (err) {
    console.error('Activity filters error:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
