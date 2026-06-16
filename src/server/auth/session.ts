import type { NextRequest } from 'next/server';

import { getAdminSession, getAdminUserId, getFrontUserIdFromRequest } from '@/server/auth/bearer';

/** @deprecated Use getAdminSession */
export async function getAuthSession() {
  return getAdminSession();
}

/** Front API: pass the incoming request. Admin internal: omit for admin session id. */
export async function getCurrentUserId(request?: NextRequest | Request) {
  if (request) {
    return getFrontUserIdFromRequest(request);
  }
  return getFrontUserIdFromRequest();
}

export { getAdminUserId, getAdminSession, getFrontUserIdFromRequest };
