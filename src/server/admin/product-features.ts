import 'server-only';

import { and, asc, count, desc, eq, inArray, notInArray, sql } from 'drizzle-orm';
import { z } from 'zod';

import type { FeatureDefinitionStatus, FeatureValueType } from '@/lib/feature-definition-content';
import {
  buildConfigurationKey,
  type FeatureSelectionSnapshot,
  type StorefrontConfigurableFeature,
} from '@/lib/product-feature-selection';
import {
  type AdminProductFeatureAssignmentListItem,
  type AdminProductFeatureValueDetail,
  type AdminProductFeatureValueListItem,
  type AdminProductFeatureValuePreview,
  type AdminProductFeatureValueTranslation,
  formatProductFeatureValueCore,
  formatProductFeatureValueDisplay,
} from '@/lib/product-feature-content';
import { pickTranslationForDisplay } from '@/lib/pick-translation-for-display';
import { mergeUniqueSortedTextOptions } from '@/lib/sort-locale-text';
import {
  DEFAULT_FEATURE_DEFINITION_LOCALE,
  findAdminFeatureDefinitionTranslationByDefinitionAndLocale,
  getAdminFeatureDefinitionTranslations,
  updateAdminFeatureDefinitionTranslation,
} from '@/server/admin/feature-definitions';
import { getDefaultSiteLanguageCode } from '@/server/admin/site-locale';
import { db } from '@/server/db';
import {
  featureDefinitionTranslations,
  featureDefinitions,
  productFeatureAssignments,
  productFeatureValues,
  productFeatureValueTranslations,
} from '@/server/db/schema';

const assignmentStatusSchema = z.enum(['active', 'inactive']);

export const productFeatureAssignmentCreateSchema = z.object({
  definitionId: z.string().uuid(),
});

