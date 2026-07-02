import { NextRequest, NextResponse } from 'next/server';

import {
  adminShippingMethodTranslationSchema,
  createAdminShippingMethodTranslation,
  findAdminShippingMethodTranslationByMethodAndLocale,
  getAdminShippingMethods,
  updateAdminShippingMethodTranslation,
} from '@/server/admin/shipping-methods';

function mapError(error: unknown) {
  if (!(error instanceof Error)) return null;
  if (error.message === 'CODE_CONFLICT') {
    return { status: 409, code: 'CODE_CONFLICT', message: '编码已存在，请使用其他编码' };
  }
  return null;
}

export async function GET() {
  const items = await getAdminShippingMethods();
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = adminShippingMethodTranslationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    if (parsed.data.shippingMethodId) {
      const existingLocale = await findAdminShippingMethodTranslationByMethodAndLocale(
        parsed.data.shippingMethodId,
        parsed.data.locale,
      );
      if (existingLocale) {
        const updated = await updateAdminShippingMethodTranslation(existingLocale.id, parsed.data);
        if (!updated) {
          return NextResponse.json({ code: 'UPDATE_FAILED', message: 'Unable to update shipping method translation' }, { status: 500 });
        }
        return NextResponse.json(updated);
      }
    }

    const created = await createAdminShippingMethodTranslation(parsed.data);
    if (!created) {
      return NextResponse.json({ code: 'CREATE_FAILED', message: 'Unable to create shipping method' }, { status: 500 });
    }

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const mapped = mapError(error);
    if (mapped) {
      return NextResponse.json({ code: mapped.code, message: mapped.message }, { status: mapped.status });
    }
    throw error;
  }
}
