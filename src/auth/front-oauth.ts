import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

import { getFrontOAuthCallbackUrl } from '@/lib/app-urls';
import { signFrontAccessToken } from '@/lib/auth/jwt';
import { linkOAuthAccount } from '@/server/auth/oauth-users';

const providers = [];
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  );
}

export const { handlers: oauthHandlers } = NextAuth({
  trustHost: true,
  basePath: '/api/front/auth/oauth',
  secret: process.env.AUTH_SECRET,
  providers,
  callbacks: {
    async signIn({ user, account }) {
      if (!account?.provider || !account.providerAccountId || !user.email) {
        return false;
      }

      const userId = await linkOAuthAccount({
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        email: user.email,
        name: user.name,
      });

      if (!userId) {
        return false;
      }

      const token = await signFrontAccessToken(userId, user.email);
      const target = new URL(getFrontOAuthCallbackUrl());
      target.searchParams.set('token', token);
      return target.toString();
    },
  },
});

export async function buildOAuthRedirectUrl(userId: string, email?: string | null) {
  const token = await signFrontAccessToken(userId, email ?? undefined);
  const target = new URL(getFrontOAuthCallbackUrl());
  target.searchParams.set('token', token);
  return target.toString();
}
