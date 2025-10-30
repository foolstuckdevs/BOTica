'use server';

import { signOut } from '@/auth';
import { auth } from '@/auth';
import { logActivity } from '@/lib/actions/activity';
import { cookies } from 'next/headers';
import { revokeRefreshToken } from '@/lib/auth/refresh-tokens';

export async function signOutAction() {
  try {
    const session = await auth();
    const pharmacyId = session?.user?.pharmacyId as number | undefined;
    const email = session?.user?.email as string | undefined;
    const userId = session?.user?.id as string | undefined;
    try {
      const store = await cookies();
      const token = store.get('rt')?.value;
      if (token) {
        await revokeRefreshToken(token, userId);
      }
      store.set({
        name: 'rt',
        value: '',
        path: '/',
        maxAge: 0,
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV !== 'development',
      });
    } catch (cookieError) {
      console.error(
        'Failed to revoke refresh token during sign-out:',
        cookieError,
      );
    }
    if (pharmacyId) {
      await logActivity({
        action: 'AUTH_SIGNOUT',
        pharmacyId,
        details: { email },
      });
    }
  } catch (e) {
    console.error('Failed to log AUTH_SIGNOUT:', e);
  } finally {
    await signOut();
  }
}
