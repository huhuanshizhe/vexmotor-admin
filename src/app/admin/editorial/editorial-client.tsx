'use client';

import { DeleteOutlined, EditOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';
import { Button, Card, Col, Form, Input, InputNumber, Modal, Popconfirm, Row, Select, Space, Statistic, Switch, Table, Tag, Tabs, Typography } from 'antd';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { formatAdminDate } from '@/lib/admin-display';
import { blogAuthors, blogCategories, blogIndustries, blogProductTopics } from '@/lib/blog';
import {
  defaultEditorialBlogSectionsTemplate,
  type AdminEditorialBlogEntry,
  type AdminEditorialPressEntry,
  type EditorialEntryStatus,
} from '@/lib/editorial-content';
import {
  editorialCadenceValues,
  editorialContentTypes,
  editorialTriggerTypes,
  type AdminEditorialDashboard,
  type EditorialAiTemplate,
  type EditorialAutomationConfig,
  type EditorialAutomationRule,
  type EditorialBrief,
  type EditorialContentType,
} from '@/lib/editorial-automation';

const contentTypeLabels: Record<EditorialContentType, string> = {
  blog: '工程博客',
  press: '资讯 / 新闻稿',
  faq: '商城 FAQ',
  'tech-faq': '技术 FAQ',
  glossary: '术语词典',
  support: '支持文章',
};

const triggerTypeLabels: Record<(typeof editorialTriggerTypes)[number], string> = {
  schedule: '定时触发',
  'product-update': '产品变更',
  'faq-gap': 'FAQ 缺口',
  'seo-refresh': 'SEO 刷新',
  'support-signal': '支持信号',
  manual: '手动触发',
};

const cadenceLabels: Record<(typeof editorialCadenceValues)[number], string> = {
  daily: '每日',
  weekly: '每周',
  biweekly: '双周',
  monthly: '每月',
  quarterly: '每季度',
  manual: '手动',
};

const briefStatusLabels = {
  idea: '想法池',
  'brief-ready': 'Brief 就绪',
  generating: '生成中',
  review: '待审核',
  scheduled: '待发布',
  published: '已发布',
} as const;

const briefStatusColors = {
  idea: 'default',
  'brief-ready': 'blue',
  generating: 'cyan',
  review: 'gold',
  scheduled: 'purple',
  published: 'green',
} as const;

const runStatusLabels = {
  queued: '排队中',
  running: '生成中',
  completed: '已完成',
  failed: '失败',
  reviewed: '已审核',
} as const;

const runStatusColors = {
  queued: 'default',
  running: 'processing',
  completed: 'green',
  failed: 'red',
  reviewed: 'blue',
} as const;

const sourceModeLabels = {
  'code-seeded': '代码种子',
  'admin-managed': '后台管理',
} as const;

type WorkflowSettingsFormValues = {
  brandVoiceSummary: string;
  geoStrategy: string;
  internalLinkPolicy: string;
  factCheckingPolicy: string;
  schemaPrioritiesText: string;
  publishGuardrailsText: string;
};

type TemplateFormValues = {
  name: string;
  contentType: EditorialContentType;
  objective: string;
  modelHint: string;
  locale: string;
  targetRoute: string;
  enabled: boolean;
  systemPrompt: string;
  userPromptTemplate: string;
  outputChecklistText: string;
};

type RuleFormValues = {
  name: string;
  contentType: EditorialContentType;
  triggerType: (typeof editorialTriggerTypes)[number];
  cadence: (typeof editorialCadenceValues)[number];
  sourceSignal: string;
  targetKeywordCluster: string;
  autoCreateBrief: boolean;
  autoQueueGeneration: boolean;
  requiresHumanReview: boolean;
  enabled: boolean;
  nextRunAt: string;
};

type BriefFormValues = {
  title: string;
  contentType: EditorialContentType;
  targetKeyword: string;
  searchIntent: string;
  audience: string;
  funnelStage: string;
  locale: string;
  targetRoute: string;
  aiTemplateId: string | null;
  linkedProductSlugsText: string;
  outlineText: string;
  status: keyof typeof briefStatusLabels;
  scheduledAt: string;
  owner: string;
  notes: string;
};

type BlogEntryFormValues = {
  title: string;
  slug: string;
  summary: string;
  locale: string;
  status: EditorialEntryStatus;
  seoTitle: string;
  seoDescription: string;
  publishedAt: string;
  lead: string;
  category: (typeof blogCategories)[number];
  productTopics: (typeof blogProductTopics)[number][];
  industry: (typeof blogIndustries)[number];
  authorId: string;
  readMinutes: number;
  viewCount: number;
  coverAlt: string;
  relatedProductSlugsText: string;
  relatedPostSlugsText: string;
  sectionsJson: string;
};

type PressEntryFormValues = {
  title: string;
  slug: string;
  summary: string;
  locale: string;
  status: EditorialEntryStatus;
  seoTitle: string;
  seoDescription: string;
  publishedAt: string;
  category: string;
};

type BlogSeedImportResponse = {
  dryRun: boolean;
  totalSeededCount: number;
  candidateCount: number;
  skippedCount: number;
  importedCount: number;
  items: BlogSeedImportItem[];
};

type BlogSeedImportItem = {
  title: string;
  slug: string;
  locale: string;
  publishedAt: string;
  status: 'candidate' | 'skipped' | 'imported';
  reason: string;
  entryId: string | null;
};

type PressSeedImportResponse = BlogSeedImportResponse;

type EditorialBusyAction =
  | 'save-config'
  | 'save-blog-entry'
  | 'save-press-entry'
  | 'preview-import'
  | 'import-seeded'
  | 'delete-blog'
  | 'preview-press-import'
  | 'import-press'
  | 'delete-press';

const entryStatusLabels: Record<EditorialEntryStatus, string> = {
  draft: '草稿',
  published: '已发布',
  archived: '已归档',
};

const entryStatusColors: Record<EditorialEntryStatus, string> = {
  draft: 'default',
  published: 'green',
  archived: 'red',
};

const importItemStatusLabels: Record<BlogSeedImportItem['status'], string> = {
  candidate: '待导入',
  skipped: '已跳过',
  imported: '已导入',
};

const importItemStatusColors: Record<BlogSeedImportItem['status'], string> = {
  candidate: 'blue',
  skipped: 'default',
  imported: 'green',
};

const defaultBlogSectionsJson = JSON.stringify(defaultEditorialBlogSectionsTemplate, null, 2);

function createLocalId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function splitMultiline(value: string) {
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function toLocalDateTimeValue(value: string | null | undefined) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 16);
}

function stringifyJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function sortEditorialEntries<T extends { publishedAt: string | null; updatedAt: string; title: string }>(entries: T[]) {
  return [...entries].sort((left, right) => {
    const leftTimestamp = Date.parse(left.publishedAt ?? left.updatedAt);
    const rightTimestamp = Date.parse(right.publishedAt ?? right.updatedAt);
    return rightTimestamp - leftTimestamp || left.title.localeCompare(right.title);
  });
}

function sortBlogEntries(entries: AdminEditorialBlogEntry[]) {
  return sortEditorialEntries(entries);
}

function sortPressEntries(entries: AdminEditorialPressEntry[]) {
  return sortEditorialEntries(entries);
}

function buildSummary(dashboard: AdminEditorialDashboard) {
  return {
    liveContentTypes: dashboard.coverage.length,
    liveDocumentCount: dashboard.coverage.reduce((sum, item) => sum + item.count, 0),
    activeTemplates: dashboard.config.templates.filter((item) => item.enabled).length,
    enabledRules: dashboard.config.rules.filter((item) => item.enabled).length,
    briefsInPipeline: dashboard.config.briefs.filter((item) => item.status !== 'published').length,
    recentCompletedRuns: dashboard.config.runs.filter((item) => item.status === 'completed' || item.status === 'reviewed').length,
  };
}

