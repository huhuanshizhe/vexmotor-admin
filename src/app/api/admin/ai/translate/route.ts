import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const translateSchema = z.object({
  text: z.string().min(1),
  sourceLocale: z.enum(['en', 'de', 'fr', 'es']).default('en'),
  targetLocale: z.enum(['en', 'de', 'fr', 'es']),
  context: z.string().optional(),
});

const LOCALE_LABELS: Record<string, string> = {
  en: 'English',
  de: 'German',
  fr: 'French',
  es: 'Spanish',
};

async function callAI(prompt: string): Promise<string> {
  const baseUrl = process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com';
  const token = process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_API_KEY || '';
  const model = process.env.ANTHROPIC_DEFAULT_SONNET_MODEL || process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL || 'claude-sonnet-4-6';

  const res = await fetch(`${baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': token,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: 'You are a professional technical translator for industrial motion control products. Translate accurately, preserving technical terms, units, and brand names. Keep HTML tags, placeholders like {year} or {param}, and formatting intact. Return ONLY the translated text, no explanations.',
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI API error ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json() as { content?: Array<{ type?: string; text?: string }> };
  const textBlock = data.content?.find((c) => c.type === 'text');
  return textBlock?.text?.trim() || '';
}

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

    const sourceLabel = LOCALE_LABELS[sourceLocale];
    const targetLabel = LOCALE_LABELS[targetLocale];
    const contextNote = context ? `\nContext: This is ${context} content.` : '';

    const prompt = `Translate the following text from ${sourceLabel} to ${targetLabel}.${contextNote}\n\nSource text:\n"""\n${text}\n"""\n\n${targetLabel} translation:`;

    const translatedText = await callAI(prompt);

    return NextResponse.json({ translatedText: translatedText || text });
  } catch (error) {
    console.error('AI translation failed:', error);
    return NextResponse.json({ code: 'TRANSLATION_FAILED', message: 'AI translation service unavailable' }, { status: 500 });
  }
}
