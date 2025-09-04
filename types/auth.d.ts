import 'next-auth';
import { DefaultSession, DefaultUser } from 'next-auth';
import { JWT as DefaultJWT } from 'next-auth/jwt';
import { ROLE_ENUM } from '@/database/schema';

// Define the Role enum type
type Role = (typeof ROLE_ENUM.enumValues)[number];

declare module 'next-auth' {
  interface User extends DefaultUser {
    role: Role;
    pharmacyId: number;
  }

  interface Session extends DefaultSession {
    user: {
      id: string;
      role: Role;
      pharmacyId: number;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string;
    role: Role;
    pharmacyId: number;
  }
}

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name: string;
      email?: string;
      image?: string;
      role: string;
      pharmacyId: number;
    };
  }
}
