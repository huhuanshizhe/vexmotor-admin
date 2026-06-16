import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { subscribeToNewsletter } from '@/server/storefront/newsletter';

const newsletterSchema = z.object({
  email: z.string().trim().min(1).max(320).email(),
});

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'INVALID_JSON', message: 'Malformed JSON payload' }, { status: 400 });
  }

  const parsed = newsletterSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid newsletter payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const subscription = await subscribeToNewsletter(parsed.data.email);
  return NextResponse.json({ message: 'Subscription confirmed.', subscription }, { status: 201 });
}