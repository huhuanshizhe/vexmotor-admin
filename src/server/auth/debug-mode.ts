import 'server-only';

import type { NextRequest } from 'next/server';

import { ADMIN_DEBUG_MODE_HEADER } from '@/lib/admin-debug-mode';
import { getAdminById } from '@/server/auth/admin-users';

export async function assertAdminDebugDeleteAllowed(request: NextRequest, adminId: string) {
  const admin = await getAdminById(adminId);
  if (!admin || admin.role !== 'super_admin') {
    return { ok: false as const, status: 403, message: '仅超级管理员可执行调试删除' };
  }

  if (request.headers.get(ADMIN_DEBUG_MODE_HEADER) !== '1') {
    return { ok: false as const, status: 403, message: '请先开启调试模式' };
  }

  return { ok: true as const };
}
