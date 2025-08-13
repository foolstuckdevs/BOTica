// all functions here will only be called on the server side
'use server';

import { signIn } from '@/auth';
import { db } from '@/database/drizzle';
import { users } from '@/database/schema';
import { AuthCredentials } from '@/types';
import { signInSchema } from '@/lib/validations';
import { eq } from 'drizzle-orm';

export const signInWithCredentials = async (
  params: Pick<AuthCredentials, 'email' | 'password'>,
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

    // Now proceed with NextAuth signIn
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      console.log('NextAuth signIn error:', result.error);
      return { success: false, error: 'Authentication failed' };
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
