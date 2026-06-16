import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUserId } from '@/server/auth/session';
import { getProfile } from '@/server/storefront/account';

function corsHeaders() {
  const origin = process.env.CORS_ALLOWED_ORIGINS?.split(',')[0]?.trim() ?? 'http://localhost:5000';
  return { 'Access-Control-Allow-Origin': origin };
}

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId(request);
  if (!userId) {
    return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
  }

  const profile = await getProfile(userId);
  if (!profile) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Profile not found' }, { status: 404 });
  }

  return NextResponse.json(profile);
}
