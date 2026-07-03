import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getCommonCurrency } from '@/lib/currencies';
import { getSiteSettings, updateSiteSettings } from '@/server/site/settings';

const siteSettingsSchema = z.object({
  defaultCurrencyCode: z.string().trim().min(3).max(3).refine(
    (value) => Boolean(getCommonCurrency(value.toUpperCase())),
    'Invalid currency code',
  ),
  defaultCountryCode: z.string().trim().min(2).max(16),
  extra: z.record(z.unknown()).optional(),
});

export async function GET() {
  const settings = await getSiteSettings();
  return NextResponse.json(settings);
}

export async function PUT(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'INVALID_BODY', message: '请求体无效或为空' }, { status: 400 });
  }

  const parsed = siteSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({
      code: 'VALIDATION_ERROR',
      message: '配置校验失败，请检查默认币种与国家',
      details: parsed.error.flatten(),
    }, { status: 400 });
  }

  try {
    const updated = await updateSiteSettings({
      defaultCurrencyCode: parsed.data.defaultCurrencyCode.toUpperCase(),
      defaultCountryCode: parsed.data.defaultCountryCode.toUpperCase(),
      extra: parsed.data.extra ?? {},
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('[site-settings] update failed', error);
    return NextResponse.json({ code: 'UPDATE_FAILED', message: '保存失败，请稍后重试' }, { status: 500 });
  }
}
