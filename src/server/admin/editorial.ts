import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';

import {
  type AdminEditorialDashboard,
  cloneEditorialAutomationConfig,
  defaultEditorialAutomationConfig,
  editorialBriefStatuses,
  editorialCadenceValues,
  editorialContentTypes,
  editorialRunStatuses,
  editorialTriggerTypes,
  type EditorialAiTemplate,
  type EditorialAutomationConfig,
  type EditorialAutomationRule,
  type EditorialBrief,
  type EditorialCoverageBoard,
  type EditorialBriefStatus,
  type EditorialCoverageMetric,
  type EditorialGenerationRun,
  type EditorialRunStatus,
  type EditorialWorkflowSettings,
} from '@/lib/editorial-automation';
import { getAdminEditorialContentList } from '@/server/admin/editorial-content';
import { db } from '@/server/db';
import { editorialSettings } from '@/server/db/schema';

const EDITORIAL_SETTINGS_ROW_ID = 'default';

function sanitizeText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function sanitizeStringArray(values: string[] | null | undefined) {
  return (values ?? []).map((value) => value.trim()).filter(Boolean);
}

function sanitizeCoverageBoard(board: EditorialCoverageBoard, index: number): EditorialCoverageBoard {
  const key = sanitizeText(board.key)?.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || `board-${index + 1}`;
  return {
    key,
    title: sanitizeText(board.title) ?? `内容看板 ${index + 1}`,
    contentType: toContentType(board.contentType),
    note: sanitizeText(board.note) ?? '自定义内容看板。',
    sourceMode: board.sourceMode === 'admin-managed' ? 'admin-managed' : 'code-seeded',
  };
}

function toContentType(value: string | null | undefined) {
  return editorialContentTypes.includes(value as (typeof editorialContentTypes)[number])
    ? (value as (typeof editorialContentTypes)[number])
    : 'content';
}

function toTriggerType(value: string | null | undefined) {
  return editorialTriggerTypes.includes(value as (typeof editorialTriggerTypes)[number])
    ? (value as (typeof editorialTriggerTypes)[number])
    : 'manual';
}

function toCadence(value: string | null | undefined) {
  return editorialCadenceValues.includes(value as (typeof editorialCadenceValues)[number])
    ? (value as (typeof editorialCadenceValues)[number])
    : 'manual';
}

function toBriefStatus(value: string | null | undefined): EditorialBriefStatus {
  return editorialBriefStatuses.includes(value as EditorialBriefStatus) ? (value as EditorialBriefStatus) : 'idea';
}

function toRunStatus(value: string | null | undefined): EditorialRunStatus {
  return editorialRunStatuses.includes(value as EditorialRunStatus) ? (value as EditorialRunStatus) : 'queued';
}

function sanitizeWorkflowSettings(settings: EditorialWorkflowSettings): EditorialWorkflowSettings {
  return {
    brandVoiceSummary: sanitizeText(settings.brandVoiceSummary) ?? defaultEditorialAutomationConfig.workflowSettings.brandVoiceSummary,
    geoStrategy: sanitizeText(settings.geoStrategy) ?? defaultEditorialAutomationConfig.workflowSettings.geoStrategy,
    internalLinkPolicy: sanitizeText(settings.internalLinkPolicy) ?? defaultEditorialAutomationConfig.workflowSettings.internalLinkPolicy,
    factCheckingPolicy: sanitizeText(settings.factCheckingPolicy) ?? defaultEditorialAutomationConfig.workflowSettings.factCheckingPolicy,
    schemaPriorities: sanitizeStringArray(settings.schemaPriorities),
    publishGuardrails: sanitizeStringArray(settings.publishGuardrails),
  };
}

function sanitizeTemplate(template: EditorialAiTemplate, index: number): EditorialAiTemplate {
  return {
    id: sanitizeText(template.id) ?? randomUUID(),
    name: sanitizeText(template.name) ?? `模板 ${index + 1}`,
    contentType: toContentType(template.contentType),
    objective: sanitizeText(template.objective) ?? '待补充目标',
    systemPrompt: sanitizeText(template.systemPrompt) ?? '待补充 system prompt',
    userPromptTemplate: sanitizeText(template.userPromptTemplate) ?? '待补充 user prompt',
    outputChecklist: sanitizeStringArray(template.outputChecklist),
    modelHint: sanitizeText(template.modelHint) ?? 'GPT-5.4',
    locale: sanitizeText(template.locale) ?? 'en-US',
    targetRoute: sanitizeText(template.targetRoute) ?? '/',
    enabled: template.enabled !== false,
  };
}

