import { DefaultSession } from 'next-auth';
import { JWT as DefaultJWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    rememberMe?: boolean;
    user: DefaultSession['user'] & {
      id?: string;
      role?: 'Admin' | 'Pharmacist';
      pharmacyId?: number;
    };
  }

  interface User {
    rememberMe?: boolean;
    role?: 'Admin' | 'Pharmacist';
    pharmacyId?: number;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    rememberMe?: boolean;
    role?: 'Admin' | 'Pharmacist';
    pharmacyId?: number;
  }
}
