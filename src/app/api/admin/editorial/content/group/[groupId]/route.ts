import { NextResponse } from 'next/server';

import { getAdminEditorialContentTranslations } from '@/server/admin/editorial-content';

/** @deprecated 请使用 GET /api/admin/editorial/content/[contentId] */
export async function GET(_: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const items = await getAdminEditorialContentTranslations(groupId);

  if (!items.length) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'No translations found for this content' }, { status: 404 });
  }

  return NextResponse.json({ items, meta: { total: items.length, contentId: groupId, groupId } });
}
