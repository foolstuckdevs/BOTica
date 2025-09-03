'use server';

import { signOut } from '@/auth';
import { auth } from '@/auth';
import { logActivity } from '@/lib/actions/activity';

export async function signOutAction() {
  try {
    const session = await auth();
    const pharmacyId = session?.user?.pharmacyId as number | undefined;
    const email = session?.user?.email as string | undefined;
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
