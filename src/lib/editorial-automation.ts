export const editorialContentTypes = ['content'] as const;
export const editorialTriggerTypes = ['manual'] as const;
export const editorialCadenceValues = ['manual'] as const;
export const editorialBriefStatuses = ['idea', 'brief-ready', 'generating', 'review', 'scheduled', 'published'] as const;
export const editorialRunStatuses = ['queued', 'running', 'completed', 'failed', 'reviewed'] as const;

export type EditorialContentType = (typeof editorialContentTypes)[number];
export type EditorialTriggerType = (typeof editorialTriggerTypes)[number];
export type EditorialCadence = (typeof editorialCadenceValues)[number];
export type EditorialBriefStatus = (typeof editorialBriefStatuses)[number];
export type EditorialRunStatus = (typeof editorialRunStatuses)[number];

export type EditorialAiTemplate = {
  id: string;
  name: string;
  contentType: EditorialContentType;
  objective: string;
  systemPrompt: string;
  userPromptTemplate: string;
  outputChecklist: string[];
  modelHint: string;
  locale: string;
  targetRoute: string;
  enabled: boolean;
};

export type EditorialAutomationRule = {
  id: string;
  name: string;
  contentType: EditorialContentType;
  triggerType: EditorialTriggerType;
  cadence: EditorialCadence;
  sourceSignal: string;
  targetKeywordCluster: string;
  autoCreateBrief: boolean;
  autoQueueGeneration: boolean;
  requiresHumanReview: boolean;
  enabled: boolean;
  nextRunAt: string | null;
};

export type EditorialBrief = {
  id: string;
  title: string;
  contentType: EditorialContentType;
  targetKeyword: string;
  searchIntent: string;
  audience: string;
  funnelStage: string;
  locale: string;
  targetRoute: string;
  aiTemplateId: string | null;
  linkedProductSlugs: string[];
  outline: string[];
  status: EditorialBriefStatus;
  scheduledAt: string | null;
  owner: string;
  notes: string | null;
  updatedAt: string;
};

export type EditorialGenerationRun = {
  id: string;
  briefId: string | null;
  contentType: EditorialContentType;
  modelName: string;
  status: EditorialRunStatus;
  outputTitle: string;
  outputSlug: string | null;
  qualityScore: number | null;
  reviewNotes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EditorialWorkflowSettings = {
  brandVoiceSummary: string;
  geoStrategy: string;
  internalLinkPolicy: string;
  factCheckingPolicy: string;
  schemaPriorities: string[];
  publishGuardrails: string[];
};

export type EditorialCoverageBoard = {
  key: string;
  title: string;
  contentType: EditorialContentType;
  note: string;
  sourceMode: 'code-seeded' | 'admin-managed';
};

export type EditorialAutomationConfig = {
  workflowSettings: EditorialWorkflowSettings;
  coverageBoards: EditorialCoverageBoard[];
  templates: EditorialAiTemplate[];
  rules: EditorialAutomationRule[];
  briefs: EditorialBrief[];
  runs: EditorialGenerationRun[];
};

export type EditorialDashboardSummary = {
  liveContentTypes: number;
  liveDocumentCount: number;
  activeTemplates: number;
  enabledRules: number;
  briefsInPipeline: number;
  recentCompletedRuns: number;
};

export type EditorialCoverageMetric = {
  key: string;
  title: string;
  count: number;
  contentType: EditorialContentType;
  sourceMode: 'code-seeded' | 'admin-managed';
  note: string;
  custom?: boolean;
};

export type AdminEditorialDashboard = {
  coverage: EditorialCoverageMetric[];
  summary: EditorialDashboardSummary;
  config: EditorialAutomationConfig;
};

export const defaultEditorialAutomationConfig: EditorialAutomationConfig = {
  workflowSettings: {
    brandVoiceSummary: '',
    geoStrategy: '',
    internalLinkPolicy: '',
    factCheckingPolicy: '',
    schemaPriorities: [],
    publishGuardrails: [],
  },
  coverageBoards: [
    {
      key: 'blog',
      title: '工程博客',
      contentType: 'content',
      note: '面向工程选型、应用场景和技术决策的内容看板。',
      sourceMode: 'admin-managed',
    },
    {
      key: 'press',
      title: '资讯 / 新闻稿',
      contentType: 'content',
      note: '公司资讯、产品更新和新闻稿内容看板。',
      sourceMode: 'admin-managed',
    },
    {
      key: 'faq',
      title: '商城 FAQ',
      contentType: 'content',
      note: '购买、支付、物流、MOQ、询盘路径等买家 FAQ 看板。',
      sourceMode: 'admin-managed',
    },
    {
      key: 'tech-faq',
      title: '技术 FAQ',
      contentType: 'content',
      note: '尺寸选型、驱动调试、布线、合规与排障类技术问答看板。',
      sourceMode: 'admin-managed',
    },
    {
      key: 'glossary',
      title: '术语词典',
      contentType: 'content',
      note: '运动控制、驱动、物流和合规相关术语解释看板。',
      sourceMode: 'admin-managed',
    },
    {
      key: 'support',
      title: '支持文章',
      contentType: 'content',
      note: '帮助中心、物流、支付、售后和运营说明内容看板。',
      sourceMode: 'admin-managed',
    },
  ],
  templates: [],
  rules: [],
  briefs: [],
  runs: [],
};

export function cloneEditorialAutomationConfig(config: Partial<EditorialAutomationConfig>): EditorialAutomationConfig {
  const workflowSettings = config.workflowSettings ?? defaultEditorialAutomationConfig.workflowSettings;

  return {
    workflowSettings: {
      brandVoiceSummary: workflowSettings.brandVoiceSummary,
      geoStrategy: workflowSettings.geoStrategy,
      internalLinkPolicy: workflowSettings.internalLinkPolicy,
      factCheckingPolicy: workflowSettings.factCheckingPolicy,
      schemaPriorities: [...(workflowSettings.schemaPriorities ?? [])],
      publishGuardrails: [...(workflowSettings.publishGuardrails ?? [])],
    },
    coverageBoards: (config.coverageBoards ?? defaultEditorialAutomationConfig.coverageBoards).map((item) => ({ ...item })),
    templates: (config.templates ?? []).map((item) => ({ ...item, outputChecklist: [...(item.outputChecklist ?? [])] })),
    rules: (config.rules ?? []).map((item) => ({ ...item })),
    briefs: (config.briefs ?? []).map((item) => ({
      ...item,
      linkedProductSlugs: [...(item.linkedProductSlugs ?? [])],
      outline: [...(item.outline ?? [])],
    })),
    runs: (config.runs ?? []).map((item) => ({ ...item })),
  };
}
