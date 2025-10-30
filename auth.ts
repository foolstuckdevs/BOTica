export const runtime = 'nodejs';
import NextAuth, { User } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { db } from './database/drizzle';
import { users } from './database/schema';
import { eq } from 'drizzle-orm';
import { compare } from 'bcryptjs';
import { cookies, headers } from 'next/headers';
import {
  createRefreshToken,
  RefreshTokenMetadata,
} from '@/lib/auth/refresh-tokens';
import { logActivity } from '@/lib/actions/activity';

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days for remembered sessions, will be overridden for regular sessions
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        rememberMe: { label: 'Remember Me', type: 'text' },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            console.log('Missing credentials');
            return null;
          }

          const user = await db
            .select({
              id: users.id,
              fullName: users.fullName,
              email: users.email,
              passwordHash: users.password,
              role: users.role,
              pharmacyId: users.pharmacyId,
              isActive: users.isActive,
            })
            .from(users)
            .where(eq(users.email, credentials.email.toString()))
            .limit(1);

          if (user.length === 0) {
            console.log('User not found:', credentials.email);
            return null;
          }

          // Check if user account is active
          if (user[0].isActive === false) {
            console.log('Account is deactivated:', credentials.email);
            return null;
          }

          const isPasswordValid = await compare(
            credentials.password.toString(),
            user[0].passwordHash,
          );

          if (!isPasswordValid) {
            console.log('Invalid password for user:', credentials.email);
            return null;
          }

          console.log('User authenticated successfully:', user[0].email);
          return {
            id: user[0].id.toString(),
            email: user[0].email,
            name: user[0].fullName,
            role: user[0].role,
            pharmacyId: user[0].pharmacyId,
            rememberMe: credentials.rememberMe === 'true',
          } as User & { pharmacyId: number; rememberMe: boolean };
        } catch (error) {
          console.error('Error during authentication:', error);
          return null;
        }
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          }),
        ]
      : []),
  ],
  pages: {
    signIn: 'signIn',
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!account) {
        return true;
      }

      if (account.provider !== 'google') {
        return true;
      }

      if (!user.email) {
        console.warn('Google sign-in attempted without an email address');
        return '/sign-in?error=GOOGLE_NO_EMAIL';
      }

      try {
        const rows = await db
          .select({
            id: users.id,
            fullName: users.fullName,
            email: users.email,
            role: users.role,
            pharmacyId: users.pharmacyId,
            isActive: users.isActive,
          })
          .from(users)
          .where(eq(users.email, user.email))
          .limit(1);

        const record = rows[0];

        if (!record) {
          return '/sign-in?error=ACCOUNT_NOT_PROVISIONED';
        }

        if (record.isActive === false) {
          return '/sign-in?error=ACCOUNT_INACTIVE';
        }

        const enrichedUser = user as User & {
          pharmacyId?: number;
          role?: (typeof record)['role'];
          rememberMe?: boolean;
        };

        enrichedUser.id = record.id as string;
        enrichedUser.email = record.email ?? enrichedUser.email;
        enrichedUser.name = record.fullName ?? enrichedUser.name;
        enrichedUser.role = record.role;
        enrichedUser.pharmacyId = record.pharmacyId as number;
        enrichedUser.rememberMe = false;

        try {
          const metadata = await extractClientMetadata();
          const store = await cookies();
          const { token: raw, expiresAt } = await createRefreshToken({
            userId: record.id as string,
            rememberMe: false,
            metadata,
          });

          store.set({
            name: 'rt',
            value: raw,
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV !== 'development',
            path: '/',
            expires: expiresAt,
          });
        } catch (tokenError) {
          console.error(
            'Failed to establish refresh token during Google sign-in:',
            tokenError,
          );
          return '/sign-in?error=SESSION_INIT_FAILED';
        }

        try {
          await logActivity({
            action: 'AUTH_SIGNIN',
            pharmacyId: record.pharmacyId as number,
            userId: record.id as string,
            details: { provider: 'google', email: record.email },
          });
        } catch (activityError) {
          console.error('Failed to log Google sign-in:', activityError);
        }

        return true;
      } catch (error) {
        console.error('Unhandled Google sign-in error:', error);
        return '/sign-in?error=GOOGLE_AUTH_ERROR';
      }
    },
    async jwt({ token, user, trigger, session }) {
      const now = Math.floor(Date.now() / 1000);
      const getDuration = (remember: boolean) =>
        remember ? 30 * 24 * 60 * 60 : 12 * 60 * 60;

      if (user) {
        const rememberMe =
          (user as User & { rememberMe?: boolean })?.rememberMe ?? false;
        token.id = user.id as string;
        token.name = user.name;
        token.role = user.role;
        token.pharmacyId = (user as User & { pharmacyId: number }).pharmacyId;
        (token as { rememberMe?: boolean }).rememberMe = rememberMe;
        token.exp = now + getDuration(rememberMe);
        return token;
      }

      if (trigger === 'update') {
        const rememberMe =
          (session as { rememberMe?: boolean })?.rememberMe ??
          (token as { rememberMe?: boolean }).rememberMe ??
          false;
        (token as { rememberMe?: boolean }).rememberMe = rememberMe;
        token.exp = now + getDuration(rememberMe);
        return token;
      }

      if (!('exp' in token) || typeof token.exp !== 'number') {
        const rememberMe =
          (token as { rememberMe?: boolean }).rememberMe ?? false;
        token.exp = now + getDuration(rememberMe);
      }

      return token;
    },
    async session({ session, token }) {
      // Always hydrate latest user info from DB so profile changes reflect immediately
      if (session.user && token.id) {
        try {
          const dbUser = await db
            .select({
              id: users.id,
              fullName: users.fullName,
              email: users.email,
              role: users.role,
              pharmacyId: users.pharmacyId,
            })
            .from(users)
            .where(eq(users.id, token.id as string))
            .limit(1);

          if (dbUser[0]) {
            session.user.id = dbUser[0].id as string;
            session.user.name = dbUser[0].fullName as string;
            session.user.email = dbUser[0].email as string;
            session.user.role = dbUser[0].role;
            session.user.pharmacyId = dbUser[0].pharmacyId as number;
            return session;
          }
        } catch {
          // fallback to token if db fails
        }
        session.user.id = token.id as string;
        session.user.name = (token.name as string) || session.user.name;
        session.user.role = token.role;
        session.user.pharmacyId = token.pharmacyId as number;
      }
      (session as typeof session & { rememberMe?: boolean }).rememberMe =
        (token as { rememberMe?: boolean }).rememberMe ?? false;
      return session;
    },
  },
  events: {
    // refresh token issuance handled in custom sign-in server action now
  },
});

async function extractClientMetadata(): Promise<RefreshTokenMetadata> {
  const headerList = await headers();
  const userAgent = headerList.get('user-agent') ?? null;
  const forwardedFor = headerList.get('x-forwarded-for');
  const ipAddress = forwardedFor
    ? forwardedFor.split(',')[0]?.trim() ?? null
    : headerList.get('x-real-ip');

  return {
    userAgent,
    ipAddress: ipAddress ?? null,
  };
}
