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
  type EditorialBriefStatus,
  type EditorialCoverageMetric,
  type EditorialGenerationRun,
  type EditorialRunStatus,
  type EditorialWorkflowSettings,
} from '@/lib/editorial-automation';
import { getBlogCatalog } from '@/server/content/blog';
import { getKnowledgeCatalog } from '@/server/content/knowledge';
import { getPressCatalog } from '@/server/content/press';
import { getSupportCatalog } from '@/server/content/support';
import { db } from '@/server/db';
import { editorialSettings } from '@/server/db/schema';

const EDITORIAL_SETTINGS_ROW_ID = 'default';

declare global {
  var __vexmotorEditorialAutomationStore__: EditorialAutomationConfig | undefined;
}

function sanitizeText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function sanitizeStringArray(values: string[] | null | undefined) {
  return (values ?? []).map((value) => value.trim()).filter(Boolean);
}

function toContentType(value: string | null | undefined) {
  return editorialContentTypes.includes(value as (typeof editorialContentTypes)[number])
    ? (value as (typeof editorialContentTypes)[number])
    : 'blog';
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
    templates: (config.templates?.length ? config.templates : base.templates).map(sanitizeTemplate),
    rules: (config.rules?.length ? config.rules : base.rules).map(sanitizeRule),
    briefs: (config.briefs ?? base.briefs).map(sanitizeBrief),
    runs: (config.runs ?? base.runs).map(sanitizeRun),
  };
}

async function buildCoverageMetrics(): Promise<EditorialCoverageMetric[]> {
  const [blogCatalog, knowledgeCatalog, pressCatalog, supportCatalog] = await Promise.all([
    getBlogCatalog(),
    getKnowledgeCatalog(),
    getPressCatalog(),
    getSupportCatalog(),
  ]);

  return [
    {
      key: 'blog',
      title: '工程博客',
      route: '/blog',
      count: blogCatalog.posts.length,
      schemaType: 'BlogPosting',
      sourceMode: blogCatalog.sourceMode,
      note: blogCatalog.sourceMode === 'admin-managed'
        ? 'Blog 已支持后台可发布文章，前台优先读取后台记录并对同 slug 做覆盖。'
        : '前台已上线，但当前文章仍来自代码种子，未进入后台工作流。',
    },
    {
      key: 'press',
      title: '资讯 / 新闻稿',
      route: '/company/press',
      count: pressCatalog.releases.length,
      schemaType: 'Article',
      sourceMode: pressCatalog.sourceMode,
      note: pressCatalog.sourceMode === 'admin-managed'
        ? 'Press 已支持后台发布记录，前台新闻稿页会优先读取后台已发布内容。'
        : '公司资讯已上线，适合接 AI 新闻稿和产品更新自动化。',
    },
    {
      key: 'faq',
      title: '商城 FAQ',
      route: '/faq',
      count: knowledgeCatalog.storefrontFaqs.length,
      schemaType: 'FAQPage',
      sourceMode: 'code-seeded',
      note: '交易型 FAQ 已有基础覆盖，但缺后台化扩写与去重机制。',
    },
    {
      key: 'tech-faq',
      title: '技术 FAQ',
      route: '/tech-faq',
      count: knowledgeCatalog.techFaqEntries.length,
      schemaType: 'FAQPage / TechArticle',
      sourceMode: 'code-seeded',
      note: '技术 FAQ 已具备 SEO / GEO 价值，适合接入问题缺口扫描与 AI 初稿。',
    },
    {
      key: 'glossary',
      title: '术语词典',
      route: '/glossary',
      count: knowledgeCatalog.glossaryTerms.length,
      schemaType: 'DefinedTermSet',
      sourceMode: 'code-seeded',
      note: '术语解释页已上线，适合围绕长尾术语批量补词条。',
    },
    {
      key: 'support',
      title: '支持文章',
      route: '/support',
      count: supportCatalog.pages.length,
      schemaType: 'Article',
      sourceMode: 'code-seeded',
      note: '帮助中心和支持文章已具备规模，但需要和产品/物流/售后变更自动联动。',
    },
  ];
}

async function buildDashboard(config: EditorialAutomationConfig): Promise<AdminEditorialDashboard> {
  const coverage = await buildCoverageMetrics();

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

function getMemoryEditorialStore() {
  if (!globalThis.__vexmotorEditorialAutomationStore__) {
    globalThis.__vexmotorEditorialAutomationStore__ = sanitizeEditorialAutomationConfig(cloneEditorialAutomationConfig(defaultEditorialAutomationConfig));
  }

  return globalThis.__vexmotorEditorialAutomationStore__;
}

function setMemoryEditorialStore(config: EditorialAutomationConfig) {
  globalThis.__vexmotorEditorialAutomationStore__ = sanitizeEditorialAutomationConfig(cloneEditorialAutomationConfig(config));
  return globalThis.__vexmotorEditorialAutomationStore__;
}

function mapDbConfig(row: {
  workflowSettings: EditorialWorkflowSettings;
  templates: EditorialAiTemplate[];
  rules: EditorialAutomationRule[];
  briefs: EditorialBrief[];
  runs: EditorialGenerationRun[];
}) {
  return sanitizeEditorialAutomationConfig({
    workflowSettings: row.workflowSettings,
    templates: row.templates,
    rules: row.rules,
    briefs: row.briefs,
    runs: row.runs,
  });
}

export async function getAdminEditorialDashboard(): Promise<AdminEditorialDashboard> {
  if (!db) {
    return buildDashboard(cloneEditorialAutomationConfig(getMemoryEditorialStore()));
  }

  try {
    const [row] = await db.select().from(editorialSettings).where(eq(editorialSettings.id, EDITORIAL_SETTINGS_ROW_ID)).limit(1);
    if (!row) {
      return buildDashboard(cloneEditorialAutomationConfig(getMemoryEditorialStore()));
    }

    const config = mapDbConfig(row);
    setMemoryEditorialStore(config);
    return buildDashboard(cloneEditorialAutomationConfig(config));
  } catch {
    return buildDashboard(cloneEditorialAutomationConfig(getMemoryEditorialStore()));
  }
}

export async function updateAdminEditorialConfig(input: EditorialAutomationConfig): Promise<AdminEditorialDashboard> {
  const normalized = sanitizeEditorialAutomationConfig(input);

  if (!db) {
    return buildDashboard(cloneEditorialAutomationConfig(setMemoryEditorialStore(normalized)));
  }

  try {
    const now = new Date();
    const [row] = await db
      .insert(editorialSettings)
      .values({
        id: EDITORIAL_SETTINGS_ROW_ID,
        workflowSettings: normalized.workflowSettings,
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
          templates: normalized.templates,
          rules: normalized.rules,
          briefs: normalized.briefs,
          runs: normalized.runs,
          updatedAt: now,
        },
      })
      .returning();

    const saved = row ? mapDbConfig(row) : normalized;
    setMemoryEditorialStore(saved);
    return buildDashboard(cloneEditorialAutomationConfig(saved));
  } catch {
    return buildDashboard(cloneEditorialAutomationConfig(setMemoryEditorialStore(normalized)));
  }
}
