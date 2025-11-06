import { addDays, addHours } from 'date-fns';
import { db } from '@/database/drizzle';
import { refreshTokens } from '@/database/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { needsRefresh } from './token-utils';

// CONFIG
const REFRESH_TOKEN_LENGTH_BYTES = 48; // 64 chars base64url-ish after encoding
const DEFAULT_REFRESH_DAYS = 30; // long-lived remember-me
const SHORT_REFRESH_HOURS = 12; // non remember-me

export interface RefreshTokenMetadata {
  userAgent?: string | null;
  ipAddress?: string | null;
}

export interface GenerateRefreshTokenOptions {
  userId: string;
  rememberMe: boolean;
  metadata?: RefreshTokenMetadata;
}

export interface RefreshTokenRecord {
  token: string; // raw (only returned at creation)
  expiresAt: Date;
}

function getCrypto() {
  const cryptoImpl = globalThis.crypto;
  if (!cryptoImpl || !cryptoImpl.getRandomValues || !cryptoImpl.subtle) {
    throw new Error(
      'Cryptographic primitives are unavailable in this runtime.',
    );
  }
  return cryptoImpl;
}

function randomHex(byteLength: number) {
  const cryptoImpl = getCrypto();
  const bytes = new Uint8Array(byteLength);
  cryptoImpl.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hash(raw: string) {
  const cryptoImpl = getCrypto();
  const encoder = new TextEncoder();
  const data = encoder.encode(raw);
  const digest = await cryptoImpl.subtle.digest('SHA-256', data);
  const hashBytes = new Uint8Array(digest);
  return Array.from(hashBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function computeExpiry(rememberMe: boolean) {
  return rememberMe
    ? addDays(new Date(), DEFAULT_REFRESH_DAYS)
    : addHours(new Date(), SHORT_REFRESH_HOURS);
}

export async function createRefreshToken(
  opts: GenerateRefreshTokenOptions,
): Promise<RefreshTokenRecord> {
  const raw = randomHex(REFRESH_TOKEN_LENGTH_BYTES);
  const tokenHash = await hash(raw);
  const expiresAt = computeExpiry(opts.rememberMe);
  const metadata = opts.metadata ?? {};

  await db.insert(refreshTokens).values({
    userId: opts.userId,
    tokenHash,
    expiresAt,
    createdUserAgent: metadata.userAgent ?? null,
    createdIp: metadata.ipAddress ?? null,
    lastUsedAt: new Date(),
    lastUsedIp: metadata.ipAddress ?? null,
    lastUsedUserAgent: metadata.userAgent ?? null,
  });

  return { token: raw, expiresAt };
}

export async function verifyRefreshToken(
  raw: string,
  userId: string,
  metadata?: RefreshTokenMetadata,
) {
  const tokenHash = await hash(raw);
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
  await db
    .update(refreshTokens)
    .set({
      lastUsedAt: new Date(),
      lastUsedIp: metadata?.ipAddress ?? rec.lastUsedIp ?? null,
      lastUsedUserAgent: metadata?.userAgent ?? rec.lastUsedUserAgent ?? null,
    })
    .where(eq(refreshTokens.id, rec.id));
  return rec;
}

export async function rotateRefreshToken(
  oldRaw: string,
  userId: string,
  opts: { rememberMe: boolean; metadata?: RefreshTokenMetadata },
) {
  const oldHash = await hash(oldRaw);
  const newRaw = randomHex(REFRESH_TOKEN_LENGTH_BYTES);
  const newHash = await hash(newRaw);
  const expiresAt = computeExpiry(opts.rememberMe);

  await db.transaction(async (tx) => {
    // Revoke old
    await tx
      .update(refreshTokens)
      .set({
        revokedAt: new Date(),
        replacedByTokenHash: newHash,
        lastUsedAt: new Date(),
        lastUsedIp: opts.metadata?.ipAddress ?? null,
        lastUsedUserAgent: opts.metadata?.userAgent ?? null,
      })
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
      createdUserAgent: opts.metadata?.userAgent ?? null,
      createdIp: opts.metadata?.ipAddress ?? null,
      lastUsedAt: new Date(),
      lastUsedIp: opts.metadata?.ipAddress ?? null,
      lastUsedUserAgent: opts.metadata?.userAgent ?? null,
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

export async function revokeRefreshToken(raw: string, userId?: string) {
  const tokenHash = await hash(raw);
  const whereClause = userId
    ? and(
        eq(refreshTokens.tokenHash, tokenHash),
        eq(refreshTokens.userId, userId),
        isNull(refreshTokens.revokedAt),
      )
    : and(
        eq(refreshTokens.tokenHash, tokenHash),
        isNull(refreshTokens.revokedAt),
      );

  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(whereClause);
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

export { needsRefresh };
