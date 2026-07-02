import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import type { CommerceConfig } from '@/lib/commerce-config';
import { getAdminCommerceConfig, updateAdminCommerceConfig } from '@/server/commerce/config';
import { isShippingContinentCode } from '@/lib/shipping-continents';
import { MIN_VOLUME_PRICING_QUANTITY } from '@/lib/volume-discount';

const volumePricingRuleSchema = z.object({
  id: z.string().default(''),
  label: z.string().trim().optional().transform((value) => value ?? ''),
  minQuantity: z.coerce.number().int().min(MIN_VOLUME_PRICING_QUANTITY),
  priceFactor: z.coerce.number().gt(0).lte(1),
  note: z.string().trim().nullable().optional().transform((value) => value ?? null),
  enabled: z.boolean().default(true),
});

const shippingCountryRateSchema = z.object({
  id: z.string().default(''),
  regionCode: z.string().trim().refine((value) => isShippingContinentCode(value), 'Invalid region code'),
  countryIsoCode: z.string().trim().max(2).nullable().optional().transform((value) => value?.toUpperCase() || null),
  regionName: z.string().trim().default(''),
  countryName: z.string().trim().nullable().optional().transform((value) => value ?? null),
  countryCode: z.string().trim().min(1).optional(),
  shippingMethodCode: z.string().trim().min(1),
  rate: z.coerce.number().min(0),
  freeShippingThreshold: z.coerce.number().min(0).nullable().optional().transform((value) => value ?? null),
  taxRate: z.coerce.number().min(0).max(1),
  enabled: z.boolean().default(true),
  note: z.string().trim().nullable().optional().transform((value) => value ?? null),
});

const commerceConfigSchema = z.object({
  currencyCode: z.string().trim().min(3).max(3),
  defaultCountryCode: z.string().trim().min(2).max(16),
  defaultShippingMethodCode: z.string().trim().min(1),
  volumePricingRules: z.array(volumePricingRuleSchema).min(1),
  shippingCountryRates: z.array(shippingCountryRateSchema).min(1),
});

export async function GET() {
  const config = await getAdminCommerceConfig();
  return NextResponse.json(config);
}

export async function PUT(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'INVALID_BODY', message: '请求体无效或为空' }, { status: 400 });
  }

  const parsed = commerceConfigSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({
      code: 'VALIDATION_ERROR',
      message: '配置校验失败，请检查阶梯规则与运费配置',
      details: parsed.error.flatten(),
    }, { status: 400 });
  }

  try {
    const updated = await updateAdminCommerceConfig(parsed.data as CommerceConfig);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('[commerce] update failed', error);
    return NextResponse.json({ code: 'UPDATE_FAILED', message: '保存失败，请稍后重试' }, { status: 500 });
  }
}
