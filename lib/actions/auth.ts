// all functions here will only be called on the server side
'use server';

import { signIn } from '@/auth';
import { cookies } from 'next/headers';
import { createRefreshToken } from '@/lib/auth/refresh-tokens';
import { db } from '@/database/drizzle';
import { users } from '@/database/schema';
import { AuthCredentials } from '@/types';
import { signInSchema } from '@/lib/validations';
import { eq } from 'drizzle-orm';
import { logActivity } from '@/lib/actions/activity';

export const signInWithCredentials = async (
  params: Pick<AuthCredentials, 'email' | 'password'>,
  rememberMe: boolean = false,
) => {
  try {
    // Validate input with Zod
    const validatedData = signInSchema.parse(params);
    const { email, password } = validatedData;

    // First verify user exists and password is correct manually
    const userRecord = await db
      .select({
        id: users.id,
        email: users.email,
        password: users.password,
        role: users.role,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (userRecord.length === 0) {
      return { success: false, error: 'Invalid email or password' };
    }

    // Check if account is active
    if (userRecord[0].isActive === false) {
      return {
        success: false,
        error:
          'Your account has been deactivated. Please contact your administrator.',
      };
    }

    // Verify password
    const { compare } = await import('bcryptjs');
    const isPasswordValid = await compare(password, userRecord[0].password);

    if (!isPasswordValid) {
      return { success: false, error: 'Invalid email or password' };
    }

    console.log('SignIn attempt with rememberMe:', rememberMe);

    // Now proceed with NextAuth signIn
    const result = await signIn('credentials', {
      email,
      password,
      rememberMe: rememberMe.toString(),
      redirect: false,
    });

    if (result?.error) {
      console.log('NextAuth signIn error:', result.error);
      return { success: false, error: 'Authentication failed' };
    }

    // Issue refresh token + cookie (HttpOnly)
    try {
      const { token: rtRaw, expiresAt } = await createRefreshToken({
        userId: userRecord[0].id,
        rememberMe,
      });
      const store = await cookies();
      store.set({
        name: 'rt',
        value: rtRaw,
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV !== 'development',
        path: '/',
        expires: expiresAt,
      });
    } catch (e) {
      console.error('Failed to create refresh token', e);
      return { success: false, error: 'Failed to establish session (RT).' };
    }

    // Log sign in activity with verified user record (session may not be hydrated yet)
    try {
      // fetch user's pharmacyId for logging
      const userRow = await db
        .select({ id: users.id, pharmacyId: users.pharmacyId })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      const pharmacyId = userRow[0]?.pharmacyId as number | undefined;
      const uid = userRow[0]?.id as string | undefined;
      if (pharmacyId && uid) {
        await logActivity({
          action: 'AUTH_SIGNIN',
          pharmacyId,
          userId: uid,
          details: { email },
        });
      }
    } catch (e) {
      console.error('Failed to log AUTH_SIGNIN:', e);
    }

    return { success: true, role: userRecord[0].role };
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof Error && 'issues' in error) {
      const zodError = error as { issues: Array<{ message: string }> };
      const firstIssue = zodError.issues?.[0];
      return {
        success: false,
        error: firstIssue?.message || 'Invalid input data',
      };
    }

    console.log(error, 'Signin error');
    return { success: false, error: 'An error occurred during sign in' };
  }
};
