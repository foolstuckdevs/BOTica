import { randomBytes, createHash } from 'crypto';
import { addMinutes } from 'date-fns';
import { db } from '@/database/drizzle';
import { passwordResetTokens } from '@/database/schema';
import { and, eq, isNull } from 'drizzle-orm';

const RESET_TOKEN_LENGTH_BYTES = 32;
export const PASSWORD_RESET_TOKEN_EXPIRATION_MINUTES = 60;

function hash(raw: string) {
  return createHash('sha256').update(raw).digest('hex');
}

export async function invalidatePasswordResetTokens(userId: string) {
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(passwordResetTokens.userId, userId),
        isNull(passwordResetTokens.usedAt),
      ),
    );
}

export async function createPasswordResetToken(userId: string) {
  const raw = randomBytes(RESET_TOKEN_LENGTH_BYTES).toString('hex');
  const tokenHash = hash(raw);
  const expiresAt = addMinutes(
    new Date(),
    PASSWORD_RESET_TOKEN_EXPIRATION_MINUTES,
  );

  await db.insert(passwordResetTokens).values({
    userId,
    tokenHash,
    expiresAt,
  });

  return { token: raw, expiresAt };
}

export async function verifyPasswordResetToken(raw: string) {
  const tokenHash = hash(raw);
  const rows = await db
    .select({
      id: passwordResetTokens.id,
      userId: passwordResetTokens.userId,
      expiresAt: passwordResetTokens.expiresAt,
      usedAt: passwordResetTokens.usedAt,
    })
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.tokenHash, tokenHash))
    .limit(1);

  const record = rows[0];
  if (!record) {
    return null;
  }

  if (record.usedAt) {
    return null;
  }

  if (record.expiresAt && new Date(record.expiresAt) < new Date()) {
    return null;
  }

  return record;
}

export async function markPasswordResetTokenUsed(id: number) {
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, id));
}
