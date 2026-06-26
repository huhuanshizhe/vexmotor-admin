import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { normalizePageSize } from '@/lib/admin-list-query';
import { listAdminProductsForPicker, lookupAdminProductsForPicker } from '@/server/admin/product-picker';

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const result = await listAdminProductsForPicker({
    keyword: params.get('keyword')?.trim() ?? undefined,
    brandId: params.get('brand_id')?.trim() ?? undefined,
    categoryId: params.get('category_id')?.trim() ?? undefined,
    page: Math.max(1, Number(params.get('page') ?? 1) || 1),
    pageSize: normalizePageSize(params.get('page_size') ?? 50),
  });

  return NextResponse.json({
    items: result.items,
    meta: { total: result.total, page: result.page, pageSize: result.pageSize },
  });
}

const lookupSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = lookupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 });
  }

  const items = await lookupAdminProductsForPicker(parsed.data.ids);
  return NextResponse.json({ items });
}
