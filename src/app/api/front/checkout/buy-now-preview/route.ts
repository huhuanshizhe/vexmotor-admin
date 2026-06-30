import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { LOCALE_REQUEST_HEADER, normalizeLocale } from '@/lib/i18n';
import { buildBuyNowCartPreview } from '@/server/storefront/cart';

function corsHeaders() {
  const origin = process.env.CORS_ALLOWED_ORIGINS?.split(',')[0]?.trim() ?? 'http://localhost:5000';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Cart-Token, x-vex-locale',
  };
}

const previewSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(99999),
  featureValueIds: z.array(z.string().uuid()).optional(),
});

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = previewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: 'Invalid buy-now preview payload', details: parsed.error.flatten() },
      { status: 400, headers: corsHeaders() },
    );
  }

  const locale = normalizeLocale(request.headers.get(LOCALE_REQUEST_HEADER));
  const result = await buildBuyNowCartPreview({
    productId: parsed.data.productId,
    quantity: parsed.data.quantity,
    featureValueIds: parsed.data.featureValueIds,
    locale,
  });

  if (!result.ok) {
    return NextResponse.json(
      { code: result.code, message: result.message },
      { status: 400, headers: corsHeaders() },
    );
  }

  return NextResponse.json(result.detail, { headers: corsHeaders() });
}
