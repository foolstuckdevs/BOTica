// import NextAuth, { User } from 'next-auth';
// import CredentialsProvider from 'next-auth/providers/credentials';
// import { db } from './database/drizzle';
// import { users } from './database/schema';
// import { eq } from 'drizzle-orm';
// import { compare } from 'bcryptjs';

// export const { handlers, signIn, signOut, auth } = NextAuth({
//   session: {
//     strategy: 'jwt',
//   },
//   providers: [
//     CredentialsProvider({
//       async authorize(credentials) {
//         if (!credentials?.email || !credentials?.password) {
//           return null;
//         }

//         const user = await db
//           .select({
//             id: users.id,
//             fullName: users.fullName,
//             email: users.email,
//             passwordHash: users.password,
//             role: users.role,
//           })
//           .from(users)
//           .where(eq(users.email, credentials.email.toString()))
//           .limit(1);

//         if (user.length === 0) return null;

//         const isPasswordValid = await compare(
//           credentials.password.toString(),
//           user[0].passwordHash,
//         );

//         if (!isPasswordValid) return null;

//         return {
//           id: user[0].id.toString(),
//           email: user[0].email,
//           name: user[0].fullName,
//           role: user[0].role,
//         } as User;
//       },
//     }),
//   ],
//   pages: {
//     signIn: 'signIn',
//   },
//   callbacks: {
//     async jwt({ token, user }) {
//       if (user) {
//         token.id = user.id as string;
//         token.name = user.name;
//         token.role = user.role;
//       }
//       return token;
//     },
//     async session({ session, token }) {
//       if (session.user) {
//         session.user.id = token.id as string;
//         session.user.name = token.name as string;
//         session.user.role = token.role;
//       }
//       return session;
//     },
//   },
// });

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
            pharmacyId: users.pharmacyId,
          })
          .from(users)
          .where(eq(users.email, credentials.email.toString()))
          .limit(1);

        if (user.length === 0) return null;

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
          pharmacyId: user[0].pharmacyId,
        } as User & { pharmacyId: number };
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
        token.pharmacyId = (user as any).pharmacyId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.role = token.role;
        session.user.pharmacyId = token.pharmacyId as number;
      }
      return session;
    },
  },
});
