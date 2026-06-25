import { NextRequest, NextResponse } from 'next/server';

import { parseProductListQuery } from '@/lib/product-list-query';
import {
  adminProductTranslationSchema,
  createAdminProductTranslation,
  findAdminProductTranslationByProductAndLocale,
  findAdminProductTranslationBySlug,
  getAdminProductsPaginated,
  updateAdminProductTranslation,
} from '@/server/admin/products';

function mapProductError(error: unknown) {
  if (!(error instanceof Error)) return null;
  switch (error.message) {
    case 'SLUG_CONFLICT':
      return { status: 409, code: 'SLUG_CONFLICT', message: '该语言下 slug 已被占用' };
    case 'DUPLICATE_SPU':
      return { status: 409, code: 'DUPLICATE_SPU', message: 'SPU 已存在' };
    default:
      return null;
  }
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = parseProductListQuery({
    keyword: params.get('keyword') ?? params.get('search') ?? undefined,
    page: params.get('page') ?? undefined,
    page_size: params.get('page_size') ?? params.get('pageSize') ?? undefined,
    brand_id: params.get('brand_id') ?? undefined,
    category_id: params.get('category_id') ?? undefined,
    purchase_mode: params.get('purchase_mode') ?? undefined,
    paid_sample: params.get('paid_sample') ?? undefined,
    status: params.get('status') ?? undefined,
    lifecycle: params.get('lifecycle') ?? undefined,
    price_min: params.get('price_min') ?? undefined,
    price_max: params.get('price_max') ?? undefined,
    currency: params.get('currency') ?? undefined,
    locale: params.get('locale') ?? undefined,
  });

  const result = await getAdminProductsPaginated(query);

  return NextResponse.json({
    items: result.items,
    meta: {
      total: result.total,
      activeCount: result.activeCount,
      page: result.page,
      pageSize: result.pageSize,
    },
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = adminProductTranslationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.productId) {
    const existingLocale = await findAdminProductTranslationByProductAndLocale(
      parsed.data.productId,
      parsed.data.locale,
    );
    if (existingLocale) {
      try {
        const updated = await updateAdminProductTranslation(existingLocale.id, parsed.data);
        if (!updated) {
          return NextResponse.json({ code: 'UPDATE_FAILED', message: 'Unable to update product translation' }, { status: 500 });
        }
        return NextResponse.json(updated);
      } catch (error) {
        const mapped = mapProductError(error);
        if (mapped) {
          return NextResponse.json({ code: mapped.code, message: mapped.message }, { status: mapped.status });
        }
        throw error;
      }
    }
  }

  const duplicate = await findAdminProductTranslationBySlug(
    parsed.data.slug ?? parsed.data.name,
    parsed.data.locale,
  );
  if (duplicate) {
    return NextResponse.json({ code: 'SLUG_CONFLICT', message: '该语言下 slug 已被占用' }, { status: 409 });
  }

  try {
    const created = await createAdminProductTranslation(parsed.data);
    if (!created) {
      return NextResponse.json({ code: 'CREATE_FAILED', message: 'Unable to create product' }, { status: 500 });
    }
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const mapped = mapProductError(error);
    if (mapped) {
      return NextResponse.json({ code: mapped.code, message: mapped.message }, { status: mapped.status });
    }
    throw error;
  }
}
