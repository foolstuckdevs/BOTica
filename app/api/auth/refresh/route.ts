import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth } from '@/auth';
import {
  verifyRefreshToken,
  rotateRefreshToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} from '@/lib/auth/refresh-tokens';

export const runtime = 'nodejs';

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    const res = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    clearRefreshTokenCookie(res.headers);
    return res;
  }

  const cookieStore = await cookies();
  const rt = cookieStore.get('rt')?.value;
  if (!rt) {
    const res = NextResponse.json({ error: 'Missing token' }, { status: 401 });
    clearRefreshTokenCookie(res.headers);
    return res;
  }

  const verified = await verifyRefreshToken(rt, session.user.id);
  if (!verified) {
    const res = NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    clearRefreshTokenCookie(res.headers);
    return res;
  }

  // Rotate token
  const rotated = await rotateRefreshToken(rt, session.user.id);
  // 204 No Content must not include a body. Use an empty response and attach the Set-Cookie header.
  const res = new NextResponse(null, { status: 204 });
  setRefreshTokenCookie(res.headers, rotated.token, rotated.expiresAt);
  return res;
}
