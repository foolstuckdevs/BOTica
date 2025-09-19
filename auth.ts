export const runtime = 'nodejs';
import NextAuth, { User } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { db } from './database/drizzle';
import { users } from './database/schema';
import { eq } from 'drizzle-orm';
import { compare } from 'bcryptjs';

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
  ],
  pages: {
    signIn: 'signIn',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.name = user.name;
        token.role = user.role;
        token.pharmacyId = (user as User & { pharmacyId: number }).pharmacyId;
        // Set expiration based on remember me preference
        const rememberMe =
          (user as { rememberMe?: boolean })?.rememberMe || false;
        if (rememberMe) {
          token.exp = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // 30 days
        } else {
          token.exp = Math.floor(Date.now() / 1000) + 8 * 60 * 60; // 8 hours
        }
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
      return session;
    },
  },
  events: {
    // refresh token issuance handled in custom sign-in server action now
  },
});
