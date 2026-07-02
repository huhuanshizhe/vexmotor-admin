import 'server-only';

import { and, asc, eq, ne } from 'drizzle-orm';
import { z } from 'zod';

import {
  type AdminShippingMethodListItem,
  type AdminShippingMethodTranslation,
} from '@/lib/shipping-method-content';
import { pickTranslationForDisplay } from '@/lib/pick-translation-for-display';
import type { ShippingMethodConfig } from '@/lib/commerce-config';
import { db } from '@/server/db';
import { commerceSettings, shippingMethodTranslations, shippingMethods } from '@/server/db/schema';
import { getDefaultSiteLanguageCode } from '@/server/admin/site-locale';
import {
  loadShippingMethodTranslationsByMethodIds,
  pickShippingMethodTranslation,
} from '@/server/shipping/load-shipping-method-translations';

const COMMERCE_SETTINGS_ROW_ID = 'default';

export const adminShippingMethodTranslationSchema = z.object({
  shippingMethodId: z.string().uuid().optional(),
  locale: z.string().trim().min(2),
  name: z.string().trim().min(1),
  etaLabel: z.string().trim().optional().transform((value) => value ?? ''),
  note: z.string().trim().nullable().optional().transform((value) => value ?? null),
  code: z.string().trim().min(1).optional(),
  enabled: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

export const adminShippingMethodTranslationPatchSchema = adminShippingMethodTranslationSchema.partial();

export const adminShippingMethodPatchSchema = z.object({
  code: z.string().trim().min(1).optional(),
  enabled: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

type TranslationCreateInput = z.infer<typeof adminShippingMethodTranslationSchema>;
type TranslationPatchInput = z.infer<typeof adminShippingMethodTranslationPatchSchema>;
type MethodPatchInput = z.infer<typeof adminShippingMethodPatchSchema>;

type MethodRow = typeof shippingMethods.$inferSelect;
type TranslationRow = typeof shippingMethodTranslations.$inferSelect;

function now() {
  return new Date();
}

function normalizeText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeMethodCode(value: string | null | undefined, fallback: string) {
  const normalized = value
    ?.trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || fallback;
}

function normalizeLocale(value: string | null | undefined, fallback = 'en') {
  return value?.trim() || fallback;
}

function normalizeTranslationRow(method: MethodRow, translation: TranslationRow): AdminShippingMethodTranslation {
  return {
    id: translation.id,
    shippingMethodId: method.id,
    locale: translation.locale,
    name: translation.name,
    etaLabel: translation.etaLabel,
    note: translation.note,
    code: method.code,
    enabled: method.enabled,
    sortOrder: method.sortOrder,
    createdAt: translation.createdAt.toISOString(),
    updatedAt: Math.max(method.updatedAt.getTime(), translation.updatedAt.getTime()) === translation.updatedAt.getTime()
      ? translation.updatedAt.toISOString()
      : method.updatedAt.toISOString(),
  };
}

function toListItem(
  method: MethodRow,
  translations: TranslationRow[],
  displayLocale: string,
): AdminShippingMethodListItem | null {
  const primary = pickTranslationForDisplay(translations, displayLocale);
  if (!primary) return null;

  return {
    id: method.id,
    code: method.code,
    name: primary.name,
    etaLabel: primary.etaLabel,
    note: primary.note ?? '',
    enabled: method.enabled,
    sortOrder: method.sortOrder,
    primaryLocale: primary.locale,
    localeCount: translations.length,
    locales: translations.map((item) => item.locale).sort(),
    createdAt: method.createdAt.toISOString(),
    updatedAt: method.updatedAt.toISOString(),
  };
}

function toShippingMethodConfig(
  method: MethodRow,
  translation: TranslationRow | null,
): ShippingMethodConfig {
  return {
    id: method.id,
    code: method.code,
    name: translation?.name ?? method.code,
    etaLabel: translation?.etaLabel ?? '',
    note: translation?.note ?? '',
    enabled: method.enabled,
    sortOrder: method.sortOrder,
  };
}

async function loadTranslationsByMethodIds(methodIds: string[]) {
  return loadShippingMethodTranslationsByMethodIds(methodIds);
}

async function syncCommerceSettingsForCodeChange(previousCode: string, nextCode: string) {
  const [row] = await db
    .select()
    .from(commerceSettings)
    .where(eq(commerceSettings.id, COMMERCE_SETTINGS_ROW_ID))
    .limit(1);

  if (!row) return;

  const shippingCountryRates = row.shippingCountryRates.map((rate) => (
    rate.shippingMethodCode === previousCode
      ? { ...rate, shippingMethodCode: nextCode }
      : rate
  ));

  await db
    .update(commerceSettings)
    .set({
      defaultShippingMethodCode: row.defaultShippingMethodCode === previousCode ? nextCode : row.defaultShippingMethodCode,
      shippingCountryRates,
      updatedAt: now(),
    })
    .where(eq(commerceSettings.id, COMMERCE_SETTINGS_ROW_ID));
}

async function removeCommerceSettingsForMethodCode(code: string) {
  const [row] = await db
    .select()
    .from(commerceSettings)
    .where(eq(commerceSettings.id, COMMERCE_SETTINGS_ROW_ID))
    .limit(1);

  if (!row) return;

  const remainingMethods = await db.select({ code: shippingMethods.code }).from(shippingMethods);
  const fallbackCode = remainingMethods.find((item) => item.code !== code)?.code ?? row.defaultShippingMethodCode;

  await db
    .update(commerceSettings)
    .set({
      defaultShippingMethodCode: row.defaultShippingMethodCode === code ? fallbackCode : row.defaultShippingMethodCode,
      shippingCountryRates: row.shippingCountryRates.filter((rate) => rate.shippingMethodCode !== code),
      updatedAt: now(),
    })
    .where(eq(commerceSettings.id, COMMERCE_SETTINGS_ROW_ID));
}

export async function getShippingMethodCodes() {
  const rows = await db.select({ code: shippingMethods.code }).from(shippingMethods);
  return rows.map((row) => row.code);
}

export async function getResolvedShippingMethods(locale?: string): Promise<ShippingMethodConfig[]> {
  const displayLocale = normalizeLocale(locale, await getDefaultSiteLanguageCode());
  const methodRows = await db
    .select()
    .from(shippingMethods)
    .orderBy(asc(shippingMethods.sortOrder), asc(shippingMethods.code));

  const translationMap = await loadTranslationsByMethodIds(methodRows.map((row) => row.id));

  return methodRows
    .map((method) => {
      const translations = translationMap.get(method.id) ?? [];
      const picked = pickShippingMethodTranslation(translations, displayLocale);
      return toShippingMethodConfig(method, picked);
    })
    .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name));
}

export async function getAdminShippingMethods(displayLocale?: string) {
  const locale = normalizeLocale(displayLocale, await getDefaultSiteLanguageCode());
  const methodRows = await db
    .select()
    .from(shippingMethods)
    .orderBy(asc(shippingMethods.sortOrder), asc(shippingMethods.code));

  const translationMap = await loadTranslationsByMethodIds(methodRows.map((row) => row.id));

  return methodRows
    .map((method) => toListItem(method, translationMap.get(method.id) ?? [], locale))
    .filter((item): item is AdminShippingMethodListItem => Boolean(item));
}

export async function getAdminShippingMethodListItem(methodId: string, displayLocale?: string) {
  const [method] = await db.select().from(shippingMethods).where(eq(shippingMethods.id, methodId)).limit(1);
  if (!method) return null;

  const translations = await db
    .select()
    .from(shippingMethodTranslations)
    .where(eq(shippingMethodTranslations.shippingMethodId, methodId))
    .orderBy(asc(shippingMethodTranslations.locale));

  const locale = normalizeLocale(displayLocale, await getDefaultSiteLanguageCode());
  return toListItem(method, translations, locale);
}

export async function getAdminShippingMethodTranslations(methodId: string) {
  const [method] = await db.select().from(shippingMethods).where(eq(shippingMethods.id, methodId)).limit(1);
  if (!method) return [];

  const translations = await db
    .select()
    .from(shippingMethodTranslations)
    .where(eq(shippingMethodTranslations.shippingMethodId, methodId))
    .orderBy(asc(shippingMethodTranslations.locale));

  return translations.map((translation) => normalizeTranslationRow(method, translation));
}

export async function getAdminShippingMethodTranslation(translationId: string) {
  const [row] = await db
    .select({ method: shippingMethods, translation: shippingMethodTranslations })
    .from(shippingMethodTranslations)
    .innerJoin(shippingMethods, eq(shippingMethods.id, shippingMethodTranslations.shippingMethodId))
    .where(eq(shippingMethodTranslations.id, translationId))
    .limit(1);

  return row ? normalizeTranslationRow(row.method, row.translation) : null;
}

export async function findAdminShippingMethodTranslationByMethodAndLocale(
  methodId: string,
  locale: string,
  excludeTranslationId?: string,
) {
  const conditions = [
    eq(shippingMethodTranslations.shippingMethodId, methodId),
    eq(shippingMethodTranslations.locale, normalizeLocale(locale)),
  ];
  if (excludeTranslationId) {
    conditions.push(ne(shippingMethodTranslations.id, excludeTranslationId));
  }

  const [row] = await db
    .select({ method: shippingMethods, translation: shippingMethodTranslations })
    .from(shippingMethodTranslations)
    .innerJoin(shippingMethods, eq(shippingMethods.id, shippingMethodTranslations.shippingMethodId))
    .where(and(...conditions))
    .limit(1);

  return row ? normalizeTranslationRow(row.method, row.translation) : null;
}

async function findMethodByCode(code: string, excludeMethodId?: string) {
  const normalizedCode = normalizeMethodCode(code, '');
  if (!normalizedCode) return null;

  const conditions = [eq(shippingMethods.code, normalizedCode)];
  if (excludeMethodId) {
    conditions.push(ne(shippingMethods.id, excludeMethodId));
  }

  const [row] = await db.select().from(shippingMethods).where(and(...conditions)).limit(1);
  return row ?? null;
}

function sanitizeTranslationInput(input: TranslationCreateInput) {
  return {
    name: input.name.trim(),
    etaLabel: input.etaLabel?.trim() ?? '',
    note: normalizeText(input.note),
    locale: normalizeLocale(input.locale),
    code: input.code ? normalizeMethodCode(input.code, '') : undefined,
    enabled: input.enabled,
    sortOrder: input.sortOrder,
  };
}

export async function createAdminShippingMethodTranslation(input: TranslationCreateInput) {
  const next = sanitizeTranslationInput(input);

  if (input.shippingMethodId) {
    const existingLocale = await findAdminShippingMethodTranslationByMethodAndLocale(input.shippingMethodId, next.locale);
    if (existingLocale) {
      return updateAdminShippingMethodTranslation(existingLocale.id, input);
    }
  }

  if (next.code) {
    const codeConflict = await findMethodByCode(next.code, input.shippingMethodId);
    if (codeConflict) {
      throw new Error('CODE_CONFLICT');
    }
  }

  let methodId = input.shippingMethodId;
  if (!methodId) {
    const [createdMethod] = await db
      .insert(shippingMethods)
      .values({
        code: next.code ?? normalizeMethodCode(next.name, `method-${Date.now()}`),
        enabled: next.enabled ?? false,
        sortOrder: next.sortOrder ?? 0,
        updatedAt: now(),
      })
      .returning();
    methodId = createdMethod?.id;
  } else if (next.code || next.enabled !== undefined || next.sortOrder !== undefined) {
    await updateAdminShippingMethod(methodId, {
      code: next.code,
      enabled: next.enabled,
      sortOrder: next.sortOrder,
    });
  }

  if (!methodId) return null;

  const [translation] = await db
    .insert(shippingMethodTranslations)
    .values({
      shippingMethodId: methodId,
      locale: next.locale,
      name: next.name,
      etaLabel: next.etaLabel,
      note: next.note,
      updatedAt: now(),
    })
    .returning();

  if (!translation) return null;

  const [method] = await db.select().from(shippingMethods).where(eq(shippingMethods.id, methodId)).limit(1);
  if (!method) return null;

  return normalizeTranslationRow(method, translation);
}

export async function updateAdminShippingMethodTranslation(translationId: string, input: TranslationPatchInput) {
  const existing = await getAdminShippingMethodTranslation(translationId);
  if (!existing) return null;

  const next = sanitizeTranslationInput({
    shippingMethodId: existing.shippingMethodId,
    locale: input.locale ?? existing.locale,
    name: input.name ?? existing.name,
    etaLabel: input.etaLabel ?? existing.etaLabel,
    note: input.note ?? existing.note,
    code: input.code ?? existing.code,
    enabled: input.enabled ?? existing.enabled,
    sortOrder: input.sortOrder ?? existing.sortOrder,
  });

  if (input.code && input.code !== existing.code) {
    const codeConflict = await findMethodByCode(input.code, existing.shippingMethodId);
    if (codeConflict) {
      throw new Error('CODE_CONFLICT');
    }
    await updateAdminShippingMethod(existing.shippingMethodId, { code: input.code });
  }

  if (input.enabled !== undefined || input.sortOrder !== undefined) {
    await updateAdminShippingMethod(existing.shippingMethodId, {
      enabled: input.enabled,
      sortOrder: input.sortOrder,
    });
  }

  const [updated] = await db
    .update(shippingMethodTranslations)
    .set({
      locale: next.locale,
      name: next.name,
      etaLabel: next.etaLabel,
      note: next.note,
      updatedAt: now(),
    })
    .where(eq(shippingMethodTranslations.id, translationId))
    .returning();

  if (!updated) return null;

  const [method] = await db.select().from(shippingMethods).where(eq(shippingMethods.id, existing.shippingMethodId)).limit(1);
  if (!method) return null;

  return normalizeTranslationRow(method, updated);
}

export async function updateAdminShippingMethod(methodId: string, input: MethodPatchInput) {
  const [existing] = await db.select().from(shippingMethods).where(eq(shippingMethods.id, methodId)).limit(1);
  if (!existing) return null;

  const patch: Partial<typeof shippingMethods.$inferInsert> = { updatedAt: now() };

  if (input.code !== undefined) {
    const nextCode = normalizeMethodCode(input.code, existing.code);
    const codeConflict = await findMethodByCode(nextCode, methodId);
    if (codeConflict) {
      throw new Error('CODE_CONFLICT');
    }
    if (nextCode !== existing.code) {
      await syncCommerceSettingsForCodeChange(existing.code, nextCode);
      patch.code = nextCode;
    }
  }

  if (input.enabled !== undefined) patch.enabled = input.enabled;
  if (input.sortOrder !== undefined) patch.sortOrder = input.sortOrder;

  const [updated] = await db
    .update(shippingMethods)
    .set(patch)
    .where(eq(shippingMethods.id, methodId))
    .returning();

  return updated ?? null;
}

export async function deleteAdminShippingMethod(methodId: string) {
  const methods = await db.select({ id: shippingMethods.id, code: shippingMethods.code }).from(shippingMethods);
  if (methods.length <= 1) {
    throw new Error('LAST_METHOD');
  }

  const target = methods.find((item) => item.id === methodId);
  if (!target) return false;

  await db.delete(shippingMethods).where(eq(shippingMethods.id, methodId));
  await removeCommerceSettingsForMethodCode(target.code);
  return true;
}
