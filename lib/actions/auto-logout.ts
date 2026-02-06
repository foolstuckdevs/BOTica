'use server';

import { auth } from '@/auth';
import { logActivity } from '@/lib/actions/activity';

/**
 * Logs the auto-logout activity when user is signed out due to inactivity
 * Call this BEFORE signing out to ensure activity is logged
 */
export async function logAutoLogout() {
  try {
    const session = await auth();
    const pharmacyId = session?.user?.pharmacyId as number | undefined;
    const email = session?.user?.email as string | undefined;
    const userId = session?.user?.id as string | undefined;

    if (pharmacyId && userId) {
      await logActivity({
        action: 'AUTH_AUTO_SIGNOUT',
        pharmacyId,
        userId,
        details: { email, reason: 'inactivity' },
      });
    }
  } catch (error) {
    console.error('Failed to log AUTH_AUTO_SIGNOUT:', error);
  }
}
