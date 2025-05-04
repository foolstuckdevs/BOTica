import NextAuth, { User } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { db } from './database/drizzle';
import { users } from './database/schema';
import { eq } from 'drizzle-orm';
import { compare } from 'bcryptjs';

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: {
    strategy: 'jwt',
  },
  providers: [
    CredentialsProvider({
      // Custom authorize function for validating user credentials
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await db
          .select({
            id: users.id,
            fullName: users.fullName,
            email: users.email,
            passwordHash: users.password,
            role: users.role,
          })
          .from(users)
          .where(eq(users.email, credentials.email.toString()))
          .limit(1);

        // If no matching user is found deny access
        if (user.length === 0) return null;

        // Validate the entered password against the stored password
        const isPasswordValid = await compare(
          credentials.password.toString(),
          user[0].passwordHash,
        );

        if (!isPasswordValid) return null;

        return {
          id: user[0].id.toString(),
          email: user[0].email,
          name: user[0].fullName,
          role: user[0].role,
        } as User;
      },
    }),
  ],

  // Define custom routes for authentication pages
  pages: {
    signIn: 'signIn',
  },
  callbacks: {
    async jwt({ token, user }) {
      // if user exist attach user info to token
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
});
