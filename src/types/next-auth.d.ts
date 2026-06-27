import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role?: 'admin' | 'super_admin';
    } & DefaultSession['user'];
  }

  interface User {
    role?: 'admin' | 'super_admin';
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: 'admin' | 'super_admin';
  }
}