export const productFeatureAssignmentPatchSchema = z.object({
  status: assignmentStatusSchema.optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

export const productFeatureValuePatchSchema = z.object({
  status: assignmentStatusSchema.optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

export const productFeatureValueTranslationInputSchema = z.object({
  locale: z.string().trim().min(2),
  valueText: z.string().trim().nullable().optional(),
  valueNumber: z.union([z.string(), z.number()]).nullable().optional(),
  valueBoolean: z.boolean().nullable().optional(),
});

export const productFeatureValueTranslationsSaveSchema = z.object({
  translations: z.array(productFeatureValueTranslationInputSchema).min(1),
});

type AssignmentRow = typeof productFeatureAssignments.$inferSelect;
type ValueRow = typeof productFeatureValues.$inferSelect;
type TranslationRow = typeof productFeatureValueTranslations.$inferSelect;
type DefinitionRow = typeof featureDefinitions.$inferSelect;
type DefinitionTranslationRow = typeof featureDefinitionTranslations.$inferSelect;

function normalizeLocale(value: string | null | undefined) {
  return value?.trim() || DEFAULT_FEATURE_DEFINITION_LOCALE;
}

async function getAdminDisplayLocale() {
  return getDefaultSiteLanguageCode();
}

async function loadDefinitionContext(definitionId: string) {
  const [definition] = await db.select().from(featureDefinitions).where(eq(featureDefinitions.id, definitionId)).limit(1);
  if (!definition) return null;

  const translations = await db
    .select()
    .from(featureDefinitionTranslations)
    .where(eq(featureDefinitionTranslations.definitionId, definitionId))
    .orderBy(asc(featureDefinitionTranslations.locale));

  return { definition, translations };
}

function buildAssignmentListItem(
  assignment: AssignmentRow,
  definition: DefinitionRow,
  primaryTranslation: DefinitionTranslationRow | null,
  valueCount: number,
  values: AdminProductFeatureValuePreview[] = [],
): AdminProductFeatureAssignmentListItem {
  return {
    id: assignment.id,
    productId: assignment.productId,
    definitionId: assignment.definitionId,
    key: definition.key,
    name: primaryTranslation?.name ?? definition.key,
    valueType: definition.valueType as FeatureValueType,
    status: assignment.status as FeatureDefinitionStatus,
    sortOrder: assignment.sortOrder,
    valueCount,
    values,
    createdAt: assignment.createdAt.toISOString(),
    updatedAt: assignment.updatedAt.toISOString(),
  };
}

function buildValuePreview(
  valueId: string,
  valueType: FeatureValueType,
  primaryTranslation: Pick<TranslationRow, 'valueText' | 'valueNumber' | 'valueBoolean'> | null,
  unit?: string | null,
): AdminProductFeatureValuePreview {
  const translationPayload = primaryTranslation
    ? {
        valueText: primaryTranslation.valueText,
        valueNumber: primaryTranslation.valueNumber,
        valueBoolean: primaryTranslation.valueBoolean,
      }
    : null;

  return {
    id: valueId,
    displayValue: formatProductFeatureValueCore(valueType, translationPayload),
    displayUnit: valueType === 'number' ? (unit?.trim() || null) : null,
  };
}

function buildValueListItem(
  value: ValueRow,
  valueType: FeatureValueType,
  primaryTranslation: Pick<TranslationRow, 'valueText' | 'valueNumber' | 'valueBoolean'> | null,
  unit?: string | null,
): AdminProductFeatureValueListItem {
  const preview = buildValuePreview(value.id, valueType, primaryTranslation, unit);

  return {
    id: value.id,
    assignmentId: value.assignmentId,
    status: value.status as FeatureDefinitionStatus,
    sortOrder: value.sortOrder,
    displayValue: preview.displayValue,
    displayUnit: preview.displayUnit,
    createdAt: value.createdAt.toISOString(),
    updatedAt: value.updatedAt.toISOString(),
  };
}

export async function countProductFeatureAssignmentsByProductIds(productIds: string[]) {
  if (!productIds.length) return new Map<string, number>();

  const rows = await db
    .select({
      productId: productFeatureAssignments.productId,
      value: count(),
    })
    .from(productFeatureAssignments)
    .where(inArray(productFeatureAssignments.productId, productIds))
    .groupBy(productFeatureAssignments.productId);

  return new Map(rows.map((row) => [row.productId, Number(row.value ?? 0)]));
}

export async function listAdminProductFeatureAssignments(productId: string) {
  const displayLocale = await getAdminDisplayLocale();
  const assignments = await db
    .select()
    .from(productFeatureAssignments)
    .where(eq(productFeatureAssignments.productId, productId))
    .orderBy(asc(productFeatureAssignments.sortOrder), asc(productFeatureAssignments.createdAt));

  if (!assignments.length) return [];

  const definitionIds = assignments.map((item) => item.definitionId);
  const assignmentIds = assignments.map((item) => item.id);

  const [definitions, definitionTranslations, valueCounts] = await Promise.all([
    db.select().from(featureDefinitions).where(inArray(featureDefinitions.id, definitionIds)),
    db
      .select()
      .from(featureDefinitionTranslations)
      .where(inArray(featureDefinitionTranslations.definitionId, definitionIds)),
    db
      .select({
        assignmentId: productFeatureValues.assignmentId,
        value: count(),
      })
      .from(productFeatureValues)
      .where(inArray(productFeatureValues.assignmentId, assignmentIds))
      .groupBy(productFeatureValues.assignmentId),
  ]);

  const definitionMap = new Map(definitions.map((item) => [item.id, item]));
  const translationsByDefinition = new Map<string, DefinitionTranslationRow[]>();
  for (const row of definitionTranslations) {
    const bucket = translationsByDefinition.get(row.definitionId) ?? [];
    bucket.push(row);
    translationsByDefinition.set(row.definitionId, bucket);
  }
  const valueCountMap = new Map(valueCounts.map((row) => [row.assignmentId, Number(row.value ?? 0)]));

  const allValues = assignmentIds.length
    ? await db
      .select()
      .from(productFeatureValues)
      .where(inArray(productFeatureValues.assignmentId, assignmentIds))
      .orderBy(asc(productFeatureValues.sortOrder), asc(productFeatureValues.createdAt))
    : [];

  const valueIds = allValues.map((item) => item.id);
  const valueTranslations = valueIds.length
    ? await db
      .select()
      .from(productFeatureValueTranslations)
      .where(inArray(productFeatureValueTranslations.valueId, valueIds))
    : [];

  const translationsByValue = new Map<string, TranslationRow[]>();
  for (const row of valueTranslations) {
    const bucket = translationsByValue.get(row.valueId) ?? [];
    bucket.push(row);
    translationsByValue.set(row.valueId, bucket);
  }

  const valuesByAssignment = new Map<string, typeof allValues>();
  for (const value of allValues) {
    const bucket = valuesByAssignment.get(value.assignmentId) ?? [];
    bucket.push(value);
    valuesByAssignment.set(value.assignmentId, bucket);
  }

  return assignments
    .map((assignment) => {
      const definition = definitionMap.get(assignment.definitionId);
      if (!definition) return null;
      const definitionTranslations = translationsByDefinition.get(assignment.definitionId) ?? [];
      const primary = pickTranslationForDisplay(definitionTranslations, displayLocale);
      const valueType = definition.valueType as FeatureValueType;
      const unit = primary?.unit ?? null;
      const assignmentValues = valuesByAssignment.get(assignment.id) ?? [];
      const previews = assignmentValues.map((value) => {
        const valueTranslationRows = translationsByValue.get(value.id) ?? [];
        const primaryValueTranslation = pickTranslationForDisplay(valueTranslationRows, displayLocale);
        return buildValuePreview(value.id, valueType, primaryValueTranslation, unit);
      });

      return buildAssignmentListItem(
        assignment,
        definition,
        primary,
        valueCountMap.get(assignment.id) ?? previews.length,
        previews,
      );
    })
    .filter((item): item is AdminProductFeatureAssignmentListItem => Boolean(item));
}

export async function listAvailableFeatureDefinitionsForProduct(productId: string) {
  const displayLocale = await getAdminDisplayLocale();
  const assigned = await db
    .select({ definitionId: productFeatureAssignments.definitionId })
    .from(productFeatureAssignments)
    .where(eq(productFeatureAssignments.productId, productId));

  const assignedIds = assigned.map((item) => item.definitionId);
  const definitions = await db
    .select()
    .from(featureDefinitions)
    .where(
      assignedIds.length
        ? and(eq(featureDefinitions.status, 'active'), notInArray(featureDefinitions.id, assignedIds))
        : eq(featureDefinitions.status, 'active'),
    )
    .orderBy(asc(featureDefinitions.key));

  const translations = definitions.length
    ? await db
      .select()
      .from(featureDefinitionTranslations)
      .where(inArray(featureDefinitionTranslations.definitionId, definitions.map((item) => item.id)))
    : [];

  const translationsByDefinition = new Map<string, DefinitionTranslationRow[]>();
  for (const row of translations) {
    const bucket = translationsByDefinition.get(row.definitionId) ?? [];
    bucket.push(row);
    translationsByDefinition.set(row.definitionId, bucket);
  }

  return definitions.map((definition) => {
    const primary = pickTranslationForDisplay(translationsByDefinition.get(definition.id) ?? [], displayLocale);
    return {
      id: definition.id,
      key: definition.key,
      name: primary?.name ?? definition.key,
      valueType: definition.valueType as FeatureValueType,
    };
  });
}

export async function createAdminProductFeatureAssignment(productId: string, definitionId: string) {
  const context = await loadDefinitionContext(definitionId);
  if (!context) throw new Error('DEFINITION_NOT_FOUND');
  if (context.definition.status !== 'active') throw new Error('DEFINITION_INACTIVE');

  const [existing] = await db
    .select({ id: productFeatureAssignments.id })
    .from(productFeatureAssignments)
    .where(and(
      eq(productFeatureAssignments.productId, productId),
      eq(productFeatureAssignments.definitionId, definitionId),
    ))
    .limit(1);

  if (existing) throw new Error('DUPLICATE_ASSIGNMENT');

  const [maxSort] = await db
    .select({ sortOrder: productFeatureAssignments.sortOrder })
    .from(productFeatureAssignments)
    .where(eq(productFeatureAssignments.productId, productId))
    .orderBy(desc(productFeatureAssignments.sortOrder))
    .limit(1);

  const [created] = await db
    .insert(productFeatureAssignments)
    .values({
      productId,
      definitionId,
      sortOrder: (maxSort?.sortOrder ?? -1) + 1,
    })
    .returning();

  if (!created) return null;

  const displayLocale = await getAdminDisplayLocale();
  const primary = pickTranslationForDisplay(context.translations, displayLocale);
  return buildAssignmentListItem(created, context.definition, primary, 0);
}

export async function updateAdminProductFeatureAssignment(
  assignmentId: string,
  input: z.infer<typeof productFeatureAssignmentPatchSchema>,
) {
  const [current] = await db
    .select()
    .from(productFeatureAssignments)
    .where(eq(productFeatureAssignments.id, assignmentId))
    .limit(1);

  if (!current) return null;

  const [updated] = await db
    .update(productFeatureAssignments)
    .set({
      status: input.status ?? current.status,
      sortOrder: input.sortOrder ?? current.sortOrder,
      updatedAt: new Date(),
    })
    .where(eq(productFeatureAssignments.id, assignmentId))
    .returning();

  if (!updated) return null;

  const context = await loadDefinitionContext(updated.definitionId);
  if (!context) return null;

  const [valueCountRow] = await db
    .select({ value: count() })
    .from(productFeatureValues)
    .where(eq(productFeatureValues.assignmentId, assignmentId));

  const displayLocale = await getAdminDisplayLocale();
  const primary = pickTranslationForDisplay(context.translations, displayLocale);
  return buildAssignmentListItem(updated, context.definition, primary, Number(valueCountRow?.value ?? 0));
}

export async function deleteAdminProductFeatureAssignment(assignmentId: string) {
  const [deleted] = await db
    .delete(productFeatureAssignments)
    .where(eq(productFeatureAssignments.id, assignmentId))
    .returning({ id: productFeatureAssignments.id });
  return Boolean(deleted);
}

export async function listAdminProductFeatureValues(assignmentId: string) {
  const displayLocale = await getAdminDisplayLocale();
  const [assignment] = await db
    .select()
    .from(productFeatureAssignments)
    .where(eq(productFeatureAssignments.id, assignmentId))
    .limit(1);

  if (!assignment) return null;

  const context = await loadDefinitionContext(assignment.definitionId);
  if (!context) return null;

  const values = await db
    .select()
    .from(productFeatureValues)
    .where(eq(productFeatureValues.assignmentId, assignmentId))
    .orderBy(asc(productFeatureValues.sortOrder), asc(productFeatureValues.createdAt));

  if (!values.length) {
    return {
      assignment: buildAssignmentListItem(
        assignment,
        context.definition,
        pickTranslationForDisplay(context.translations, displayLocale),
        0,
      ),
      items: [] as AdminProductFeatureValueListItem[],
    };
  }

  const valueIds = values.map((item) => item.id);
  const translations = await db
    .select()
    .from(productFeatureValueTranslations)
    .where(inArray(productFeatureValueTranslations.valueId, valueIds));

  const translationsByValue = new Map<string, TranslationRow[]>();
  for (const row of translations) {
    const bucket = translationsByValue.get(row.valueId) ?? [];
    bucket.push(row);
    translationsByValue.set(row.valueId, bucket);
  }

  const primaryDefinitionTranslation = pickTranslationForDisplay(context.translations, displayLocale);
  const unit = primaryDefinitionTranslation?.unit ?? null;
  const valueType = context.definition.valueType as FeatureValueType;

  const items = values.map((value) => {
    const valueTranslations = translationsByValue.get(value.id) ?? [];
    const primary = pickTranslationForDisplay(valueTranslations, displayLocale);
    return buildValueListItem(value, valueType, primary, unit);
  });

  return {
    assignment: buildAssignmentListItem(
      assignment,
      context.definition,
      primaryDefinitionTranslation,
      values.length,
    ),
    items,
  };
}

export async function createAdminProductFeatureValue(assignmentId: string) {
  const [assignment] = await db
    .select()
    .from(productFeatureAssignments)
    .where(eq(productFeatureAssignments.id, assignmentId))
    .limit(1);

  if (!assignment) return null;

  const context = await loadDefinitionContext(assignment.definitionId);
  if (!context) return null;

  const [maxSort] = await db
    .select({ sortOrder: productFeatureValues.sortOrder })
    .from(productFeatureValues)
    .where(eq(productFeatureValues.assignmentId, assignmentId))
    .orderBy(desc(productFeatureValues.sortOrder))
    .limit(1);

  const [created] = await db
    .insert(productFeatureValues)
    .values({
      assignmentId,
      sortOrder: (maxSort?.sortOrder ?? -1) + 1,
    })
    .returning();

  if (!created) return null;

  const displayLocale = await getAdminDisplayLocale();
  const valueType = context.definition.valueType as FeatureValueType;
  return buildValueListItem(
    created,
    valueType,
    null,
    pickTranslationForDisplay(context.translations, displayLocale)?.unit,
  );
}

export async function updateAdminProductFeatureValue(
  valueId: string,
  input: z.infer<typeof productFeatureValuePatchSchema>,
) {
  const detail = await getAdminProductFeatureValueDetail(valueId);
  if (!detail) return null;

  const [updated] = await db
    .update(productFeatureValues)
    .set({
      status: input.status ?? detail.value.status,
      sortOrder: input.sortOrder ?? detail.value.sortOrder,
      updatedAt: new Date(),
    })
    .where(eq(productFeatureValues.id, valueId))
    .returning();

  if (!updated) return null;

  const displayLocale = await getAdminDisplayLocale();
  const primaryTranslation = pickTranslationForDisplay(detail.translations, displayLocale);

  return buildValueListItem(
    updated,
    detail.valueType,
    primaryTranslation,
    detail.unitByLocale[primaryTranslation?.locale ?? displayLocale] ?? null,
  );
}

export async function deleteAdminProductFeatureValue(valueId: string) {
  const [deleted] = await db
    .delete(productFeatureValues)
    .where(eq(productFeatureValues.id, valueId))
    .returning({ id: productFeatureValues.id });
  return Boolean(deleted);
}

export async function getAdminProductFeatureValueDetail(valueId: string): Promise<AdminProductFeatureValueDetail | null> {
  const [value] = await db
    .select()
    .from(productFeatureValues)
    .where(eq(productFeatureValues.id, valueId))
    .limit(1);

  if (!value) return null;

  const [assignment] = await db
    .select()
    .from(productFeatureAssignments)
    .where(eq(productFeatureAssignments.id, value.assignmentId))
    .limit(1);

  if (!assignment) return null;

  const context = await loadDefinitionContext(assignment.definitionId);
  if (!context) return null;

  const translations = await db
    .select()
    .from(productFeatureValueTranslations)
    .where(eq(productFeatureValueTranslations.valueId, valueId))
    .orderBy(asc(productFeatureValueTranslations.locale));

  const displayLocale = await getAdminDisplayLocale();
  const primaryDefinitionTranslation = pickTranslationForDisplay(context.translations, displayLocale);
  const valueType = context.definition.valueType as FeatureValueType;
  const unitByLocale: Record<string, string | null> = {};
  const textOptionsByLocale: Record<string, string[]> = {};
  for (const row of context.translations) {
    unitByLocale[row.locale] = row.unit;
    textOptionsByLocale[row.locale] = row.textOptions ?? [];
  }

  const primaryValueTranslation = pickTranslationForDisplay(translations, displayLocale)
    ?? translations[0]
    ?? null;

  return {
    value: buildValueListItem(
      value,
      valueType,
      primaryValueTranslation,
      unitByLocale[primaryValueTranslation?.locale ?? DEFAULT_FEATURE_DEFINITION_LOCALE] ?? null,
    ),
    valueType,
    definitionKey: context.definition.key,
    definitionName: primaryDefinitionTranslation?.name ?? context.definition.key,
    unitByLocale,
    textOptionsByLocale,
    translations: translations.map((row) => ({
      id: row.id,
      valueId: row.valueId,
      locale: row.locale,
      valueText: row.valueText,
      valueNumber: row.valueNumber,
      valueBoolean: row.valueBoolean,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
  };
}

function validateTranslationPayload(
  valueType: FeatureValueType,
  input: z.infer<typeof productFeatureValueTranslationInputSchema>,
) {
  const locale = normalizeLocale(input.locale);
  if (valueType === 'number') {
    const raw = input.valueNumber;
    const normalized = raw == null || raw === '' ? null : String(raw).trim();
    if (!normalized || Number.isNaN(Number(normalized))) throw new Error('VALUE_REQUIRED');
    return { locale, valueText: null, valueNumber: normalized, valueBoolean: null };
  }
  if (valueType === 'boolean') {
    if (input.valueBoolean == null) throw new Error('VALUE_REQUIRED');
    return { locale, valueText: null, valueNumber: null, valueBoolean: input.valueBoolean };
  }
  const text = input.valueText?.trim() ?? '';
  if (!text) throw new Error('VALUE_REQUIRED');
  return { locale, valueText: text, valueNumber: null, valueBoolean: null };
}

export async function saveAdminProductFeatureValueTranslations(
  valueId: string,
  input: z.infer<typeof productFeatureValueTranslationsSaveSchema>,
) {
  const detail = await getAdminProductFeatureValueDetail(valueId);
  if (!detail) return null;

  const [assignment] = await db
    .select({ definitionId: productFeatureAssignments.definitionId })
    .from(productFeatureValues)
    .innerJoin(productFeatureAssignments, eq(productFeatureAssignments.id, productFeatureValues.assignmentId))
    .where(eq(productFeatureValues.id, valueId))
    .limit(1);

  if (!assignment) return null;

  const definitionTranslations = await getAdminFeatureDefinitionTranslations(assignment.definitionId);

  for (const item of input.translations) {
    const next = validateTranslationPayload(detail.valueType, item);

    const existing = await db
      .select()
      .from(productFeatureValueTranslations)
      .where(and(
        eq(productFeatureValueTranslations.valueId, valueId),
        eq(productFeatureValueTranslations.locale, next.locale),
      ))
      .limit(1);

    if (existing[0]) {
      await db
        .update(productFeatureValueTranslations)
        .set({
          valueText: next.valueText,
          valueNumber: next.valueNumber,
          valueBoolean: next.valueBoolean,
          updatedAt: new Date(),
        })
        .where(eq(productFeatureValueTranslations.id, existing[0].id));
    } else {
      await db.insert(productFeatureValueTranslations).values({
        valueId,
        locale: next.locale,
        valueText: next.valueText,
        valueNumber: next.valueNumber,
        valueBoolean: next.valueBoolean,
      });
    }

    if (detail.valueType === 'text' && next.valueText) {
      const definitionTranslation = definitionTranslations.find((row) => row.locale === next.locale)
        ?? await findAdminFeatureDefinitionTranslationByDefinitionAndLocale(assignment.definitionId, next.locale);

      if (definitionTranslation) {
        const mergedOptions = mergeUniqueSortedTextOptions(
          definitionTranslation.textOptions ?? [],
          [next.valueText],
        );
        const hasNewOption = mergedOptions.length > (definitionTranslation.textOptions?.length ?? 0)
          || mergedOptions.some((option, index) => option !== (definitionTranslation.textOptions?.[index] ?? ''));

        if (hasNewOption) {
          await updateAdminFeatureDefinitionTranslation(definitionTranslation.id, {
            textOptions: mergedOptions,
          });
        }
      }
    }
  }

  return getAdminProductFeatureValueDetail(valueId);
}

export async function getStorefrontProductFeatures(productId: string, locale: string) {
  const normalizedLocale = normalizeLocale(locale);
  const assignments = await db
    .select({
      assignment: productFeatureAssignments,
      definition: featureDefinitions,
    })
    .from(productFeatureAssignments)
    .innerJoin(featureDefinitions, eq(featureDefinitions.id, productFeatureAssignments.definitionId))
    .where(and(
      eq(productFeatureAssignments.productId, productId),
      eq(productFeatureAssignments.status, 'active'),
    ))
    .orderBy(asc(productFeatureAssignments.sortOrder), asc(productFeatureAssignments.createdAt));

  if (!assignments.length) return [];

  const definitionIds = assignments.map((row) => row.definition.id);
  const assignmentIds = assignments.map((row) => row.assignment.id);

  const [definitionTranslations, values, valueTranslations] = await Promise.all([
    db
      .select()
      .from(featureDefinitionTranslations)
      .where(inArray(featureDefinitionTranslations.definitionId, definitionIds)),
    db
      .select()
      .from(productFeatureValues)
      .where(and(
        inArray(productFeatureValues.assignmentId, assignmentIds),
        eq(productFeatureValues.status, 'active'),
      ))
      .orderBy(asc(productFeatureValues.sortOrder), asc(productFeatureValues.createdAt)),
    db
      .select({
        translation: productFeatureValueTranslations,
        valueId: productFeatureValues.id,
        assignmentId: productFeatureValues.assignmentId,
      })
      .from(productFeatureValueTranslations)
      .innerJoin(productFeatureValues, eq(productFeatureValues.id, productFeatureValueTranslations.valueId))
      .where(inArray(productFeatureValues.assignmentId, assignmentIds)),
  ]);

  const definitionTranslationMap = new Map<string, DefinitionTranslationRow[]>();
  for (const row of definitionTranslations) {
    const bucket = definitionTranslationMap.get(row.definitionId) ?? [];
    bucket.push(row);
    definitionTranslationMap.set(row.definitionId, bucket);
  }

  const valueTranslationsByValue = new Map<string, TranslationRow[]>();
  for (const row of valueTranslations) {
    const bucket = valueTranslationsByValue.get(row.valueId) ?? [];
    bucket.push(row.translation);
    valueTranslationsByValue.set(row.valueId, bucket);
  }

  const valuesByAssignment = new Map<string, ValueRow[]>();
  for (const row of values) {
    const bucket = valuesByAssignment.get(row.assignmentId) ?? [];
    bucket.push(row);
    valuesByAssignment.set(row.assignmentId, bucket);
  }

  const features: Array<{
    key: string;
    value: string;
    unit?: string | null;
    category?: string;
    valueType?: string;
  }> = [];

  for (const { assignment, definition } of assignments) {
    const definitionLocaleRows = definitionTranslationMap.get(definition.id) ?? [];
    const definitionTranslation = pickTranslationForDisplay(definitionLocaleRows, normalizedLocale);
    const unit = definitionTranslation?.unit ?? null;
    const valueType = definition.valueType as FeatureValueType;
    const assignmentValues = valuesByAssignment.get(assignment.id) ?? [];

    for (const value of assignmentValues) {
      const translations = valueTranslationsByValue.get(value.id) ?? [];
      const valueTranslation = translations.find((row) => row.locale === normalizedLocale)
        ?? translations[0]
        ?? null;
      const display = formatProductFeatureValueDisplay(valueType, valueTranslation, unit);
      if (display === '—') continue;
      features.push({
        key: definition.key,
        value: display,
        unit: valueType === 'number' ? unit : null,
        category: definition.specCategory,
        valueType: definition.valueType,
      });
    }
  }

  return features;
}

export async function getStorefrontProductFeatureOptions(productId: string, locale: string): Promise<StorefrontConfigurableFeature[]> {
  const normalizedLocale = normalizeLocale(locale);
  const assignments = await db
    .select({
      assignment: productFeatureAssignments,
      definition: featureDefinitions,
    })
    .from(productFeatureAssignments)
    .innerJoin(featureDefinitions, eq(featureDefinitions.id, productFeatureAssignments.definitionId))
    .where(and(
      eq(productFeatureAssignments.productId, productId),
      eq(productFeatureAssignments.status, 'active'),
    ))
    .orderBy(asc(productFeatureAssignments.sortOrder), asc(productFeatureAssignments.createdAt));

  if (!assignments.length) return [];

  const definitionIds = assignments.map((row) => row.definition.id);
  const assignmentIds = assignments.map((row) => row.assignment.id);

  const [definitionTranslations, values, valueTranslations] = await Promise.all([
    db
      .select()
      .from(featureDefinitionTranslations)
      .where(inArray(featureDefinitionTranslations.definitionId, definitionIds)),
    db
      .select()
      .from(productFeatureValues)
      .where(and(
        inArray(productFeatureValues.assignmentId, assignmentIds),
        eq(productFeatureValues.status, 'active'),
      ))
      .orderBy(asc(productFeatureValues.sortOrder), asc(productFeatureValues.createdAt)),
    db
      .select({
        translation: productFeatureValueTranslations,
        valueId: productFeatureValues.id,
        assignmentId: productFeatureValues.assignmentId,
      })
      .from(productFeatureValueTranslations)
      .innerJoin(productFeatureValues, eq(productFeatureValues.id, productFeatureValueTranslations.valueId))
      .where(inArray(productFeatureValues.assignmentId, assignmentIds)),
  ]);

  const definitionTranslationMap = new Map<string, DefinitionTranslationRow[]>();
  for (const row of definitionTranslations) {
    const bucket = definitionTranslationMap.get(row.definitionId) ?? [];
    bucket.push(row);
    definitionTranslationMap.set(row.definitionId, bucket);
  }

  const valueTranslationsByValue = new Map<string, TranslationRow[]>();
  for (const row of valueTranslations) {
    const bucket = valueTranslationsByValue.get(row.valueId) ?? [];
    bucket.push(row.translation);
    valueTranslationsByValue.set(row.valueId, bucket);
  }

  const valuesByAssignment = new Map<string, ValueRow[]>();
  for (const row of values) {
    const bucket = valuesByAssignment.get(row.assignmentId) ?? [];
    bucket.push(row);
    valuesByAssignment.set(row.assignmentId, bucket);
  }

  return assignments.map(({ assignment, definition }) => {
    const definitionLocaleRows = definitionTranslationMap.get(definition.id) ?? [];
    const definitionTranslation = pickTranslationForDisplay(definitionLocaleRows, normalizedLocale);
    const unit = definitionTranslation?.unit ?? null;
    const valueType = definition.valueType as FeatureValueType;
    const assignmentValues = valuesByAssignment.get(assignment.id) ?? [];

    const options = assignmentValues
      .map((value) => {
        const translations = valueTranslationsByValue.get(value.id) ?? [];
        const valueTranslation = translations.find((row) => row.locale === normalizedLocale)
          ?? translations[0]
          ?? null;
        const display = formatProductFeatureValueDisplay(valueType, valueTranslation, unit);
        if (display === '—') return null;
        return { valueId: value.id, display };
      })
      .filter((item): item is { valueId: string; display: string } => Boolean(item));

    return {
      definitionId: definition.id,
      assignmentId: assignment.id,
      key: definition.key,
      name: definitionTranslation?.name ?? definition.key,
      category: definition.specCategory,
      valueType: definition.valueType,
      unit: valueType === 'number' ? unit : null,
      options,
    };
  });
}

type ValidateFeatureSelectionsResult =
  | {
      ok: true;
      configurationKey: string;
      featureSelections: FeatureSelectionSnapshot;
    }
  | {
      ok: false;
      code: 'INVALID_FEATURE_SELECTIONS';
      message: string;
    };

export async function validateAndBuildFeatureSelections(
  productId: string,
  locale: string,
  valueIds: string[],
): Promise<ValidateFeatureSelectionsResult> {
  const configurableFeatures = await getStorefrontProductFeatureOptions(productId, locale);

  if (!configurableFeatures.length) {
    if (valueIds.length > 0) {
      return {
        ok: false,
        code: 'INVALID_FEATURE_SELECTIONS',
        message: 'This product has no configurable features.',
      };
    }
    return { ok: true, configurationKey: '', featureSelections: [] };
  }

  const uniqueValueIds = [...new Set(valueIds)];
  if (uniqueValueIds.length !== valueIds.length) {
    return {
      ok: false,
      code: 'INVALID_FEATURE_SELECTIONS',
      message: 'Duplicate feature value selections are not allowed.',
    };
  }

  const optionByValueId = new Map<string, { feature: StorefrontConfigurableFeature; option: { valueId: string; display: string } }>();
  for (const feature of configurableFeatures) {
    for (const option of feature.options) {
      optionByValueId.set(option.valueId, { feature, option });
    }
  }

  const featureSelections: FeatureSelectionSnapshot = [];

  for (const feature of configurableFeatures) {
    const selectedForFeature = valueIds.filter((valueId) => optionByValueId.get(valueId)?.feature.assignmentId === feature.assignmentId);
    if (selectedForFeature.length !== 1) {
      return {
        ok: false,
        code: 'INVALID_FEATURE_SELECTIONS',
        message: `Select exactly one value for feature "${feature.name}".`,
      };
    }

    const selected = optionByValueId.get(selectedForFeature[0]!);
    if (!selected) {
      return {
        ok: false,
        code: 'INVALID_FEATURE_SELECTIONS',
        message: 'One or more selected feature values are invalid.',
      };
    }

    featureSelections.push({
      definitionId: feature.definitionId,
      definitionKey: feature.key,
      definitionName: feature.name,
      valueId: selected.option.valueId,
      display: selected.option.display,
      unit: feature.unit,
    });
  }

  const unknownValueIds = valueIds.filter((valueId) => !optionByValueId.has(valueId));
  if (unknownValueIds.length) {
    return {
      ok: false,
      code: 'INVALID_FEATURE_SELECTIONS',
      message: 'One or more selected feature values are invalid.',
    };
  }

  return {
    ok: true,
    configurationKey: buildConfigurationKey(featureSelections.map((item) => item.valueId)),
    featureSelections,
  };
}
