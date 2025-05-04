import 'next-auth';
import { DefaultSession, DefaultUser } from 'next-auth';
import { ROLE_ENUM } from '@/database/schema';

type Role = (typeof ROLE_ENUM.enumValues)[number];

declare module 'next-auth' {
  interface User extends DefaultUser {
    role: Role;
    // Add other custom fields here if needed
  }

  interface Session extends DefaultSession {
    user: {
      id: string;
      role: Role;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string;
    role: Role;
  }
}
