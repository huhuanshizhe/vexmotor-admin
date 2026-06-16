'use client';

import { SessionProvider } from 'next-auth/react';
import type { PropsWithChildren } from 'react';

export function AdminSessionProvider({ children }: PropsWithChildren) {
  return <SessionProvider basePath="/api/admin/auth">{children}</SessionProvider>;
}
