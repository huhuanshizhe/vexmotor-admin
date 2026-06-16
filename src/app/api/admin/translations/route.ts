import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

import { SUPPORTED_LOCALES } from '@/lib/i18n';

const updateSchema = z.object({
  locale: z.enum(['en', 'de', 'fr', 'es']),
  key: z.string().min(1),
  value: z.string(),
});

const LOCALES_DIR = path.join(process.cwd(), 'src', 'locales');

export async function GET() {
  const result: Record<string, Record<string, unknown>> = {};
  for (const locale of SUPPORTED_LOCALES) {
    try {
      const filePath = path.join(LOCALES_DIR, `${locale}.json`);
      const raw = fs.readFileSync(filePath, 'utf-8');
      result[locale] = JSON.parse(raw);
    } catch {
      result[locale] = {};
    }
  }
  return NextResponse.json(result);
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ code: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 });
    }

    const { locale, key, value } = parsed.data;
    const filePath = path.join(LOCALES_DIR, `${locale}.json`);

    let translations: Record<string, unknown> = {};
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      translations = JSON.parse(raw);
    } catch {
      // File doesn't exist, create new
    }

    // Set nested key (e.g., "common.save" → translations.common.save)
    const parts = key.split('.');
    let current: Record<string, unknown> = translations;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]] || typeof current[parts[i]] !== 'object') {
        current[parts[i]] = {};
      }
      current = current[parts[i]] as Record<string, unknown>;
    }
    current[parts[parts.length - 1]] = value;

    fs.writeFileSync(filePath, JSON.stringify(translations, null, 2) + '\n', 'utf-8');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save translation:', error);
    return NextResponse.json({ code: 'SAVE_FAILED', message: 'Unable to save translation' }, { status: 500 });
  }
}