function sanitizeRule(rule: EditorialAutomationRule, index: number): EditorialAutomationRule {
  return {
    id: sanitizeText(rule.id) ?? randomUUID(),
    name: sanitizeText(rule.name) ?? `规则 ${index + 1}`,
    contentType: toContentType(rule.contentType),
    triggerType: toTriggerType(rule.triggerType),
    cadence: toCadence(rule.cadence),
    sourceSignal: sanitizeText(rule.sourceSignal) ?? 'manual',
    targetKeywordCluster: sanitizeText(rule.targetKeywordCluster) ?? '待补充关键词簇',
    autoCreateBrief: Boolean(rule.autoCreateBrief),
    autoQueueGeneration: Boolean(rule.autoQueueGeneration),
    requiresHumanReview: rule.requiresHumanReview !== false,
    enabled: rule.enabled !== false,
    nextRunAt: sanitizeText(rule.nextRunAt),
  };
}

function sanitizeBrief(brief: EditorialBrief, index: number): EditorialBrief {
  return {
    id: sanitizeText(brief.id) ?? randomUUID(),
    title: sanitizeText(brief.title) ?? `内容 Brief ${index + 1}`,
    contentType: toContentType(brief.contentType),
    targetKeyword: sanitizeText(brief.targetKeyword) ?? '待补充关键词',
    searchIntent: sanitizeText(brief.searchIntent) ?? '待补充搜索意图',
    audience: sanitizeText(brief.audience) ?? '待补充受众',
    funnelStage: sanitizeText(brief.funnelStage) ?? 'TOFU',
    locale: sanitizeText(brief.locale) ?? 'en-US',
    targetRoute: sanitizeText(brief.targetRoute) ?? '/',
    aiTemplateId: sanitizeText(brief.aiTemplateId),
    linkedProductSlugs: sanitizeStringArray(brief.linkedProductSlugs),
    outline: sanitizeStringArray(brief.outline),
    status: toBriefStatus(brief.status),
    scheduledAt: sanitizeText(brief.scheduledAt),
    owner: sanitizeText(brief.owner) ?? '内容运营',
    notes: sanitizeText(brief.notes),
    updatedAt: sanitizeText(brief.updatedAt) ?? new Date().toISOString(),
  };
}

function sanitizeRun(run: EditorialGenerationRun, index: number): EditorialGenerationRun {
  return {
    id: sanitizeText(run.id) ?? randomUUID(),
    briefId: sanitizeText(run.briefId),
    contentType: toContentType(run.contentType),
    modelName: sanitizeText(run.modelName) ?? 'GPT-5.4',
    status: toRunStatus(run.status),
    outputTitle: sanitizeText(run.outputTitle) ?? `生成记录 ${index + 1}`,
    outputSlug: sanitizeText(run.outputSlug),
    qualityScore: run.qualityScore == null ? null : Math.max(0, Math.min(100, Number(run.qualityScore))),
    reviewNotes: sanitizeText(run.reviewNotes),
    createdAt: sanitizeText(run.createdAt) ?? new Date().toISOString(),
    updatedAt: sanitizeText(run.updatedAt) ?? new Date().toISOString(),
  };
}

function sanitizeEditorialAutomationConfig(config: EditorialAutomationConfig): EditorialAutomationConfig {
  const base = cloneEditorialAutomationConfig(defaultEditorialAutomationConfig);

  return {
    workflowSettings: sanitizeWorkflowSettings(config.workflowSettings ?? base.workflowSettings),
    coverageBoards: (config.coverageBoards?.length ? config.coverageBoards : base.coverageBoards).map(sanitizeCoverageBoard),
    templates: (config.templates?.length ? config.templates : base.templates).map(sanitizeTemplate),
    rules: (config.rules?.length ? config.rules : base.rules).map(sanitizeRule),
    briefs: (config.briefs ?? base.briefs).map(sanitizeBrief),
    runs: (config.runs ?? base.runs).map(sanitizeRun),
  };
}

