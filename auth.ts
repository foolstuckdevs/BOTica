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
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
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
          } as User & { pharmacyId: number };
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
