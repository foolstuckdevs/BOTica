import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth } from '@/auth';
import {
  verifyRefreshToken,
  rotateRefreshToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  RefreshTokenMetadata,
} from '@/lib/auth/refresh-tokens';

export const runtime = 'nodejs';

export async function POST(request: Request) {
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

  const metadata = extractMetadataFromRequest(request);
  const verified = await verifyRefreshToken(rt, session.user.id, metadata);
  if (!verified) {
    const res = NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    clearRefreshTokenCookie(res.headers);
    return res;
  }

  // Rotate token
  const rememberMe = (session as { rememberMe?: boolean })?.rememberMe ?? false;
  const rotated = await rotateRefreshToken(rt, session.user.id, {
    rememberMe,
    metadata,
  });
  // 204 No Content must not include a body. Use an empty response and attach the Set-Cookie header.
  const res = new NextResponse(null, { status: 204 });
  setRefreshTokenCookie(res.headers, rotated.token, rotated.expiresAt);
  return res;
}

function extractMetadataFromRequest(request: Request): RefreshTokenMetadata {
  const userAgent = request.headers.get('user-agent') ?? null;
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ipAddress = forwardedFor
    ? forwardedFor.split(',')[0]?.trim() ?? null
    : request.headers.get('x-real-ip');

  return {
    userAgent,
    ipAddress: ipAddress ?? null,
  };
}
