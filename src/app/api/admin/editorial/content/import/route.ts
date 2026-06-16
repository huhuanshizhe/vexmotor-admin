import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { importSeededBlogPosts, importSeededPressReleases } from '@/server/admin/editorial-content';

const importRequestSchema = z.object({
  dryRun: z.boolean().optional().default(false),
  contentType: z.enum(['blog', 'press']).optional(),
});

function resolveContentType(value: string | null | undefined) {
  return value === 'press' ? 'press' : 'blog';
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const parsed = importRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const contentType = resolveContentType(parsed.data.contentType ?? request.nextUrl.searchParams.get('contentType'));
  const result = contentType === 'press'
    ? await importSeededPressReleases({ dryRun: parsed.data.dryRun })
    : await importSeededBlogPosts({ dryRun: parsed.data.dryRun });

  return NextResponse.json(result, { status: 200 });
}