async function buildCoverageMetrics(): Promise<EditorialCoverageMetric[]> {
  const entries = await getAdminEditorialContentList();

  return defaultEditorialAutomationConfig.coverageBoards.map((board) => ({
    ...board,
    count: entries.filter((entry) => entry.boardKey === board.key).length,
  }));
}

async function buildDashboard(config: EditorialAutomationConfig): Promise<AdminEditorialDashboard> {
  const entries = await getAdminEditorialContentList();
  const defaultCoverage = await buildCoverageMetrics();
  const defaultBoardKeys = new Set(defaultCoverage.map((board) => board.key));
  const contentCounts = new Map<string, number>();
  for (const entry of entries) {
    contentCounts.set(entry.boardKey, (contentCounts.get(entry.boardKey) ?? 0) + 1);
  }
  const coverage = config.coverageBoards.map((board) => ({
    ...board,
    count: contentCounts.get(board.key) ?? 0,
    custom: !defaultBoardKeys.has(board.key),
  }));

  return {
    coverage,
    summary: {
      liveContentTypes: coverage.length,
      liveDocumentCount: coverage.reduce((sum, item) => sum + item.count, 0),
      activeTemplates: config.templates.filter((item) => item.enabled).length,
      enabledRules: config.rules.filter((item) => item.enabled).length,
      briefsInPipeline: config.briefs.filter((item) => item.status !== 'published').length,
      recentCompletedRuns: config.runs.filter((item) => item.status === 'completed' || item.status === 'reviewed').length,
    },
    config,
  };
}

function mapDbConfig(row: {
  workflowSettings: EditorialWorkflowSettings;
  coverageBoards?: EditorialCoverageBoard[];
  templates: EditorialAiTemplate[];
  rules: EditorialAutomationRule[];
  briefs: EditorialBrief[];
  runs: EditorialGenerationRun[];
}) {
  return sanitizeEditorialAutomationConfig({
    workflowSettings: row.workflowSettings,
    coverageBoards: row.coverageBoards ?? [],
    templates: row.templates,
    rules: row.rules,
    briefs: row.briefs,
    runs: row.runs,
  });
}

async function ensureEditorialConfig() {
  const [row] = await db.select().from(editorialSettings).where(eq(editorialSettings.id, EDITORIAL_SETTINGS_ROW_ID)).limit(1);
  if (row) {
    const config = mapDbConfig(row);
    if (!row.coverageBoards?.length) {
      await db
        .update(editorialSettings)
        .set({ coverageBoards: config.coverageBoards, updatedAt: new Date() })
        .where(eq(editorialSettings.id, EDITORIAL_SETTINGS_ROW_ID));
    }
    return config;
  }

  const seeded = sanitizeEditorialAutomationConfig(cloneEditorialAutomationConfig(defaultEditorialAutomationConfig));
  await db.insert(editorialSettings).values({
    id: EDITORIAL_SETTINGS_ROW_ID,
    workflowSettings: seeded.workflowSettings,
    coverageBoards: seeded.coverageBoards,
    templates: seeded.templates,
    rules: seeded.rules,
    briefs: seeded.briefs,
    runs: seeded.runs,
    updatedAt: new Date(),
  });
  return seeded;
}

export async function getAdminEditorialDashboard(): Promise<AdminEditorialDashboard> {
  const config = await ensureEditorialConfig();
  return buildDashboard(cloneEditorialAutomationConfig(config));
}

export async function updateAdminEditorialConfig(input: EditorialAutomationConfig): Promise<AdminEditorialDashboard> {
  const normalized = sanitizeEditorialAutomationConfig(input);
  const now = new Date();
  const [row] = await db
    .insert(editorialSettings)
    .values({
      id: EDITORIAL_SETTINGS_ROW_ID,
      workflowSettings: normalized.workflowSettings,
      coverageBoards: normalized.coverageBoards,
      templates: normalized.templates,
      rules: normalized.rules,
      briefs: normalized.briefs,
      runs: normalized.runs,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: editorialSettings.id,
      set: {
        workflowSettings: normalized.workflowSettings,
        coverageBoards: normalized.coverageBoards,
        templates: normalized.templates,
        rules: normalized.rules,
        briefs: normalized.briefs,
        runs: normalized.runs,
        updatedAt: now,
      },
    })
    .returning();

  const saved = row ? mapDbConfig(row) : normalized;
  return buildDashboard(cloneEditorialAutomationConfig(saved));
}
