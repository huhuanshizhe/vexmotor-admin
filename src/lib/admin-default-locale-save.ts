import type { DraftSlugValidation } from '@/lib/slug';

export type LocaleDraftValidationFailure = {
  ok: false;
  locale: string;
  message: string;
  section?: 'content' | 'seo' | 'manufacturing';
};

export type LocaleDraftValidation =
  | DraftSlugValidation
  | LocaleDraftValidationFailure;

export type DefaultLocaleSaveGateResult<TDraft> =
  | { ok: true; mergedDrafts: Record<string, TDraft> }
  | { ok: false; validation: LocaleDraftValidationFailure };

function withDefaultLocalePrefix(message: string) {
  return message.startsWith('默认语言') ? message : `默认语言：${message}`;
}

/** 保存前强制校验默认语言草稿（含 slug 自动生成）。 */
export function runDefaultLocaleSaveGate<TDraft>(params: {
  defaultLocale: string;
  mergedDrafts: Record<string, TDraft>;
  createEmptyDraft: () => TDraft;
  validateDraft: (locale: string, draft: TDraft) => LocaleDraftValidation;
}): DefaultLocaleSaveGateResult<TDraft> {
  if (!params.defaultLocale) {
    return {
      ok: false,
      validation: {
        ok: false,
        locale: '',
        message: '请先在「多语言管理」中配置默认语言',
        section: 'content',
      },
    };
  }

  const draft = params.mergedDrafts[params.defaultLocale] ?? params.createEmptyDraft();
  const validation = params.validateDraft(params.defaultLocale, draft);

  if (!validation.ok) {
    return {
      ok: false,
      validation: {
        ...validation,
        locale: params.defaultLocale,
        message: withDefaultLocalePrefix(validation.message),
        section: validation.section ?? 'content',
      },
    };
  }

  if (!validation.autoSlug) {
    return { ok: true, mergedDrafts: params.mergedDrafts };
  }

  return {
    ok: true,
    mergedDrafts: {
      ...params.mergedDrafts,
      [params.defaultLocale]: {
        ...draft,
        slug: validation.autoSlug,
      } as TDraft,
    },
  };
}
