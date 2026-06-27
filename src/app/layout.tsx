import 'antd/dist/reset.css';

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import type { PropsWithChildren } from 'react';

import { AdminDebugModeProvider } from '@/components/providers/admin-debug-mode-provider';
import { AntdProvider } from '@/components/providers/antd-provider';
import { AdminSessionProvider } from '@/components/providers/session-provider';

import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'VexMotor Admin',
  description: 'VexMotor administration console',
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <AdminSessionProvider>
          <AdminDebugModeProvider>
            <AntdProvider>{children}</AntdProvider>
          </AdminDebugModeProvider>
        </AdminSessionProvider>
      </body>
    </html>
  );
}
