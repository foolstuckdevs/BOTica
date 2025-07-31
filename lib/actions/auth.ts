// all functions here will only be called on the server side
'use server';

import { signIn } from '@/auth';
import { db } from '@/database/drizzle';
import { users } from '@/database/schema';
import { AuthCredentials } from '@/types';
import { hash } from 'bcryptjs';
import { eq } from 'drizzle-orm';

export const signInWithCredentials = async (
  params: Pick<AuthCredentials, 'email' | 'password'>,
) => {
  const { email, password } = params;

  try {
    // First verify user exists and password is correct manually
    const userRecord = await db
      .select({
        id: users.id,
        email: users.email,
        password: users.password,
        role: users.role,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (userRecord.length === 0) {
      return { success: false, error: 'Invalid email or password' };
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
    console.log(error, 'Signin error');
    return { success: false, error: 'An error occurred during sign in' };
  }
};

export const signUp = async (params: AuthCredentials) => {
  const { fullName, email, password } = params;

  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser.length > 0) {
    return { success: false, error: 'User already exists' };
  }

  const hashedPassword = await hash(password, 10);

  const pharmacyId = 1; // HARD CODED FOR NOW REPLACE THIS IN THE FUTURE REMEMBER

  try {
    await db.insert(users).values({
      fullName,
      email,
      password: hashedPassword,
      pharmacyId,
    });

    await signInWithCredentials({ email, password });
    return { success: true };
  } catch (error) {
    console.log(error, 'Singup error');
    return { success: false, error: 'Signup error' };
  }
};
