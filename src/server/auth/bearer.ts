import { headers } from 'next/headers';
import type { NextRequest } from 'next/server';

import { auth } from '@/auth/admin-auth';
import { extractBearerToken, verifyFrontAccessToken } from '@/lib/auth/jwt';

export async function getFrontUserIdFromRequest(request?: NextRequest | Request) {
  const authHeader = request?.headers.get('authorization') ?? (await headers()).get('authorization');
  const token = extractBearerToken(authHeader);
  if (!token) {
    return null;
  }
  const payload = await verifyFrontAccessToken(token);
  return payload?.sub ?? null;
}

export async function getAdminSession() {
  try {
    return await auth();
  } catch {
    return null;
  }
}

export async function getAdminUserId() {
  const session = await getAdminSession();
  return session?.user?.id ?? null;
}

export async function requireAdminUserId() {
  const userId = await getAdminUserId();
  if (!userId) {
    return null;
  }
  return userId;
}