export function AdminEditorialClient({
  initialDashboard,
  initialBlogEntries,
  initialPressEntries,
}: {
  initialDashboard: AdminEditorialDashboard;
  initialBlogEntries: AdminEditorialBlogEntry[];
  initialPressEntries: AdminEditorialPressEntry[];
}) {
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [blogEntries, setBlogEntries] = useState(sortBlogEntries(initialBlogEntries));
  const [pressEntries, setPressEntries] = useState(sortPressEntries(initialPressEntries));
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [briefModalOpen, setBriefModalOpen] = useState(false);
  const [blogEntryModalOpen, setBlogEntryModalOpen] = useState(false);
  const [pressEntryModalOpen, setPressEntryModalOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editingBriefId, setEditingBriefId] = useState<string | null>(null);
  const [editingBlogEntryId, setEditingBlogEntryId] = useState<string | null>(null);
  const [editingPressEntryId, setEditingPressEntryId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<EditorialBusyAction | null>(null);
  const [lastImportResult, setLastImportResult] = useState<BlogSeedImportResponse | null>(null);
  const [lastPressImportResult, setLastPressImportResult] = useState<PressSeedImportResponse | null>(null);
  const [workflowForm] = Form.useForm<WorkflowSettingsFormValues>();
  const [templateForm] = Form.useForm<TemplateFormValues>();
  const [ruleForm] = Form.useForm<RuleFormValues>();
  const [briefForm] = Form.useForm<BriefFormValues>();
  const [blogEntryForm] = Form.useForm<BlogEntryFormValues>();
  const [pressEntryForm] = Form.useForm<PressEntryFormValues>();

  const summary = useMemo(() => buildSummary(dashboard), [dashboard]);
  const templateOptions = useMemo(
    () => dashboard.config.templates.map((item) => ({ value: item.id, label: `${item.name} (${contentTypeLabels[item.contentType]})` })),
    [dashboard.config.templates],
  );
  const contentTypeOptions = useMemo(
    () => editorialContentTypes.map((value) => ({ value, label: contentTypeLabels[value] })),
    [],
  );
  const triggerTypeOptions = useMemo(
    () => editorialTriggerTypes.map((value) => ({ value, label: triggerTypeLabels[value] })),
    [],
  );
  const cadenceOptions = useMemo(
    () => editorialCadenceValues.map((value) => ({ value, label: cadenceLabels[value] })),
    [],
  );
  const blogCategoryOptions = useMemo(
    () => blogCategories.map((value) => ({ value, label: value })),
    [],
  );
  const blogProductTopicOptions = useMemo(
    () => blogProductTopics.map((value) => ({ value, label: value })),
    [],
  );
  const blogIndustryOptions = useMemo(
    () => blogIndustries.map((value) => ({ value, label: value })),
    [],
  );
  const blogAuthorOptions = useMemo(
    () => blogAuthors.map((author) => ({ value: author.id, label: `${author.name} / ${author.role}` })),
    [],
  );
  const blogAuthorMap = useMemo(
    () => new Map(blogAuthors.map((author) => [author.id, author])),
    [],
  );
  const blogEntryStatusOptions = useMemo(
    () => Object.entries(entryStatusLabels).map(([value, label]) => ({ value, label })),
    [],
  );

  async function refreshCoverageMetrics() {
    const response = await fetch('/api/admin/editorial', { cache: 'no-store' });
    if (!response.ok) {
      return;
    }

    const latest = (await response.json()) as AdminEditorialDashboard;
    setDashboard((current) => ({
      ...latest,
      config: current.config,
    }));
  }

  async function refreshBlogEntries() {
    const response = await fetch('/api/admin/editorial/content', { cache: 'no-store' });
    if (!response.ok) {
      return;
    }

    const payload = (await response.json()) as { items?: AdminEditorialBlogEntry[] };
    if (!payload.items) {
      return;
    }

    setBlogEntries(sortBlogEntries(payload.items));
  }

  async function refreshPressEntries() {
    const response = await fetch('/api/admin/editorial/content?contentType=press', { cache: 'no-store' });
    if (!response.ok) {
      return;
    }

    const payload = (await response.json()) as { items?: AdminEditorialPressEntry[] };
    if (!payload.items) {
      return;
    }

    setPressEntries(sortPressEntries(payload.items));
  }

  async function runBusyTask(action: EditorialBusyAction, task: () => Promise<void>) {
    setBusyAction(action);

    try {
      await task();
    } finally {
      setBusyAction(null);
    }
  }

  function syncWorkflowForm(config: EditorialAutomationConfig) {
    workflowForm.setFieldsValue({
      brandVoiceSummary: config.workflowSettings.brandVoiceSummary,
      geoStrategy: config.workflowSettings.geoStrategy,
      internalLinkPolicy: config.workflowSettings.internalLinkPolicy,
      factCheckingPolicy: config.workflowSettings.factCheckingPolicy,
      schemaPrioritiesText: config.workflowSettings.schemaPriorities.join('\n'),
      publishGuardrailsText: config.workflowSettings.publishGuardrails.join('\n'),
    });
  }

  function updateConfig(updater: (current: EditorialAutomationConfig) => EditorialAutomationConfig) {
    setDashboard((current) => ({
      ...current,
      summary: current.summary,
      config: updater(current.config),
    }));
    setStatusMessage('配置已修改，待保存');
  }

  function openTemplateModal(template?: EditorialAiTemplate) {
    setEditingTemplateId(template?.id ?? null);
    templateForm.setFieldsValue({
      name: template?.name ?? '',
      contentType: template?.contentType ?? 'blog',
      objective: template?.objective ?? '',
      modelHint: template?.modelHint ?? 'GPT-5.4',
      locale: template?.locale ?? 'en-US',
      targetRoute: template?.targetRoute ?? '/blog',
      enabled: template?.enabled ?? true,
      systemPrompt: template?.systemPrompt ?? '',
      userPromptTemplate: template?.userPromptTemplate ?? '',
      outputChecklistText: template?.outputChecklist.join('\n') ?? '',
    });
    setTemplateModalOpen(true);
  }

  function openRuleModal(rule?: EditorialAutomationRule) {
    setEditingRuleId(rule?.id ?? null);
    ruleForm.setFieldsValue({
      name: rule?.name ?? '',
      contentType: rule?.contentType ?? 'blog',
      triggerType: rule?.triggerType ?? 'schedule',
      cadence: rule?.cadence ?? 'weekly',
      sourceSignal: rule?.sourceSignal ?? '',
      targetKeywordCluster: rule?.targetKeywordCluster ?? '',
      autoCreateBrief: rule?.autoCreateBrief ?? true,
      autoQueueGeneration: rule?.autoQueueGeneration ?? false,
      requiresHumanReview: rule?.requiresHumanReview ?? true,
      enabled: rule?.enabled ?? true,
      nextRunAt: toLocalDateTimeValue(rule?.nextRunAt),
    });
    setRuleModalOpen(true);
  }

  function openBriefModal(brief?: EditorialBrief) {
    setEditingBriefId(brief?.id ?? null);
    briefForm.setFieldsValue({
      title: brief?.title ?? '',
      contentType: brief?.contentType ?? 'blog',
      targetKeyword: brief?.targetKeyword ?? '',
      searchIntent: brief?.searchIntent ?? '',
      audience: brief?.audience ?? '',
      funnelStage: brief?.funnelStage ?? 'TOFU',
      locale: brief?.locale ?? 'en-US',
      targetRoute: brief?.targetRoute ?? '/blog',
      aiTemplateId: brief?.aiTemplateId ?? null,
      linkedProductSlugsText: brief?.linkedProductSlugs.join('\n') ?? '',
      outlineText: brief?.outline.join('\n') ?? '',
      status: brief?.status ?? 'idea',
      scheduledAt: toLocalDateTimeValue(brief?.scheduledAt),
      owner: brief?.owner ?? '内容运营',
      notes: brief?.notes ?? '',
    });
    setBriefModalOpen(true);
  }

  function openBlogEntryModal(entry?: AdminEditorialBlogEntry) {
    setEditingBlogEntryId(entry?.id ?? null);
    blogEntryForm.setFieldsValue({
      title: entry?.title ?? '',
      slug: entry?.slug ?? '',
      summary: entry?.summary ?? '',
      locale: entry?.locale ?? 'en-US',
      status: entry?.status ?? 'draft',
      seoTitle: entry?.seoTitle ?? '',
      seoDescription: entry?.seoDescription ?? '',
      publishedAt: toLocalDateTimeValue(entry?.publishedAt),
      lead: entry?.payload.lead ?? '',
      category: entry?.payload.category ?? blogCategories[0],
      productTopics: entry?.payload.productTopics?.length ? entry.payload.productTopics : [blogProductTopics[0]],
      industry: entry?.payload.industry ?? blogIndustries[0],
      authorId: entry?.payload.authorId ?? blogAuthors[0]?.id ?? '',
      readMinutes: entry?.payload.readMinutes ?? 6,
      viewCount: entry?.payload.viewCount ?? 0,
      coverAlt: entry?.payload.coverAlt ?? '',
      relatedProductSlugsText: entry?.payload.relatedProductSlugs.join('\n') ?? '',
      relatedPostSlugsText: entry?.payload.relatedPostSlugs.join('\n') ?? '',
      sectionsJson: entry ? stringifyJson(entry.payload.sections) : defaultBlogSectionsJson,
    });
    setBlogEntryModalOpen(true);
  }

  function openPressEntryModal(entry?: AdminEditorialPressEntry) {
    setEditingPressEntryId(entry?.id ?? null);
    pressEntryForm.setFieldsValue({
      title: entry?.title ?? '',
      slug: entry?.slug ?? '',
      summary: entry?.summary ?? '',
      locale: entry?.locale ?? 'en-US',
      status: entry?.status ?? 'draft',
      seoTitle: entry?.seoTitle ?? '',
      seoDescription: entry?.seoDescription ?? '',
      publishedAt: toLocalDateTimeValue(entry?.publishedAt),
      category: entry?.payload.category ?? '',
    });
    setPressEntryModalOpen(true);
  }

  function saveTemplate() {
    void templateForm.validateFields().then((values) => {
      const nextTemplate: EditorialAiTemplate = {
        id: editingTemplateId ?? createLocalId('tpl'),
        name: values.name.trim(),
        contentType: values.contentType,
        objective: values.objective.trim(),
        modelHint: values.modelHint.trim(),
        locale: values.locale.trim(),
        targetRoute: values.targetRoute.trim(),
        enabled: values.enabled,
        systemPrompt: values.systemPrompt.trim(),
        userPromptTemplate: values.userPromptTemplate.trim(),
        outputChecklist: splitMultiline(values.outputChecklistText),
      };

      updateConfig((current) => ({
        ...current,
        templates: editingTemplateId
          ? current.templates.map((item) => (item.id === editingTemplateId ? nextTemplate : item))
          : [...current.templates, nextTemplate],
      }));

      setTemplateModalOpen(false);
      setEditingTemplateId(null);
      templateForm.resetFields();
    });
  }

  function saveRule() {
    void ruleForm.validateFields().then((values) => {
      const nextRule: EditorialAutomationRule = {
        id: editingRuleId ?? createLocalId('rule'),
        name: values.name.trim(),
        contentType: values.contentType,
        triggerType: values.triggerType,
        cadence: values.cadence,
        sourceSignal: values.sourceSignal.trim(),
        targetKeywordCluster: values.targetKeywordCluster.trim(),
        autoCreateBrief: values.autoCreateBrief,
        autoQueueGeneration: values.autoQueueGeneration,
        requiresHumanReview: values.requiresHumanReview,
        enabled: values.enabled,
        nextRunAt: values.nextRunAt ? new Date(values.nextRunAt).toISOString() : null,
      };

      updateConfig((current) => ({
        ...current,
        rules: editingRuleId
          ? current.rules.map((item) => (item.id === editingRuleId ? nextRule : item))
          : [...current.rules, nextRule],
      }));

      setRuleModalOpen(false);
      setEditingRuleId(null);
      ruleForm.resetFields();
    });
  }

  function saveBrief() {
    void briefForm.validateFields().then((values) => {
      const nextBrief: EditorialBrief = {
        id: editingBriefId ?? createLocalId('brief'),
        title: values.title.trim(),
        contentType: values.contentType,
        targetKeyword: values.targetKeyword.trim(),
        searchIntent: values.searchIntent.trim(),
        audience: values.audience.trim(),
        funnelStage: values.funnelStage.trim(),
        locale: values.locale.trim(),
        targetRoute: values.targetRoute.trim(),
        aiTemplateId: values.aiTemplateId,
        linkedProductSlugs: splitMultiline(values.linkedProductSlugsText),
        outline: splitMultiline(values.outlineText),
        status: values.status,
        scheduledAt: values.scheduledAt ? new Date(values.scheduledAt).toISOString() : null,
        owner: values.owner.trim(),
        notes: values.notes.trim() || null,
        updatedAt: new Date().toISOString(),
      };

      updateConfig((current) => ({
        ...current,
        briefs: editingBriefId
          ? current.briefs.map((item) => (item.id === editingBriefId ? nextBrief : item))
          : [...current.briefs, nextBrief],
      }));

      setBriefModalOpen(false);
      setEditingBriefId(null);
      briefForm.resetFields();
    });
  }

  function saveBlogEntry() {
    void blogEntryForm.validateFields().then((values) => {
      let sections: unknown;

      try {
        sections = JSON.parse(values.sectionsJson);
      } catch {
        blogEntryForm.setFields([{ name: 'sectionsJson', errors: ['正文 JSON 无法解析，请检查逗号、引号和数组结构。'] }]);
        return;
      }

      void runBusyTask('save-blog-entry', async () => {
        setStatusMessage(null);

        const response = await fetch(editingBlogEntryId ? `/api/admin/editorial/content/${editingBlogEntryId}` : '/api/admin/editorial/content', {
          method: editingBlogEntryId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: values.title.trim(),
            slug: values.slug.trim(),
            summary: values.summary.trim() || null,
            locale: values.locale.trim(),
            status: values.status,
            seoTitle: values.seoTitle.trim() || null,
            seoDescription: values.seoDescription.trim() || null,
            publishedAt: values.publishedAt ? new Date(values.publishedAt).toISOString() : null,
            payload: {
              lead: values.lead.trim(),
              category: values.category,
              productTopics: values.productTopics,
              industry: values.industry,
              authorId: values.authorId,
              readMinutes: Number(values.readMinutes),
              viewCount: Number(values.viewCount),
              coverAlt: values.coverAlt.trim(),
              relatedProductSlugs: splitMultiline(values.relatedProductSlugsText),
              relatedPostSlugs: splitMultiline(values.relatedPostSlugsText),
              sections,
            },
          }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { message?: string } | null;
          setStatusMessage(payload?.message ?? 'Blog 内容保存失败，请检查 slug 与 JSON 结构。');
          return;
        }

        const saved = (await response.json()) as AdminEditorialBlogEntry;
        setBlogEntries((current) => sortBlogEntries(
          editingBlogEntryId
            ? current.map((item) => (item.id === editingBlogEntryId ? saved : item))
            : [saved, ...current],
        ));
        setStatusMessage(editingBlogEntryId ? 'Blog 内容已更新' : 'Blog 内容已创建');
        setBlogEntryModalOpen(false);
        setEditingBlogEntryId(null);
        blogEntryForm.resetFields();
        await refreshCoverageMetrics();
      });
    });
  }

  function savePressEntry() {
    void pressEntryForm.validateFields().then((values) => {
      void runBusyTask('save-press-entry', async () => {
        setStatusMessage(null);

        const response = await fetch(editingPressEntryId ? `/api/admin/editorial/content/${editingPressEntryId}?contentType=press` : '/api/admin/editorial/content', {
          method: editingPressEntryId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contentType: 'press',
            title: values.title.trim(),
            slug: values.slug.trim(),
            summary: values.summary.trim() || null,
            locale: values.locale.trim(),
            status: values.status,
            seoTitle: values.seoTitle.trim() || null,
            seoDescription: values.seoDescription.trim() || null,
            publishedAt: values.publishedAt ? new Date(values.publishedAt).toISOString() : null,
            payload: {
              category: values.category.trim(),
            },
          }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { message?: string } | null;
          setStatusMessage(payload?.message ?? 'Press 内容保存失败，请检查 slug 后重试。');
          return;
        }

        const saved = (await response.json()) as AdminEditorialPressEntry;
        setPressEntries((current) => sortPressEntries(
          editingPressEntryId
            ? current.map((item) => (item.id === editingPressEntryId ? saved : item))
            : [saved, ...current],
        ));
        setStatusMessage(editingPressEntryId ? 'Press 内容已更新' : 'Press 内容已创建');
        setPressEntryModalOpen(false);
        setEditingPressEntryId(null);
        pressEntryForm.resetFields();
        await refreshCoverageMetrics();
      });
    });
  }

  function persistConfig() {
    void runBusyTask('save-config', async () => {
      setStatusMessage(null);
      const response = await fetch('/api/admin/editorial', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dashboard.config),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setStatusMessage(payload?.message ?? '保存失败，请检查配置后重试。');
        return;
      }

      const saved = (await response.json()) as AdminEditorialDashboard;
      setDashboard(saved);
      syncWorkflowForm(saved.config);
      setStatusMessage('配置已保存');
    });
  }

  function deleteBlogEntry(id: string) {
    void runBusyTask('delete-blog', async () => {
      setStatusMessage(null);
      const response = await fetch(`/api/admin/editorial/content/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setStatusMessage(payload?.message ?? 'Blog 内容删除失败。');
        return;
      }

      setBlogEntries((current) => current.filter((item) => item.id !== id));
      setStatusMessage('Blog 内容已删除');
      await refreshBlogEntries();
      await refreshCoverageMetrics();
    });
  }

  function deletePressEntry(id: string) {
    void runBusyTask('delete-press', async () => {
      setStatusMessage(null);
      const response = await fetch(`/api/admin/editorial/content/${id}?contentType=press`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setStatusMessage(payload?.message ?? 'Press 内容删除失败。');
        return;
      }

      setPressEntries((current) => current.filter((item) => item.id !== id));
      setStatusMessage('Press 内容已删除');
      await refreshPressEntries();
      await refreshCoverageMetrics();
    });
  }

  function importSeededBlogEntries() {
    void runBusyTask('import-seeded', async () => {
      setStatusMessage(null);
      const response = await fetch('/api/admin/editorial/content/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: false }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setStatusMessage(payload?.message ?? '种子文章导入失败。');
        return;
      }

      const result = (await response.json()) as BlogSeedImportResponse;
      setLastImportResult(result);

      if (result.importedCount > 0) {
        await refreshBlogEntries();
      }

      if (result.importedCount > 0) {
        setStatusMessage(`已导入 ${result.importedCount} 篇种子文章，跳过 ${result.skippedCount} 篇已有后台记录。`);
      } else {
        setStatusMessage('现有 Blog 种子已全部进入后台内容资产，无需重复导入。');
      }

      await refreshCoverageMetrics();
    });
  }

  function previewSeededBlogImport() {
    void runBusyTask('preview-import', async () => {
      setStatusMessage(null);
      const response = await fetch('/api/admin/editorial/content/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: true }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setStatusMessage(payload?.message ?? '导入预估失败。');
        return;
      }

      const result = (await response.json()) as BlogSeedImportResponse;
      setLastImportResult(result);
      if (result.candidateCount > 0) {
        setStatusMessage(`当前可导入 ${result.candidateCount} 篇种子文章，已有 ${result.skippedCount} 篇已在后台资产中。`);
      } else {
        setStatusMessage('现有 Blog 种子已全部进入后台内容资产，无新增导入候选。');
      }
    });
  }

  function importSeededPressEntries() {
    void runBusyTask('import-press', async () => {
      setStatusMessage(null);
      const response = await fetch('/api/admin/editorial/content/import?contentType=press', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: false, contentType: 'press' }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setStatusMessage(payload?.message ?? 'Press 种子导入失败。');
        return;
      }

      const result = (await response.json()) as PressSeedImportResponse;
      setLastPressImportResult(result);

      if (result.importedCount > 0) {
        await refreshPressEntries();
      }

      if (result.importedCount > 0) {
        setStatusMessage(`已导入 ${result.importedCount} 条 Press 种子，跳过 ${result.skippedCount} 条已有后台记录。`);
      } else {
        setStatusMessage('现有 Press 种子已全部进入后台内容资产，无需重复导入。');
      }

      await refreshCoverageMetrics();
    });
  }

  function previewSeededPressImport() {
    void runBusyTask('preview-press-import', async () => {
      setStatusMessage(null);
      const response = await fetch('/api/admin/editorial/content/import?contentType=press', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: true, contentType: 'press' }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setStatusMessage(payload?.message ?? 'Press 导入预估失败。');
        return;
      }

      const result = (await response.json()) as PressSeedImportResponse;
      setLastPressImportResult(result);
      if (result.candidateCount > 0) {
        setStatusMessage(`当前可导入 ${result.candidateCount} 条 Press 种子，已有 ${result.skippedCount} 条已在后台资产中。`);
      } else {
        setStatusMessage('现有 Press 种子已全部进入后台内容资产，无新增导入候选。');
      }
    });
  }

  function handleWorkflowValuesChange(changedValues: Partial<WorkflowSettingsFormValues>, allValues: WorkflowSettingsFormValues) {
    const nextValues = { ...allValues, ...changedValues };

    updateConfig((current) => ({
      ...current,
      workflowSettings: {
        brandVoiceSummary: nextValues.brandVoiceSummary,
        geoStrategy: nextValues.geoStrategy,
        internalLinkPolicy: nextValues.internalLinkPolicy,
        factCheckingPolicy: nextValues.factCheckingPolicy,
        schemaPriorities: splitMultiline(nextValues.schemaPrioritiesText),
        publishGuardrails: splitMultiline(nextValues.publishGuardrailsText),
      },
    }));
  }

  function deleteTemplate(id: string) {
    updateConfig((current) => ({
      ...current,
      templates: current.templates.filter((item) => item.id !== id),
      briefs: current.briefs.map((item) => ({
        ...item,
        aiTemplateId: item.aiTemplateId === id ? null : item.aiTemplateId,
      })),
    }));
  }

  function deleteRule(id: string) {
    updateConfig((current) => ({
      ...current,
      rules: current.rules.filter((item) => item.id !== id),
    }));
  }

  function deleteBrief(id: string) {
    updateConfig((current) => ({
      ...current,
      briefs: current.briefs.filter((item) => item.id !== id),
      runs: current.runs.map((item) => ({
        ...item,
        briefId: item.briefId === id ? null : item.briefId,
      })),
    }));
  }

  useEffect(() => {
    syncWorkflowForm(dashboard.config);
  }, [dashboard.config, workflowForm]);

  return (
    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
      <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
        <div>
          <Typography.Title level={2}>内容策略与 AI 自动化</Typography.Title>
          <Typography.Paragraph type="secondary">
            统一审视 Blog、资讯、FAQ、术语和支持文章的前台覆盖度，并在后台维护 AI 模板、自动化规则、内容 Brief 与生成记录。
          </Typography.Paragraph>
        </div>
        <Space>
          {statusMessage ? <Typography.Text type={statusMessage.includes('失败') ? 'danger' : 'secondary'}>{statusMessage}</Typography.Text> : null}
          <Button type="primary" icon={<SaveOutlined />} onClick={persistConfig} loading={busyAction === 'save-config'}>
            保存配置
          </Button>
        </Space>
      </Space>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} xl={4}>
          <Card>
            <Statistic title="前台内容板块" value={summary.liveContentTypes} />
          </Card>
        </Col>
        <Col xs={24} md={12} xl={4}>
          <Card>
            <Statistic title="已上线内容总量" value={summary.liveDocumentCount} />
          </Card>
        </Col>
        <Col xs={24} md={12} xl={4}>
          <Card>
            <Statistic title="启用 AI 模板" value={summary.activeTemplates} />
          </Card>
        </Col>
        <Col xs={24} md={12} xl={4}>
          <Card>
            <Statistic title="启用自动化规则" value={summary.enabledRules} />
          </Card>
        </Col>
        <Col xs={24} md={12} xl={4}>
          <Card>
            <Statistic title="管道中的 Brief" value={summary.briefsInPipeline} />
          </Card>
        </Col>
        <Col xs={24} md={12} xl={4}>
          <Card>
            <Statistic title="近期待审产出" value={summary.recentCompletedRuns} />
          </Card>
        </Col>
      </Row>

      <Tabs
        items={[
          {
            key: 'coverage',
            label: '覆盖看板',
            children: (
              <Space orientation="vertical" size="large" style={{ width: '100%' }}>
                <Card title="前台内容覆盖度">
                  <Table
                    rowKey="key"
                    pagination={false}
                    scroll={{ x: 960 }}
                    dataSource={dashboard.coverage}
                    columns={[
                      { title: '板块', dataIndex: 'title' },
                      {
                        title: '前台路由',
                        dataIndex: 'route',
                        render: (value: string) => (
                          <Link href={value} target="_blank">
                            {value}
                          </Link>
                        ),
                      },
                      { title: '当前数量', dataIndex: 'count' },
                      { title: 'Schema', dataIndex: 'schemaType' },
                      {
                        title: '来源模式',
                        dataIndex: 'sourceMode',
                        render: (value: keyof typeof sourceModeLabels) => <Tag>{sourceModeLabels[value]}</Tag>,
                      },
                      { title: '说明', dataIndex: 'note' },
                    ]}
                  />
                </Card>

                <Card title="AI 工作流总则">
                  <Form<WorkflowSettingsFormValues>
                    form={workflowForm}
                    layout="vertical"
                    onValuesChange={handleWorkflowValuesChange}
                  >
                    <Row gutter={[16, 0]}>
                      <Col xs={24} xl={12}>
                        <Form.Item label="品牌表达原则" name="brandVoiceSummary">
                          <Input.TextArea rows={4} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} xl={12}>
                        <Form.Item label="GEO / SEO 策略" name="geoStrategy">
                          <Input.TextArea rows={4} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} xl={12}>
                        <Form.Item label="内链策略" name="internalLinkPolicy">
                          <Input.TextArea rows={4} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} xl={12}>
                        <Form.Item label="事实校验策略" name="factCheckingPolicy">
                          <Input.TextArea rows={4} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} xl={12}>
                        <Form.Item label="优先结构化数据类型" name="schemaPrioritiesText" extra="每行一个类型，如 BlogPosting / FAQPage / DefinedTermSet">
                          <Input.TextArea rows={5} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} xl={12}>
                        <Form.Item label="发布护栏" name="publishGuardrailsText" extra="每行一条发布前检查项">
                          <Input.TextArea rows={5} />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Form>
                </Card>
              </Space>
            ),
          },
          {
            key: 'content-assets',
            label: `内容资产 (${blogEntries.length + pressEntries.length})`,
            children: (
              <Space orientation="vertical" size="large" style={{ width: '100%' }}>
                <Card>
                  <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                    当前已把 Blog 和 Press 接入后台可发布内容记录。已发布 Blog 会进入 /blog、文章详情、RSS、sitemap；已发布 Press 会进入 /company/press，并对同 slug 的代码种子版本优先覆盖。
                  </Typography.Paragraph>
                </Card>

                <Card
                  title="Blog 内容记录"
                  extra={
                    <Space>
                      <Button onClick={previewSeededBlogImport} loading={busyAction === 'preview-import'}>
                        预估导入
                      </Button>
                      <Button onClick={importSeededBlogEntries} loading={busyAction === 'import-seeded'}>
                        导入现有 Blog 种子
                      </Button>
                      <Button type="primary" icon={<PlusOutlined />} onClick={() => openBlogEntryModal()}>
                        新建文章
                      </Button>
                    </Space>
                  }
                >
                  <Typography.Paragraph type="secondary">
                    当前可先一键导入前台已有 Blog 种子，再继续在后台改写、补充 AI 生成稿或替换同 slug 文章。
                  </Typography.Paragraph>

                  {lastImportResult ? (
                    <Card
                      size="small"
                      title={lastImportResult.dryRun ? '最近一次导入预估' : '最近一次导入结果'}
                      style={{ marginBottom: 16 }}
                    >
                      <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                        <Typography.Text type="secondary">
                          种子总数 {lastImportResult.totalSeededCount} / 可导入 {lastImportResult.candidateCount} / 跳过 {lastImportResult.skippedCount} / 已导入 {lastImportResult.importedCount}
                        </Typography.Text>
                        <Table
                          rowKey={(row) => `${row.slug}-${row.status}`}
                          pagination={{ pageSize: 8, hideOnSinglePage: true }}
                          scroll={{ x: 960 }}
                          dataSource={lastImportResult.items}
                          columns={[
                            { title: '标题', dataIndex: 'title' },
                            { title: 'Slug', dataIndex: 'slug' },
                            {
                              title: '状态',
                              dataIndex: 'status',
                              render: (value: BlogSeedImportItem['status']) => <Tag color={importItemStatusColors[value]}>{importItemStatusLabels[value]}</Tag>,
                            },
                            {
                              title: '发布时间',
                              dataIndex: 'publishedAt',
                              render: (value: string) => formatAdminDate(value),
                            },
                            { title: '说明', dataIndex: 'reason' },
                          ]}
                        />
                      </Space>
                    </Card>
                  ) : null}

                  <Table
                    rowKey="id"
                    pagination={false}
                    scroll={{ x: 1240 }}
                    dataSource={blogEntries}
                    columns={[
                      { title: '标题', dataIndex: 'title' },
                      { title: 'Slug', dataIndex: 'slug' },
                      {
                        title: '主题 / 行业',
                        key: 'topicIndustry',
                        render: (_, row: AdminEditorialBlogEntry) => `${row.payload.category} / ${row.payload.industry}`,
                      },
                      {
                        title: '作者',
                        key: 'author',
                        render: (_, row: AdminEditorialBlogEntry) => blogAuthorMap.get(row.payload.authorId)?.name ?? row.payload.authorId,
                      },
                      {
                        title: '状态',
                        dataIndex: 'status',
                        render: (value: EditorialEntryStatus) => <Tag color={entryStatusColors[value]}>{entryStatusLabels[value]}</Tag>,
                      },
                      {
                        title: '发布时间',
                        dataIndex: 'publishedAt',
                        render: (value: string | null) => formatAdminDate(value),
                      },
                      {
                        title: '最近更新',
                        dataIndex: 'updatedAt',
                        render: (value: string) => formatAdminDate(value),
                      },
                      {
                        title: '前台',
                        key: 'route',
                        render: (_, row: AdminEditorialBlogEntry) => row.status === 'published'
                          ? (
                            <Link href={`/blog/${row.slug}`} target="_blank">
                              查看文章
                            </Link>
                          )
                          : '未发布',
                      },
                      {
                        title: '操作',
                        key: 'actions',
                        render: (_, row: AdminEditorialBlogEntry) => (
                          <Space>
                            <Button icon={<EditOutlined />} onClick={() => openBlogEntryModal(row)} />
                            <Popconfirm title="确定删除该文章记录吗？" onConfirm={() => deleteBlogEntry(row.id)}>
                              <Button danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                          </Space>
                        ),
                      },
                    ]}
                  />
                </Card>

                <Card
                  title="Press 内容记录"
                  extra={
                    <Space>
                      <Button onClick={previewSeededPressImport} loading={busyAction === 'preview-press-import'}>
                        预估导入
                      </Button>
                      <Button onClick={importSeededPressEntries} loading={busyAction === 'import-press'}>
                        导入现有 Press 种子
                      </Button>
                      <Button type="primary" icon={<PlusOutlined />} onClick={() => openPressEntryModal()}>
                        新建新闻稿
                      </Button>
                    </Space>
                  }
                >
                  <Typography.Paragraph type="secondary">
                    Press 资产用于后台管理新闻稿与公司更新。当前可先导入现有前台种子，再在后台维护标题、摘要、发布日期和分类。
                  </Typography.Paragraph>

                  {lastPressImportResult ? (
                    <Card
                      size="small"
                      title={lastPressImportResult.dryRun ? '最近一次 Press 导入预估' : '最近一次 Press 导入结果'}
                      style={{ marginBottom: 16 }}
                    >
                      <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                        <Typography.Text type="secondary">
                          种子总数 {lastPressImportResult.totalSeededCount} / 可导入 {lastPressImportResult.candidateCount} / 跳过 {lastPressImportResult.skippedCount} / 已导入 {lastPressImportResult.importedCount}
                        </Typography.Text>
                        <Table
                          rowKey={(row) => `${row.slug}-${row.status}`}
                          pagination={{ pageSize: 8, hideOnSinglePage: true }}
                          scroll={{ x: 960 }}
                          dataSource={lastPressImportResult.items}
                          columns={[
                            { title: '标题', dataIndex: 'title' },
                            { title: 'Slug', dataIndex: 'slug' },
                            {
                              title: '状态',
                              dataIndex: 'status',
                              render: (value: BlogSeedImportItem['status']) => <Tag color={importItemStatusColors[value]}>{importItemStatusLabels[value]}</Tag>,
                            },
                            {
                              title: '发布时间',
                              dataIndex: 'publishedAt',
                              render: (value: string) => formatAdminDate(value),
                            },
                            { title: '说明', dataIndex: 'reason' },
                          ]}
                        />
                      </Space>
                    </Card>
                  ) : null}

                  <Table
                    rowKey="id"
                    pagination={false}
                    scroll={{ x: 1120 }}
                    dataSource={pressEntries}
                    columns={[
                      { title: '标题', dataIndex: 'title' },
                      { title: 'Slug', dataIndex: 'slug' },
                      {
                        title: '分类',
                        key: 'category',
                        render: (_, row: AdminEditorialPressEntry) => row.payload.category,
                      },
                      {
                        title: '状态',
                        dataIndex: 'status',
                        render: (value: EditorialEntryStatus) => <Tag color={entryStatusColors[value]}>{entryStatusLabels[value]}</Tag>,
                      },
                      {
                        title: '发布时间',
                        dataIndex: 'publishedAt',
                        render: (value: string | null) => formatAdminDate(value),
                      },
                      {
                        title: '最近更新',
                        dataIndex: 'updatedAt',
                        render: (value: string) => formatAdminDate(value),
                      },
                      {
                        title: '前台',
                        key: 'route',
                        render: (_, row: AdminEditorialPressEntry) => row.status === 'published'
                          ? (
                            <Link href="/company/press" target="_blank">
                              查看新闻稿页
                            </Link>
                          )
                          : '未发布',
                      },
                      {
                        title: '操作',
                        key: 'actions',
                        render: (_, row: AdminEditorialPressEntry) => (
                          <Space>
                            <Button icon={<EditOutlined />} onClick={() => openPressEntryModal(row)} />
                            <Popconfirm title="确定删除该新闻稿记录吗？" onConfirm={() => deletePressEntry(row.id)}>
                              <Button danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                          </Space>
                        ),
                      },
                    ]}
                  />
                </Card>
              </Space>
            ),
          },
          {
            key: 'templates',
            label: `AI 模板 (${dashboard.config.templates.length})`,
            children: (
              <Card
                extra={
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => openTemplateModal()}>
                    新建模板
                  </Button>
                }
              >
                <Table
                  rowKey="id"
                  pagination={false}
                  scroll={{ x: 1200 }}
                  dataSource={dashboard.config.templates}
                  columns={[
                    { title: '模板名称', dataIndex: 'name' },
                    {
                      title: '内容类型',
                      dataIndex: 'contentType',
                      render: (value: EditorialContentType) => contentTypeLabels[value],
                    },
                    { title: '目标', dataIndex: 'objective' },
                    { title: '模型', dataIndex: 'modelHint' },
                    { title: '目标路由', dataIndex: 'targetRoute' },
                    {
                      title: '状态',
                      dataIndex: 'enabled',
                      render: (value: boolean) => <Tag color={value ? 'green' : 'default'}>{value ? '启用' : '停用'}</Tag>,
                    },
                    {
                      title: '操作',
                      key: 'actions',
                      render: (_, row: EditorialAiTemplate) => (
                        <Space>
                          <Button icon={<EditOutlined />} onClick={() => openTemplateModal(row)} />
                          <Popconfirm title="确定删除该模板吗？" onConfirm={() => deleteTemplate(row.id)}>
                            <Button danger icon={<DeleteOutlined />} />
                          </Popconfirm>
                        </Space>
                      ),
                    },
                  ]}
                />
              </Card>
            ),
          },
          {
            key: 'rules',
            label: `自动化规则 (${dashboard.config.rules.length})`,
            children: (
              <Card
                extra={
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => openRuleModal()}>
                    新建规则
                  </Button>
                }
              >
                <Table
                  rowKey="id"
                  pagination={false}
                  scroll={{ x: 1180 }}
                  dataSource={dashboard.config.rules}
                  columns={[
                    { title: '规则名称', dataIndex: 'name' },
                    {
                      title: '内容类型',
                      dataIndex: 'contentType',
                      render: (value: EditorialContentType) => contentTypeLabels[value],
                    },
                    {
                      title: '触发方式',
                      dataIndex: 'triggerType',
                      render: (value: keyof typeof triggerTypeLabels) => triggerTypeLabels[value],
                    },
                    {
                      title: '频率',
                      dataIndex: 'cadence',
                      render: (value: keyof typeof cadenceLabels) => cadenceLabels[value],
                    },
                    { title: '来源信号', dataIndex: 'sourceSignal' },
                    {
                      title: '下次运行',
                      dataIndex: 'nextRunAt',
                      render: (value: string | null) => formatAdminDate(value),
                    },
                    {
                      title: '状态',
                      dataIndex: 'enabled',
                      render: (value: boolean) => <Tag color={value ? 'green' : 'default'}>{value ? '启用' : '停用'}</Tag>,
                    },
                    {
                      title: '操作',
                      key: 'actions',
                      render: (_, row: EditorialAutomationRule) => (
                        <Space>
                          <Button icon={<EditOutlined />} onClick={() => openRuleModal(row)} />
                          <Popconfirm title="确定删除该规则吗？" onConfirm={() => deleteRule(row.id)}>
                            <Button danger icon={<DeleteOutlined />} />
                          </Popconfirm>
                        </Space>
                      ),
                    },
                  ]}
                />
              </Card>
            ),
          },
          {
            key: 'briefs',
            label: `内容 Brief (${dashboard.config.briefs.length})`,
            children: (
              <Card
                extra={
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => openBriefModal()}>
                    新建 Brief
                  </Button>
                }
              >
                <Table
                  rowKey="id"
                  pagination={false}
                  scroll={{ x: 1300 }}
                  dataSource={dashboard.config.briefs}
                  columns={[
                    { title: '标题', dataIndex: 'title' },
                    {
                      title: '内容类型',
                      dataIndex: 'contentType',
                      render: (value: EditorialContentType) => contentTypeLabels[value],
                    },
                    { title: '目标关键词', dataIndex: 'targetKeyword' },
                    { title: '受众', dataIndex: 'audience' },
                    {
                      title: '状态',
                      dataIndex: 'status',
                      render: (value: keyof typeof briefStatusLabels) => <Tag color={briefStatusColors[value]}>{briefStatusLabels[value]}</Tag>,
                    },
                    {
                      title: '计划发布时间',
                      dataIndex: 'scheduledAt',
                      render: (value: string | null) => formatAdminDate(value),
                    },
                    { title: '负责人', dataIndex: 'owner' },
                    {
                      title: '操作',
                      key: 'actions',
                      render: (_, row: EditorialBrief) => (
                        <Space>
                          <Button icon={<EditOutlined />} onClick={() => openBriefModal(row)} />
                          <Popconfirm title="确定删除该 Brief 吗？" onConfirm={() => deleteBrief(row.id)}>
                            <Button danger icon={<DeleteOutlined />} />
                          </Popconfirm>
                        </Space>
                      ),
                    },
                  ]}
                />
              </Card>
            ),
          },
          {
            key: 'runs',
            label: `生成记录 (${dashboard.config.runs.length})`,
            children: (
              <Card>
                <Table
                  rowKey="id"
                  pagination={false}
                  scroll={{ x: 1200 }}
                  dataSource={dashboard.config.runs}
                  columns={[
                    { title: '输出标题', dataIndex: 'outputTitle' },
                    {
                      title: '内容类型',
                      dataIndex: 'contentType',
                      render: (value: EditorialContentType) => contentTypeLabels[value],
                    },
                    { title: '模型', dataIndex: 'modelName' },
                    {
                      title: '状态',
                      dataIndex: 'status',
                      render: (value: keyof typeof runStatusLabels) => <Tag color={runStatusColors[value]}>{runStatusLabels[value]}</Tag>,
                    },
                    {
                      title: '质量分',
                      dataIndex: 'qualityScore',
                      render: (value: number | null) => (value == null ? '未评分' : value),
                    },
                    {
                      title: '输出 Slug',
                      dataIndex: 'outputSlug',
                      render: (value: string | null) => value ?? '未落地',
                    },
                    {
                      title: '更新时间',
                      dataIndex: 'updatedAt',
                      render: (value: string) => formatAdminDate(value),
                    },
                    {
                      title: '审核备注',
                      dataIndex: 'reviewNotes',
                      render: (value: string | null) => value ?? '无',
                    },
                  ]}
                />
              </Card>
            ),
          },
        ]}
      />

      <Modal
        title={editingBlogEntryId ? '编辑 Blog 文章' : '新建 Blog 文章'}
        open={blogEntryModalOpen}
        onCancel={() => {
          setBlogEntryModalOpen(false);
          setEditingBlogEntryId(null);
          blogEntryForm.resetFields();
        }}
        onOk={saveBlogEntry}
        width={980}
        okText="保存"
        confirmLoading={busyAction === 'save-blog-entry'}
      >
        <Form<BlogEntryFormValues>
          form={blogEntryForm}
          layout="vertical"
          initialValues={{
            locale: 'en-US',
            status: 'draft',
            category: blogCategories[0],
            productTopics: [blogProductTopics[0]],
            industry: blogIndustries[0],
            authorId: blogAuthors[0]?.id,
            readMinutes: 6,
            viewCount: 0,
            sectionsJson: defaultBlogSectionsJson,
          }}
        >
          <Row gutter={[16, 0]}>
            <Col span={12}>
              <Form.Item label="标题" name="title" rules={[{ required: true, message: '请输入标题' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Slug" name="slug" rules={[{ required: true, message: '请输入 slug' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="摘要" name="summary" rules={[{ required: true, message: '请输入摘要' }]}>
                <Input.TextArea rows={3} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="Lead 段" name="lead" rules={[{ required: true, message: '请输入 lead' }]}>
                <Input.TextArea rows={3} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="内容分类" name="category" rules={[{ required: true, message: '请选择内容分类' }]}>
                <Select options={blogCategoryOptions} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="产品主题" name="productTopics" rules={[{ required: true, message: '请选择产品主题' }]}>
                <Select mode="multiple" options={blogProductTopicOptions} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="行业" name="industry" rules={[{ required: true, message: '请选择行业' }]}>
                <Select options={blogIndustryOptions} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="作者" name="authorId" rules={[{ required: true, message: '请选择作者' }]}>
                <Select options={blogAuthorOptions} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="语言 / 地区" name="locale" rules={[{ required: true, message: '请输入语言地区' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="状态" name="status" rules={[{ required: true, message: '请选择状态' }]}>
                <Select options={blogEntryStatusOptions} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="发布时间" name="publishedAt">
                <Input type="datetime-local" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="预计阅读分钟" name="readMinutes" rules={[{ required: true, message: '请输入阅读时长' }]}>
                <InputNumber min={1} max={240} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="初始浏览量" name="viewCount" rules={[{ required: true, message: '请输入浏览量' }]}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="封面 Alt" name="coverAlt" rules={[{ required: true, message: '请输入封面 alt' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="SEO 标题" name="seoTitle">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="SEO 描述" name="seoDescription">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="关联产品 Slug" name="relatedProductSlugsText" extra="每行一个 slug">
                <Input.TextArea rows={4} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="关联文章 Slug" name="relatedPostSlugsText" extra="每行一个 slug">
                <Input.TextArea rows={4} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                label="正文 Sections JSON"
                name="sectionsJson"
                rules={[{ required: true, message: '请输入 sections JSON' }]}
                extra="保持 BlogSection[] 结构。可以先用默认模板，再按 paragraph / list / table / code / product block 填写。"
              >
                <Input.TextArea rows={18} style={{ fontFamily: 'Consolas, Monaco, monospace' }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title={editingPressEntryId ? '编辑 Press 新闻稿' : '新建 Press 新闻稿'}
        open={pressEntryModalOpen}
        onCancel={() => {
          setPressEntryModalOpen(false);
          setEditingPressEntryId(null);
          pressEntryForm.resetFields();
        }}
        onOk={savePressEntry}
        width={760}
        okText="保存"
        confirmLoading={busyAction === 'save-press-entry'}
      >
        <Form<PressEntryFormValues>
          form={pressEntryForm}
          layout="vertical"
          initialValues={{
            locale: 'en-US',
            status: 'draft',
          }}
        >
          <Row gutter={[16, 0]}>
            <Col span={12}>
              <Form.Item label="标题" name="title" rules={[{ required: true, message: '请输入标题' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Slug" name="slug" rules={[{ required: true, message: '请输入 slug' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="摘要" name="summary" rules={[{ required: true, message: '请输入摘要' }]}>
                <Input.TextArea rows={3} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="分类" name="category" rules={[{ required: true, message: '请输入分类' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="语言 / 地区" name="locale" rules={[{ required: true, message: '请输入语言地区' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="状态" name="status" rules={[{ required: true, message: '请选择状态' }]}>
                <Select options={blogEntryStatusOptions} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="发布时间" name="publishedAt">
                <Input type="datetime-local" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="SEO 标题" name="seoTitle">
                <Input />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="SEO 描述" name="seoDescription">
                <Input.TextArea rows={3} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title={editingTemplateId ? '编辑 AI 模板' : '新建 AI 模板'}
        open={templateModalOpen}
        onCancel={() => {
          setTemplateModalOpen(false);
          setEditingTemplateId(null);
          templateForm.resetFields();
        }}
        onOk={saveTemplate}
        width={860}
        okText="保存"
        confirmLoading={false}
      >
        <Form<TemplateFormValues> form={templateForm} layout="vertical" initialValues={{ contentType: 'blog', enabled: true, modelHint: 'GPT-5.4', locale: 'en-US', targetRoute: '/blog' }}>
          <Row gutter={[16, 0]}>
            <Col span={12}>
              <Form.Item label="模板名称" name="name" rules={[{ required: true, message: '请输入模板名称' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="内容类型" name="contentType" rules={[{ required: true, message: '请选择内容类型' }]}>
                <Select options={contentTypeOptions} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="模型" name="modelHint" rules={[{ required: true, message: '请输入模型名称' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="语言 / 地区" name="locale" rules={[{ required: true, message: '请输入语言地区' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="目标路由" name="targetRoute" rules={[{ required: true, message: '请输入目标路由' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="启用状态" name="enabled" valuePropName="checked">
                <Switch checkedChildren="启用" unCheckedChildren="停用" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="业务目标" name="objective" rules={[{ required: true, message: '请输入业务目标' }]}>
                <Input.TextArea rows={3} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="System Prompt" name="systemPrompt" rules={[{ required: true, message: '请输入 system prompt' }]}>
                <Input.TextArea rows={5} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="User Prompt 模板" name="userPromptTemplate" rules={[{ required: true, message: '请输入 user prompt 模板' }]}>
                <Input.TextArea rows={4} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="输出检查项" name="outputChecklistText" extra="每行一个检查项">
                <Input.TextArea rows={4} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title={editingRuleId ? '编辑自动化规则' : '新建自动化规则'}
        open={ruleModalOpen}
        onCancel={() => {
          setRuleModalOpen(false);
          setEditingRuleId(null);
          ruleForm.resetFields();
        }}
        onOk={saveRule}
        width={780}
        okText="保存"
        confirmLoading={false}
      >
        <Form<RuleFormValues> form={ruleForm} layout="vertical" initialValues={{ contentType: 'blog', triggerType: 'schedule', cadence: 'weekly', autoCreateBrief: true, autoQueueGeneration: false, requiresHumanReview: true, enabled: true }}>
          <Row gutter={[16, 0]}>
            <Col span={12}>
              <Form.Item label="规则名称" name="name" rules={[{ required: true, message: '请输入规则名称' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="内容类型" name="contentType" rules={[{ required: true, message: '请选择内容类型' }]}>
                <Select options={contentTypeOptions} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="触发方式" name="triggerType" rules={[{ required: true, message: '请选择触发方式' }]}>
                <Select options={triggerTypeOptions} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="执行频率" name="cadence" rules={[{ required: true, message: '请选择执行频率' }]}>
                <Select options={cadenceOptions} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="来源信号" name="sourceSignal" rules={[{ required: true, message: '请输入来源信号' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="目标关键词簇" name="targetKeywordCluster" rules={[{ required: true, message: '请输入目标关键词簇' }]}>
                <Input.TextArea rows={3} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="下次运行时间" name="nextRunAt">
                <Input type="datetime-local" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="启用状态" name="enabled" valuePropName="checked">
                <Switch checkedChildren="启用" unCheckedChildren="停用" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="自动建 Brief" name="autoCreateBrief" valuePropName="checked">
                <Switch checkedChildren="是" unCheckedChildren="否" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="自动排队生成" name="autoQueueGeneration" valuePropName="checked">
                <Switch checkedChildren="是" unCheckedChildren="否" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="必须人工审核" name="requiresHumanReview" valuePropName="checked">
                <Switch checkedChildren="是" unCheckedChildren="否" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title={editingBriefId ? '编辑内容 Brief' : '新建内容 Brief'}
        open={briefModalOpen}
        onCancel={() => {
          setBriefModalOpen(false);
          setEditingBriefId(null);
          briefForm.resetFields();
        }}
        onOk={saveBrief}
        width={920}
        okText="保存"
        confirmLoading={false}
      >
        <Form<BriefFormValues> form={briefForm} layout="vertical" initialValues={{ contentType: 'blog', locale: 'en-US', targetRoute: '/blog', aiTemplateId: null, status: 'idea', owner: '内容运营' }}>
          <Row gutter={[16, 0]}>
            <Col span={12}>
              <Form.Item label="标题" name="title" rules={[{ required: true, message: '请输入标题' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="内容类型" name="contentType" rules={[{ required: true, message: '请选择内容类型' }]}>
                <Select options={contentTypeOptions} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="目标关键词" name="targetKeyword" rules={[{ required: true, message: '请输入目标关键词' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="搜索意图" name="searchIntent" rules={[{ required: true, message: '请输入搜索意图' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="目标受众" name="audience" rules={[{ required: true, message: '请输入目标受众' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="漏斗阶段" name="funnelStage" rules={[{ required: true, message: '请输入漏斗阶段' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="语言 / 地区" name="locale" rules={[{ required: true, message: '请输入语言地区' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="目标路由" name="targetRoute" rules={[{ required: true, message: '请输入目标路由' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="AI 模板" name="aiTemplateId">
                <Select allowClear options={templateOptions} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="状态" name="status" rules={[{ required: true, message: '请选择状态' }]}>
                <Select options={Object.entries(briefStatusLabels).map(([value, label]) => ({ value, label }))} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="计划发布时间" name="scheduledAt">
                <Input type="datetime-local" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="负责人" name="owner" rules={[{ required: true, message: '请输入负责人' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="关联产品 Slug" name="linkedProductSlugsText" extra="每行一个 slug">
                <Input.TextArea rows={4} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="内容大纲" name="outlineText" extra="每行一个大纲段落或小节">
                <Input.TextArea rows={5} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="备注" name="notes">
                <Input.TextArea rows={4} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </Space>
  );
}