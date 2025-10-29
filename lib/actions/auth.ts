// all functions here will only be called on the server side
'use server';

import { signIn } from '@/auth';
import { cookies } from 'next/headers';
import { createRefreshToken } from '@/lib/auth/refresh-tokens';
import { db } from '@/database/drizzle';
import { users } from '@/database/schema';
import { AuthCredentials } from '@/types';
import {
  passwordResetRequestSchema,
  passwordResetSchema,
  signInSchema,
} from '@/lib/validations';
import { eq } from 'drizzle-orm';
import { logActivity } from '@/lib/actions/activity';
import {
  createPasswordResetToken,
  invalidatePasswordResetTokens,
  markPasswordResetTokenUsed,
  PASSWORD_RESET_TOKEN_EXPIRATION_MINUTES,
  verifyPasswordResetToken,
} from '@/lib/auth/password-reset';
import { sendPasswordResetEmail } from '@/lib/email/sendPasswordReset';
import { revokeAllUserRefreshTokens } from '@/lib/auth/refresh-tokens';

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

export const requestPasswordReset = async (params: { email: string }) => {
  try {
    const { email } = passwordResetRequestSchema.parse(params);

    const userRows = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        pharmacyId: users.pharmacyId,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    const user = userRows[0];

    if (!user || user.isActive === false) {
      // Always respond with success to avoid account discovery.
      return { success: true } as const;
    }

    await invalidatePasswordResetTokens(user.id as string);
    const { token } = await createPasswordResetToken(user.id as string);

    const resetLink = `${resolveAppBaseUrl()}/reset-password?token=${token}`;

    await sendPasswordResetEmail({
      to: user.email,
      fullName: user.fullName,
      resetLink,
      expiresInMinutes: PASSWORD_RESET_TOKEN_EXPIRATION_MINUTES,
    });

    try {
      await logActivity({
        action: 'AUTH_PASSWORD_RESET_REQUEST',
        pharmacyId: user.pharmacyId,
        userId: user.id as string,
        details: { email, via: 'email_link' },
      });
    } catch (activityError) {
      console.error('Failed to log password reset request:', activityError);
    }

    return { success: true } as const;
  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      const zodError = error as { issues: Array<{ message: string }> };
      const firstIssue = zodError.issues?.[0];
      return {
        success: false,
        error: firstIssue?.message || 'Invalid input data',
      } as const;
    }

    console.error('Password reset request failed:', error);
    return {
      success: false,
      error: 'Unable to process password reset request',
    } as const;
  }
};

export const resetPassword = async (params: {
  token: string;
  password: string;
  confirmPassword: string;
}) => {
  try {
    const validated = passwordResetSchema.parse(params);

    const tokenRecord = await verifyPasswordResetToken(validated.token);
    if (!tokenRecord) {
      return {
        success: false,
        error: 'Reset link is invalid or has expired',
      } as const;
    }

    const userRows = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        pharmacyId: users.pharmacyId,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.id, tokenRecord.userId))
      .limit(1);

    const user = userRows[0];

    if (!user || user.isActive === false) {
      return {
        success: false,
        error: 'Account is unavailable',
      } as const;
    }

    const { hash } = await import('bcryptjs');
    const hashedPassword = await hash(validated.password, 10);

    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, user.id));

    await markPasswordResetTokenUsed(tokenRecord.id);
    await invalidatePasswordResetTokens(user.id as string);
    await revokeAllUserRefreshTokens(user.id as string);

    try {
      await logActivity({
        action: 'AUTH_PASSWORD_RESET',
        pharmacyId: user.pharmacyId,
        userId: user.id as string,
        details: { email: user.email },
      });
    } catch (activityError) {
      console.error('Failed to log password reset:', activityError);
    }

    return { success: true } as const;
  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      const zodError = error as { issues: Array<{ message: string }> };
      const firstIssue = zodError.issues?.[0];
      return {
        success: false,
        error: firstIssue?.message || 'Invalid input data',
      } as const;
    }

    console.error('Password reset failed:', error);
    return {
      success: false,
      error: 'Unable to reset password',
    } as const;
  }
};

function resolveAppBaseUrl() {
  const base =
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_API_ENDPOINT ||
    process.env.NEXTAUTH_URL ||
    'http://localhost:3000';

  return base.endsWith('/') ? base.slice(0, -1) : base;
}
