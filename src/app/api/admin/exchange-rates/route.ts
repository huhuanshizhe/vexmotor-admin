import { NextResponse } from 'next/server';

import type { ExchangeRateConfig } from '@/lib/exchange-rate-config';
import { getAdminExchangeRateConfig, updateAdminExchangeRateConfig } from '@/server/admin/exchange-rates';

export async function GET() {
  const config = await getAdminExchangeRateConfig();
  return NextResponse.json(config);
}

export async function PUT(request: Request) {
  const body = (await request.json()) as ExchangeRateConfig;
  const saved = await updateAdminExchangeRateConfig(body);
  return NextResponse.json(saved);
}
