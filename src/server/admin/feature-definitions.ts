import 'server-only';

import { and, asc, count, desc, eq, ilike, inArray, ne, or } from 'drizzle-orm';
import { z } from 'zod';

import { type AdminListPageSize, normalizePageSize } from '@/lib/admin-list-query';
import {
  type AdminFeatureDefinitionListItem,
  type AdminFeatureDefinitionTranslation,
  type FeatureDefinitionStatus,
  type FeatureSpecCategory,
  type FeatureValueType,
  featureDefinitionStatuses,
  featureSpecCategories,
  featureValueTypes,
  formatFeatureValueDisplay,
  isUnitRequiredForValueType,
} from '@/lib/feature-definition-content';
import { db } from '@/server/db';
import { featureDefinitionTranslations, featureDefinitions } from '@/server/db/schema';

export const DEFAULT_FEATURE_DEFINITION_LOCALE = 'en';

const selectOptionsSchema = z.array(z.string().trim().min(1)).default([]);

export const adminFeatureDefinitionTranslationSchema = z.object({
  definitionId: z.string().uuid().optional(),
  locale: z.string().trim().min(2).default(DEFAULT_FEATURE_DEFINITION_LOCALE),
  specCategory: z.enum(featureSpecCategories),
  name: z.string().trim().min(1),
  valueType: z.enum(featureValueTypes),
  selectOptions: selectOptionsSchema.optional(),
  status: z.enum(featureDefinitionStatuses).optional(),
  valueText: z.string().trim().nullable().optional(),
  valueMin: z.coerce.number().finite().nullable().optional(),
  valueMax: z.coerce.number().finite().nullable().optional(),
  unit: z.string().trim().nullable().optional(),
});

export const adminFeatureDefinitionTranslationPatchSchema = adminFeatureDefinitionTranslationSchema.partial();

