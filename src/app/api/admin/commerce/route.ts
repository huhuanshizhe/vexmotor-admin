import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getAdminCommerceConfig, updateAdminCommerceConfig } from '@/server/commerce/config';

const volumePricingRuleSchema = z.object({
  id: z.string().default(''),
  label: z.string().trim().min(1),
  minQuantity: z.coerce.number().int().min(1),
  priceFactor: z.coerce.number().gt(0).lte(1),
  note: z.string().trim().nullable().optional().transform((value) => value ?? null),
  enabled: z.boolean().default(true),
});

const shippingMethodSchema = z.object({
  id: z.string().default(''),
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
  etaLabel: z.string().trim().min(1),
  note: z.string().trim().min(1),
  enabled: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

const shippingCountryRateSchema = z.object({
  id: z.string().default(''),
  countryCode: z.string().trim().min(2).max(16),
  countryName: z.string().trim().min(1),
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
  shippingMethods: z.array(shippingMethodSchema).min(1),
  shippingCountryRates: z.array(shippingCountryRateSchema).min(1),
});

export async function GET() {
  const config = await getAdminCommerceConfig();
  return NextResponse.json(config);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const parsed = commerceConfigSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await updateAdminCommerceConfig(parsed.data);
  return NextResponse.json(updated);
}