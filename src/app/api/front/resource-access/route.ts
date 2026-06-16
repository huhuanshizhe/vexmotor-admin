import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getResourceItemBySlug } from '@/lib/resources';
import { recordResourceAccessLead } from '@/server/storefront/resource-access';

const resourceAccessSchema = z.object({
  email: z.string().trim().min(1).max(320).email(),
  resourceSlug: z.string().trim().min(1).max(120),
  sourcePath: z.string().trim().min(1).max(512).default('/resources'),
  company: z.string().trim().max(160).optional(),
  utmSource: z.string().trim().max(120).optional(),
  utmMedium: z.string().trim().max(120).optional(),
  utmCampaign: z.string().trim().max(160).optional(),
});

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'INVALID_JSON', message: 'Malformed JSON payload' }, { status: 400 });
  }

  const parsed = resourceAccessSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid resource access payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const resource = getResourceItemBySlug(parsed.data.resourceSlug);

  if (!resource) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Resource not found' }, { status: 404 });
  }

  if (!resource.gated) {
    return NextResponse.json(
      {
        code: 'NOT_GATED',
        message: 'This resource does not require gated access',
        downloadPath: `/resources/download/${resource.slug}`,
      },
      { status: 200 },
    );
  }

  const lead = await recordResourceAccessLead(parsed.data);

  return NextResponse.json(
    {
      message: 'Resource unlocked.',
      lead,
      downloadPath: `/resources/download/${resource.slug}`,
    },
    { status: 201 },
  );
}