export const adminFeatureDefinitionPatchSchema = z.object({
  specCategory: z.enum(featureSpecCategories).optional(),
  valueType: z.enum(featureValueTypes).optional(),
  selectOptions: selectOptionsSchema.optional(),
  status: z.enum(featureDefinitionStatuses).optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

type TranslationCreateInput = z.infer<typeof adminFeatureDefinitionTranslationSchema>;
type TranslationPatchInput = z.infer<typeof adminFeatureDefinitionTranslationPatchSchema>;
type DefinitionPatchInput = z.infer<typeof adminFeatureDefinitionPatchSchema>;

type DefinitionRow = typeof featureDefinitions.$inferSelect;
type TranslationRow = typeof featureDefinitionTranslations.$inferSelect;

function normalizeLocale(value: string | null | undefined) {
  return value?.trim() || DEFAULT_FEATURE_DEFINITION_LOCALE;
}

function normalizeText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeSelectOptions(options: string[] | undefined) {
  return (options ?? []).map((item) => item.trim()).filter(Boolean);
}

function parseNumeric(value: string | null | undefined) {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function serializeNumeric(value: number | null | undefined) {
  if (value == null) return null;
  return String(value);
}

function sanitizeValueFields(
  valueType: FeatureValueType,
  selectOptions: string[],
  input: {
    valueText?: string | null;
    valueMin?: number | null;
    valueMax?: number | null;
    unit?: string | null;
  },
) {
  const unit = normalizeText(input.unit);

  switch (valueType) {
    case 'text': {
      const valueText = normalizeText(input.valueText);
      if (!valueText) throw new Error('VALUE_REQUIRED');
      return { valueText, valueMin: null, valueMax: null, unit };
    }
    case 'number': {
      const valueMin = input.valueMin ?? null;
      if (valueMin == null) throw new Error('VALUE_REQUIRED');
      if (!unit) throw new Error('UNIT_REQUIRED');
      return { valueText: String(valueMin), valueMin, valueMax: null, unit };
    }
    case 'range': {
      const valueMin = input.valueMin ?? null;
      const valueMax = input.valueMax ?? null;
      if (valueMin == null || valueMax == null) throw new Error('VALUE_REQUIRED');
      if (valueMin > valueMax) throw new Error('RANGE_INVALID');
      if (!unit) throw new Error('UNIT_REQUIRED');
      return {
        valueText: `${valueMin}~${valueMax}`,
        valueMin,
        valueMax,
        unit,
      };
    }
    case 'boolean': {
      const raw = input.valueText ?? 'false';
      const valueText = raw === 'true' ? 'true' : 'false';
      return { valueText, valueMin: null, valueMax: null, unit: null };
    }
    case 'select': {
      const valueText = normalizeText(input.valueText);
      if (!valueText) throw new Error('VALUE_REQUIRED');
      if (selectOptions.length && !selectOptions.includes(valueText)) throw new Error('SELECT_INVALID');
      return { valueText, valueMin: null, valueMax: null, unit };
    }
    default:
      throw new Error('VALUE_TYPE_INVALID');
  }
}

function sanitizeTranslationInput(input: TranslationCreateInput) {
  const valueType = input.valueType;
  const selectOptions = normalizeSelectOptions(input.selectOptions);
  if (valueType === 'select' && !selectOptions.length) {
    throw new Error('SELECT_OPTIONS_REQUIRED');
  }

  const values = sanitizeValueFields(valueType, selectOptions, input);

  return {
    specCategory: input.specCategory,
    name: input.name.trim(),
    valueType,
    selectOptions,
    status: (input.status ?? 'active') as FeatureDefinitionStatus,
    locale: normalizeLocale(input.locale),
    ...values,
  };
}

function pickPrimaryTranslation(translations: TranslationRow[]) {
  if (!translations.length) return null;
  const sorted = [...translations].sort((left, right) => {
    const leftPriority = left.locale.toLowerCase().startsWith('en') ? 0 : 1;
    const rightPriority = right.locale.toLowerCase().startsWith('en') ? 0 : 1;
    if (leftPriority !== rightPriority) return leftPriority - rightPriority;
    return left.createdAt.getTime() - right.createdAt.getTime();
  });
  return sorted[0] ?? null;
}

function normalizeTranslationRow(
  definition: DefinitionRow,
  translation: TranslationRow,
): AdminFeatureDefinitionTranslation {
  return {
    id: translation.id,
    definitionId: definition.id,
    locale: translation.locale,
    name: translation.name,
    valueText: translation.valueText,
    valueMin: parseNumeric(translation.valueMin),
    valueMax: parseNumeric(translation.valueMax),
    unit: translation.unit,
    specCategory: definition.specCategory as FeatureSpecCategory,
    valueType: definition.valueType as FeatureValueType,
    selectOptions: definition.selectOptions ?? [],
    status: definition.status as FeatureDefinitionStatus,
    createdAt: translation.createdAt.toISOString(),
    updatedAt: Math.max(definition.updatedAt.getTime(), translation.updatedAt.getTime()) === translation.updatedAt.getTime()
      ? translation.updatedAt.toISOString()
      : definition.updatedAt.toISOString(),
  };
}

function toListItem(definition: DefinitionRow, translations: TranslationRow[]): AdminFeatureDefinitionListItem | null {
  const primary = pickPrimaryTranslation(translations);
  if (!primary) return null;

  const normalized = normalizeTranslationRow(definition, primary);
  return {
    id: definition.id,
    name: primary.name,
    specCategory: definition.specCategory as FeatureSpecCategory,
    valueType: definition.valueType as FeatureValueType,
    selectOptions: definition.selectOptions ?? [],
    status: definition.status as FeatureDefinitionStatus,
    sortOrder: definition.sortOrder,
    valueDisplay: formatFeatureValueDisplay(normalized.valueType, normalized),
    unit: normalized.unit,
    primaryLocale: primary.locale,
    localeCount: translations.length,
    locales: translations.map((item) => item.locale).sort(),
    createdAt: definition.createdAt.toISOString(),
    updatedAt: definition.updatedAt.toISOString(),
  };
}

async function loadTranslationsByDefinitionIds(definitionIds: string[]) {
  if (!definitionIds.length) return new Map<string, TranslationRow[]>();

  const rows = await db
    .select()
    .from(featureDefinitionTranslations)
    .where(inArray(featureDefinitionTranslations.definitionId, definitionIds))
    .orderBy(asc(featureDefinitionTranslations.locale));

  const grouped = new Map<string, TranslationRow[]>();
  for (const row of rows) {
    const bucket = grouped.get(row.definitionId) ?? [];
    bucket.push(row);
    grouped.set(row.definitionId, bucket);
  }
  return grouped;
}

async function findDefinitionIdsBySearch(search: string) {
  const pattern = `%${search.trim()}%`;
  const translationMatches = await db
    .selectDistinct({ definitionId: featureDefinitionTranslations.definitionId })
    .from(featureDefinitionTranslations)
    .where(or(
      ilike(featureDefinitionTranslations.name, pattern),
      ilike(featureDefinitionTranslations.valueText, pattern),
      ilike(featureDefinitionTranslations.unit, pattern),
    ));

  const definitionMatches = await db
    .selectDistinct({ id: featureDefinitions.id })
    .from(featureDefinitions)
    .where(or(
      ilike(featureDefinitions.specCategory, pattern),
      ilike(featureDefinitions.valueType, pattern),
    ));

  const ids = new Set<string>();
  for (const row of translationMatches) ids.add(row.definitionId);
  for (const row of definitionMatches) ids.add(row.id);
  return Array.from(ids);
}

export async function findAdminFeatureDefinitionByCategoryNameAndLocale(
  specCategory: FeatureSpecCategory,
  name: string,
  locale: string,
  excludeDefinitionId?: string,
  excludeTranslationId?: string,
) {
  const conditions = [
    eq(featureDefinitions.specCategory, specCategory),
    eq(featureDefinitionTranslations.locale, normalizeLocale(locale)),
    eq(featureDefinitionTranslations.name, name.trim()),
  ];
  if (excludeDefinitionId) {
    conditions.push(ne(featureDefinitions.id, excludeDefinitionId));
  }
  if (excludeTranslationId) {
    conditions.push(ne(featureDefinitionTranslations.id, excludeTranslationId));
  }

  const [row] = await db
    .select({ definition: featureDefinitions, translation: featureDefinitionTranslations })
    .from(featureDefinitionTranslations)
    .innerJoin(featureDefinitions, eq(featureDefinitions.id, featureDefinitionTranslations.definitionId))
    .where(and(...conditions))
    .limit(1);

  return row ?? null;
}

export type AdminFeatureDefinitionListQuery = {
  keyword?: string;
  page?: number;
  pageSize?: number;
};

export type AdminFeatureDefinitionListPage = {
  items: AdminFeatureDefinitionListItem[];
  total: number;
  activeCount: number;
  page: number;
  pageSize: AdminListPageSize;
};

export async function getAdminFeatureDefinitionStats() {
  const [totalRow] = await db.select({ value: count() }).from(featureDefinitions);
  const [activeRow] = await db
    .select({ value: count() })
    .from(featureDefinitions)
    .where(eq(featureDefinitions.status, 'active'));

  return {
    total: Number(totalRow?.value ?? 0),
    activeCount: Number(activeRow?.value ?? 0),
  };
}

export async function getAdminFeatureDefinitionsPaginated(
  options: AdminFeatureDefinitionListQuery = {},
): Promise<AdminFeatureDefinitionListPage> {
  const page = Math.max(1, Math.floor(options.page ?? 1));
  const pageSize = normalizePageSize(options.pageSize ?? 20);
  const keyword = options.keyword?.trim() ?? '';

  const matchingIds = keyword ? await findDefinitionIdsBySearch(keyword) : undefined;
  if (keyword && !matchingIds?.length) {
    const stats = await getAdminFeatureDefinitionStats();
    return { items: [], total: 0, activeCount: stats.activeCount, page, pageSize };
  }

  const whereClause = matchingIds?.length ? inArray(featureDefinitions.id, matchingIds) : undefined;

  const [totalRow, activeRow] = await Promise.all([
    db.select({ value: count() }).from(featureDefinitions).where(whereClause),
    db.select({ value: count() }).from(featureDefinitions).where(
      whereClause
        ? and(whereClause, eq(featureDefinitions.status, 'active'))
        : eq(featureDefinitions.status, 'active'),
    ),
  ]);

  const total = Number(totalRow[0]?.value ?? 0);
  const activeCount = Number(activeRow[0]?.value ?? 0);
  const offset = (page - 1) * pageSize;

  const definitionRows = await db
    .select()
    .from(featureDefinitions)
    .where(whereClause)
    .orderBy(desc(featureDefinitions.updatedAt))
    .limit(pageSize)
    .offset(offset);

  const translationMap = await loadTranslationsByDefinitionIds(definitionRows.map((row) => row.id));

  const items = definitionRows
    .map((definition) => toListItem(definition, translationMap.get(definition.id) ?? []))
    .filter((item): item is AdminFeatureDefinitionListItem => Boolean(item));

  return { items, total, activeCount, page, pageSize };
}

export async function getAdminFeatureDefinitionListItem(definitionId: string) {
  const [definition] = await db.select().from(featureDefinitions).where(eq(featureDefinitions.id, definitionId)).limit(1);
  if (!definition) return null;

  const translations = await db
    .select()
    .from(featureDefinitionTranslations)
    .where(eq(featureDefinitionTranslations.definitionId, definitionId))
    .orderBy(asc(featureDefinitionTranslations.locale));

  return toListItem(definition, translations);
}

export async function getAdminFeatureDefinitionTranslations(definitionId: string) {
  const [definition] = await db.select().from(featureDefinitions).where(eq(featureDefinitions.id, definitionId)).limit(1);
  if (!definition) return [];

  const translations = await db
    .select()
    .from(featureDefinitionTranslations)
    .where(eq(featureDefinitionTranslations.definitionId, definitionId))
    .orderBy(asc(featureDefinitionTranslations.locale));

  return translations.map((translation) => normalizeTranslationRow(definition, translation));
}

export async function getAdminFeatureDefinitionTranslation(translationId: string) {
  const [row] = await db
    .select({ definition: featureDefinitions, translation: featureDefinitionTranslations })
    .from(featureDefinitionTranslations)
    .innerJoin(featureDefinitions, eq(featureDefinitions.id, featureDefinitionTranslations.definitionId))
    .where(eq(featureDefinitionTranslations.id, translationId))
    .limit(1);

  return row ? normalizeTranslationRow(row.definition, row.translation) : null;
}

export async function findAdminFeatureDefinitionTranslationByDefinitionAndLocale(
  definitionId: string,
  locale: string,
  excludeTranslationId?: string,
) {
  const normalizedLocale = normalizeLocale(locale);
  const conditions = [
    eq(featureDefinitionTranslations.definitionId, definitionId),
    eq(featureDefinitionTranslations.locale, normalizedLocale),
  ];
  if (excludeTranslationId) {
    conditions.push(ne(featureDefinitionTranslations.id, excludeTranslationId));
  }

  const [row] = await db
    .select({ definition: featureDefinitions, translation: featureDefinitionTranslations })
    .from(featureDefinitionTranslations)
    .innerJoin(featureDefinitions, eq(featureDefinitions.id, featureDefinitionTranslations.definitionId))
    .where(and(...conditions))
    .limit(1);

  return row ? normalizeTranslationRow(row.definition, row.translation) : null;
}

export async function createAdminFeatureDefinitionTranslation(input: TranslationCreateInput) {
  let next: ReturnType<typeof sanitizeTranslationInput>;
  try {
    next = sanitizeTranslationInput(input);
  } catch (error) {
    if (error instanceof Error) throw error;
    return null;
  }

  if (input.definitionId) {
    const existingLocale = await findAdminFeatureDefinitionTranslationByDefinitionAndLocale(input.definitionId, next.locale);
    if (existingLocale) {
      return updateAdminFeatureDefinitionTranslation(existingLocale.id, input);
    }
  }

  const duplicate = await findAdminFeatureDefinitionByCategoryNameAndLocale(
    next.specCategory,
    next.name,
    next.locale,
    input.definitionId,
  );
  if (duplicate) {
    throw new Error('DUPLICATE_NAME');
  }

  const definitionId = input.definitionId
    ? input.definitionId
    : (await db
      .insert(featureDefinitions)
      .values({
        specCategory: next.specCategory,
        valueType: next.valueType,
        selectOptions: next.selectOptions,
        status: next.status,
      })
      .returning({ id: featureDefinitions.id }))[0]?.id;

  if (!definitionId) return null;

  if (input.definitionId) {
    await db
      .update(featureDefinitions)
      .set({
        specCategory: next.specCategory,
        valueType: next.valueType,
        selectOptions: next.selectOptions,
        status: next.status,
        updatedAt: new Date(),
      })
      .where(eq(featureDefinitions.id, definitionId));
  }

  const [created] = await db
    .insert(featureDefinitionTranslations)
    .values({
      definitionId,
      locale: next.locale,
      name: next.name,
      valueText: next.valueText,
      valueMin: serializeNumeric(next.valueMin),
      valueMax: serializeNumeric(next.valueMax),
      unit: next.unit,
    })
    .returning();

  if (!created) return null;

  const [definition] = await db.select().from(featureDefinitions).where(eq(featureDefinitions.id, definitionId)).limit(1);
  return definition ? normalizeTranslationRow(definition, created) : null;
}

export async function updateAdminFeatureDefinitionTranslation(translationId: string, input: TranslationPatchInput) {
  const current = await getAdminFeatureDefinitionTranslation(translationId);
  if (!current) return null;

  const mergedInput: TranslationCreateInput = {
    definitionId: current.definitionId,
    locale: input.locale ?? current.locale,
    specCategory: input.specCategory ?? current.specCategory,
    name: input.name ?? current.name,
    valueType: input.valueType ?? current.valueType,
    selectOptions: input.selectOptions ?? current.selectOptions,
    status: input.status ?? current.status,
    valueText: input.valueText === undefined ? current.valueText : input.valueText,
    valueMin: input.valueMin === undefined ? current.valueMin : input.valueMin,
    valueMax: input.valueMax === undefined ? current.valueMax : input.valueMax,
    unit: input.unit === undefined ? current.unit : input.unit,
  };

  let next: ReturnType<typeof sanitizeTranslationInput>;
  try {
    next = sanitizeTranslationInput(mergedInput);
  } catch (error) {
    if (error instanceof Error) throw error;
    return null;
  }

  const duplicate = await findAdminFeatureDefinitionByCategoryNameAndLocale(
    next.specCategory,
    next.name,
    next.locale,
    current.definitionId,
    translationId,
  );
  if (duplicate) {
    throw new Error('DUPLICATE_NAME');
  }

  await db
    .update(featureDefinitions)
    .set({
      specCategory: next.specCategory,
      valueType: next.valueType,
      selectOptions: next.selectOptions,
      status: next.status,
      updatedAt: new Date(),
    })
    .where(eq(featureDefinitions.id, current.definitionId));

  const [updated] = await db
    .update(featureDefinitionTranslations)
    .set({
      locale: next.locale,
      name: next.name,
      valueText: next.valueText,
      valueMin: serializeNumeric(next.valueMin),
      valueMax: serializeNumeric(next.valueMax),
      unit: next.unit,
      updatedAt: new Date(),
    })
    .where(eq(featureDefinitionTranslations.id, translationId))
    .returning();

  if (!updated) return null;

  const [definition] = await db.select().from(featureDefinitions).where(eq(featureDefinitions.id, current.definitionId)).limit(1);
  return definition ? normalizeTranslationRow(definition, updated) : null;
}

export async function updateAdminFeatureDefinition(definitionId: string, input: DefinitionPatchInput) {
  const current = await getAdminFeatureDefinitionListItem(definitionId);
  if (!current) return null;

  const [updated] = await db
    .update(featureDefinitions)
    .set({
      specCategory: input.specCategory ?? current.specCategory,
      valueType: input.valueType ?? current.valueType,
      selectOptions: input.selectOptions ?? current.selectOptions,
      status: input.status ?? current.status,
      sortOrder: input.sortOrder ?? current.sortOrder,
      updatedAt: new Date(),
    })
    .where(eq(featureDefinitions.id, definitionId))
    .returning();

  if (!updated) return null;

  const translations = await db
    .select()
    .from(featureDefinitionTranslations)
    .where(eq(featureDefinitionTranslations.definitionId, definitionId));

  return toListItem(updated, translations);
}

export async function deleteAdminFeatureDefinition(definitionId: string) {
  const [deleted] = await db.delete(featureDefinitions).where(eq(featureDefinitions.id, definitionId)).returning({ id: featureDefinitions.id });
  return Boolean(deleted);
}

export { isUnitRequiredForValueType };
