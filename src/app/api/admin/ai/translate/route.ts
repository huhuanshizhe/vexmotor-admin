import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { LlmConfigError, LlmRequestError } from '@/server/ai/chat-with-llm';
import { translateText } from '@/server/ai/translate';

const translateSchema = z.object({
  text: z.string().min(1),
  sourceLocale: z.string().trim().min(1).default('en'),
  targetLocale: z.string().trim().min(1),
  context: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = translateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ code: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 });
    }

    const { text, sourceLocale, targetLocale, context } = parsed.data;

    if (sourceLocale === targetLocale) {
      return NextResponse.json({ translatedText: text });
    }

    const translatedText = await translateText({ text, sourceLocale, targetLocale, context });

    return NextResponse.json({ translatedText: translatedText || text });
  } catch (error) {
    if (error instanceof LlmConfigError) {
      return NextResponse.json({ code: 'LLM_NOT_CONFIGURED', message: error.message }, { status: 503 });
    }
    if (error instanceof LlmRequestError) {
      return NextResponse.json({ code: 'TRANSLATION_FAILED', message: error.message }, { status: error.status });
    }
    console.error('AI translation failed:', error);
    return NextResponse.json({ code: 'TRANSLATION_FAILED', message: 'AI translation service unavailable' }, { status: 500 });
  }
}
