import { randomBytes, createHash } from 'crypto';
import { addDays, addHours } from 'date-fns';
import { db } from '@/database/drizzle';
import { refreshTokens } from '@/database/schema';
import { eq, and, isNull } from 'drizzle-orm';

// CONFIG
const REFRESH_TOKEN_LENGTH_BYTES = 48; // 64 chars base64url-ish after encoding
const DEFAULT_REFRESH_DAYS = 30; // long-lived remember-me
const SHORT_REFRESH_HOURS = 12; // non remember-me

export interface GenerateRefreshTokenOptions {
  userId: string;
  rememberMe: boolean;
}

export interface RefreshTokenRecord {
  token: string; // raw (only returned at creation)
  expiresAt: Date;
}

function hash(raw: string) {
  return createHash('sha256').update(raw).digest('hex');
}

export async function createRefreshToken(
  opts: GenerateRefreshTokenOptions,
): Promise<RefreshTokenRecord> {
  const raw = randomBytes(REFRESH_TOKEN_LENGTH_BYTES).toString('hex');
  const tokenHash = hash(raw);
  const expiresAt = opts.rememberMe
    ? addDays(new Date(), DEFAULT_REFRESH_DAYS)
    : addHours(new Date(), SHORT_REFRESH_HOURS);

  await db.insert(refreshTokens).values({
    userId: opts.userId,
    tokenHash,
    expiresAt,
  });

  return { token: raw, expiresAt };
}

export async function verifyRefreshToken(raw: string, userId: string) {
  const tokenHash = hash(raw);
  const rows = await db
    .select()
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.userId, userId),
        eq(refreshTokens.tokenHash, tokenHash),
        isNull(refreshTokens.revokedAt),
      ),
    )
    .limit(1);
  const rec = rows[0];
  if (!rec) return null;
  if (rec.expiresAt && new Date(rec.expiresAt) < new Date()) return null;
  return rec;
}

export async function rotateRefreshToken(oldRaw: string, userId: string) {
  const oldHash = hash(oldRaw);
  const newRaw = randomBytes(REFRESH_TOKEN_LENGTH_BYTES).toString('hex');
  const newHash = hash(newRaw);
  const expiresAt = addDays(new Date(), DEFAULT_REFRESH_DAYS);

  await db.transaction(async (tx) => {
    // Revoke old
    await tx
      .update(refreshTokens)
      .set({ revokedAt: new Date(), replacedByTokenHash: newHash })
      .where(
        and(
          eq(refreshTokens.userId, userId),
          eq(refreshTokens.tokenHash, oldHash),
        ),
      );
    // Insert new
    await tx.insert(refreshTokens).values({
      userId,
      tokenHash: newHash,
      expiresAt,
    });
  });

  return { token: newRaw, expiresAt };
}

export async function revokeAllUserRefreshTokens(userId: string) {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)),
    );
}

export function setRefreshTokenCookie(
  resHeaders: Headers,
  raw: string,
  expires: Date,
) {
  // Secure cookie flags (HttpOnly, Secure in production, SameSite=Lax)
  const serialized = `rt=${raw}; Path=/; HttpOnly; SameSite=Lax; Expires=${expires.toUTCString()}${
    process.env.NODE_ENV !== 'development' ? '; Secure' : ''
  }`;
  resHeaders.append('Set-Cookie', serialized);
}

export function clearRefreshTokenCookie(resHeaders: Headers) {
  resHeaders.append(
    'Set-Cookie',
    'rt=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax',
  );
}

export function needsRefresh(tokenExp?: number) {
  if (!tokenExp) return true;
  const now = Date.now() / 1000;
  const threshold = 5 * 60; // 5 minutes to expiry
  return tokenExp - now < threshold;
}
