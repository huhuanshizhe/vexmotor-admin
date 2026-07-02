import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import type { ContentTranslateType } from '@/lib/content-translate-config';
import { LlmConfigError, LlmRequestError } from '@/server/ai/chat-with-llm';
import { HtmlStructureMismatchError, translateContentFields } from '@/server/ai/translate';

const translateContentSchema = z.object({
  contentType: z.enum(['blog', 'faq', 'brand', 'category', 'product', 'feature', 'shippingMethod']),
  sourceLocale: z.string().trim().min(1),
  targetLocale: z.string().trim().min(1),
  fields: z.record(z.string(), z.string()),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = translateContentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ code: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 });
    }

    const { contentType, sourceLocale, targetLocale, fields } = parsed.data;

    if (sourceLocale === targetLocale) {
      return NextResponse.json({ fields });
    }

    const translatedFields = await translateContentFields({
      contentType,
      sourceLocale,
      targetLocale,
      fields,
    });

    return NextResponse.json({ fields: translatedFields });
  } catch (error) {
    if (error instanceof LlmConfigError) {
      return NextResponse.json({ code: 'LLM_NOT_CONFIGURED', message: error.message }, { status: 503 });
    }
    if (error instanceof HtmlStructureMismatchError) {
      return NextResponse.json({
        code: 'HTML_STRUCTURE_MISMATCH',
        message: '正文格式未能完整保留，请手动校对或重新翻译',
      }, { status: 422 });
    }
    if (error instanceof LlmRequestError) {
      return NextResponse.json({ code: 'TRANSLATION_FAILED', message: error.message }, { status: error.status });
    }
    console.error('AI content translation failed:', error);
    return NextResponse.json({ code: 'TRANSLATION_FAILED', message: 'AI translation service unavailable' }, { status: 500 });
  }
}
