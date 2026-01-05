import { DefaultSession } from 'next-auth';
import { JWT as DefaultJWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    rememberMe?: boolean;
    user: DefaultSession['user'] & {
      id?: string;
      role?: 'Admin' | 'Pharmacy Assistant';
      pharmacyId?: number;
    };
  }

  interface User {
    rememberMe?: boolean;
    role?: 'Admin' | 'Pharmacy Assistant';
    pharmacyId?: number;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    rememberMe?: boolean;
    role?: 'Admin' | 'Pharmacy Assistant';
    pharmacyId?: number;
  }
}
