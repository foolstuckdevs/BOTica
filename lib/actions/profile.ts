'use server';

import { auth } from '@/auth';
import { db } from '@/database/drizzle';
import { users } from '@/database/schema';
import { eq } from 'drizzle-orm';
import { hash, compare } from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { profileUpdateSchema, passwordChangeSchema } from '@/lib/validations';

export async function updateProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  const fullName = String(formData.get('fullName') || '').trim();
  const email = String(formData.get('email') || '').trim();

  // Validate using dedicated profile schema
  const parsed = profileUpdateSchema.safeParse({ fullName, email });
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message || 'Invalid data.';
    return { ok: false, message: firstError };
  }

  await db
    .update(users)
    .set({ fullName, email })
    .where(eq(users.id, session.user.id));
  revalidatePath('/profile');
  return { ok: true, message: 'Profile updated.' };
}

export async function updatePassword(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  const currentPassword = String(formData.get('currentPassword') || '');
  const newPassword = String(formData.get('newPassword') || '');
  const confirmPassword = String(formData.get('confirmPassword') || '');

  // Validate password change using dedicated schema
  const parsed = passwordChangeSchema.safeParse({
    currentPassword,
    newPassword,
    confirmPassword,
  });
  if (!parsed.success) {
    const firstError =
      parsed.error.issues[0]?.message || 'Invalid password data.';
    return { ok: false, message: firstError };
  }

  const [user] = await db
    .select({ id: users.id, password: users.password })
    .from(users)
    .where(eq(users.id, session.user.id));

  if (!user) return { ok: false, message: 'User not found.' };

  const valid = await compare(currentPassword, user.password);
  if (!valid) return { ok: false, message: 'Current password is incorrect.' };

  const newHash = await hash(newPassword, 10);
  await db
    .update(users)
    .set({ password: newHash })
    .where(eq(users.id, user.id));
  revalidatePath('/profile');
  return { ok: true, message: 'Password updated.' };
}
