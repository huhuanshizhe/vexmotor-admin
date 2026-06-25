import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getPromotionSettings, updatePromotionSettings } from '@/server/admin/promotion-settings';

const settingsSchema = z.object({
  defaultCurrencyCode: z.string().trim().length(3),
});

export async function GET() {
  const settings = await getPromotionSettings();
  return NextResponse.json(settings);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 });
  }
  const settings = await updatePromotionSettings(parsed.data);
  return NextResponse.json(settings);
}
