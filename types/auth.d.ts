// import 'next-auth';
// import { DefaultSession, DefaultUser } from 'next-auth';
// import { JWT as DefaultJWT } from 'next-auth/jwt';
// import { ROLE_ENUM } from '@/database/schema';

// type Role = (typeof ROLE_ENUM.enumValues)[number];

// declare module 'next-auth' {
//   interface User extends DefaultUser {
//     role: Role;
//   }

//   interface Session extends DefaultSession {
//     user: {
//       id: string;
//       role: Role;
//     } & DefaultSession['user'];
//   }
// }

// declare module 'next-auth/jwt' {
//   interface JWT extends DefaultJWT {
//     id: string;
//     role: Role;
//   }
// }

import 'next-auth';
import { DefaultSession, DefaultUser } from 'next-auth';
import { JWT as DefaultJWT } from 'next-auth/jwt';
import { ROLE_ENUM } from '@/database/schema';

// Define the Role enum type
type Role = (typeof ROLE_ENUM.enumValues)[number];

declare module 'next-auth' {
  interface User extends DefaultUser {
    role: Role;
    pharmacyId: number; // ✅ Add this line
  }

  interface Session extends DefaultSession {
    user: {
      id: string;
      role: Role;
      pharmacyId: number; // ✅ Add this line
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string;
    role: Role;
    pharmacyId: number; // ✅ Add this line
  }
}
