import { NextResponse } from 'next/server';
import { z } from 'zod';

import { resetAdminOwnPassword } from '@/server/auth/admin-users';
import { getAdminUserId } from '@/server/auth/bearer';

const resetPasswordSchema = z.object({
  password: z.string().min(6, '密码至少 6 位'),
});

export async function POST(request: Request) {
  const adminId = await getAdminUserId();
  if (!adminId) {
    return NextResponse.json({ code: 'UNAUTHORIZED', message: '未登录' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: 'INVALID_INPUT', message: parsed.error.issues[0]?.message ?? '密码无效' },
      { status: 400 },
    );
  }

  const result = await resetAdminOwnPassword(adminId, parsed.data.password);
  if (!result) {
    return NextResponse.json({ code: 'NOT_FOUND', message: '管理员账户不存在' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
