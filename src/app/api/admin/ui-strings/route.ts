import { NextRequest, NextResponse } from 'next/server';

import {
  getAdminUiStrings,
  resetUiStringTranslations,
  syncUiStringsFromManifest,
  translateSingleUiString,
  updateAdminUiStringTranslation,
} from '@/server/admin/ui-strings';
import type { UiStringResetScope } from '@/lib/ui-strings';

function mapError(error: unknown) {
  if (!(error instanceof Error)) return null;
  switch (error.message) {
    case 'ENGLISH_IS_DEFAULT_TEXT':
      return { status: 400, code: 'ENGLISH_IS_DEFAULT_TEXT', message: '英文范本保存在 default_text，不写入翻译表' };
    case 'INVALID_RESET_LOCALE':
      return { status: 400, code: 'INVALID_RESET_LOCALE', message: '无效的重置语言' };
    default:
      if (error.message.startsWith('MANIFEST_FETCH_FAILED:')) {
        return { status: 502, code: 'MANIFEST_FETCH_FAILED', message: '无法拉取前台 manifest' };
      }
      return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const group = searchParams.get('group') ?? undefined;
  const status = searchParams.get('status') as 'active' | 'deprecated' | null;
  const missingOnly = searchParams.get('missingOnly') === '1';
  const search = searchParams.get('search') ?? undefined;

  const result = await getAdminUiStrings({
    group,
    status: status ?? undefined,
    missingOnly,
    search,
  });

  return NextResponse.json(result);
}

export async function PUT(request: NextRequest) {
  const body = await request.json() as {
    key?: string;
    locale?: string;
    value?: string;
    source?: 'manual' | 'llm';
  };

  if (!body.key || !body.locale || typeof body.value !== 'string') {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'key, locale, value are required' }, { status: 400 });
  }

  try {
    const saved = await updateAdminUiStringTranslation({
      key: body.key,
      locale: body.locale,
      value: body.value,
      source: body.source,
    });

    if (!saved) {
      return NextResponse.json({ code: 'NOT_FOUND', message: 'UI string key not found' }, { status: 404 });
    }

    return NextResponse.json({ item: saved });
  } catch (error) {
    const mapped = mapError(error);
    if (mapped) {
      return NextResponse.json({ code: mapped.code, message: mapped.message }, { status: mapped.status });
    }
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json() as {
    action?: 'sync-manifest' | 'reset' | 'translate-one';
    manifestUrl?: string;
    scope?: UiStringResetScope;
    locale?: string;
    key?: string;
    targetLocale?: string;
  };

  try {
    if (body.action === 'sync-manifest') {
      const result = await syncUiStringsFromManifest(body.manifestUrl);
      return NextResponse.json(result);
    }

    if (body.action === 'reset') {
      if (!body.scope) {
        return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'scope is required' }, { status: 400 });
      }
      const result = await resetUiStringTranslations({
        scope: body.scope,
        locale: body.locale,
        manifestUrl: body.manifestUrl,
      });
      return NextResponse.json(result);
    }

    if (body.action === 'translate-one') {
      if (!body.key || !body.targetLocale) {
        return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'key and targetLocale are required' }, { status: 400 });
      }
      const saved = await translateSingleUiString({ key: body.key, targetLocale: body.targetLocale });
      if (!saved) {
        return NextResponse.json({ code: 'NOT_FOUND', message: 'UI string key not found' }, { status: 404 });
      }
      return NextResponse.json({ item: saved });
    }

    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Unknown action' }, { status: 400 });
  } catch (error) {
    const mapped = mapError(error);
    if (mapped) {
      return NextResponse.json({ code: mapped.code, message: mapped.message }, { status: mapped.status });
    }
    throw error;
  }
}
