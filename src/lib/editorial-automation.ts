export const editorialContentTypes = ['blog', 'press', 'faq', 'tech-faq', 'glossary', 'support'] as const;
export const editorialTriggerTypes = ['schedule', 'product-update', 'faq-gap', 'seo-refresh', 'support-signal', 'manual'] as const;
export const editorialCadenceValues = ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'manual'] as const;
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

export type EditorialAutomationConfig = {
  workflowSettings: EditorialWorkflowSettings;
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
  key: EditorialContentType;
  title: string;
  route: string;
  count: number;
  schemaType: string;
  sourceMode: 'code-seeded' | 'admin-managed';
  note: string;
};

export type AdminEditorialDashboard = {
  coverage: EditorialCoverageMetric[];
  summary: EditorialDashboardSummary;
  config: EditorialAutomationConfig;
};

export const defaultEditorialAutomationConfig: EditorialAutomationConfig = {
  workflowSettings: {
    brandVoiceSummary: '以工程决策与工厂直连采购为核心，优先写清参数、工况、验证路径、交付约束，避免夸张营销口吻。',
    geoStrategy: '围绕 B2B 搜索意图扩写 Blog、FAQ、Support 与 Glossary，覆盖选型、排障、交期、物流、合规、价格和行业应用场景。',
    internalLinkPolicy: '每篇内容至少链接 2 个相关产品、1 个支持或 FAQ 页面、1 个更上层聚合页，并避免孤立内容页。',
    factCheckingPolicy: '技术参数必须回链到产品或知识源；物流、交期、税费、合规内容只能写已确认事实，未确认部分必须显式标注估算或人工确认。',
    schemaPriorities: ['BlogPosting', 'Article', 'FAQPage', 'TechArticle', 'DefinedTermSet'],
    publishGuardrails: [
      'AI 产出默认进入人工审核，不允许直接自动发布。',
      '涉及价格、交期、认证、出口管制的文案必须二次校对。',
      '标题、摘要、FAQ 问答必须避免与现有内容语义重复。',
      '发布前检查 slug、canonical、结构化数据和内链。',
    ],
  },
  templates: [
    {
      id: 'tpl-blog-engineering',
      name: '工程博客长文',
      contentType: 'blog',
      objective: '面向高意图 B2B 搜索词产出可被引用的工程文章。',
      systemPrompt: 'You are the editorial copilot for an industrial motion-control ecommerce brand. Write precise, evidence-oriented English content for engineers and sourcing teams.',
      userPromptTemplate: 'Write a blog post for {{keyword}} covering use cases, engineering tradeoffs, sizing checks, common mistakes, and internal links to products/support pages.',
      outputChecklist: ['包含问题定义、选型逻辑、参数检查表', '带 1 个 FAQ 小节', '带结构化内链建议'],
      modelHint: 'GPT-5.4',
      locale: 'en-US',
      targetRoute: '/blog',
      enabled: true,
    },
    {
      id: 'tpl-press-news',
      name: '资讯 / 新闻稿',
      contentType: 'press',
      objective: '将产品更新、站点更新、服务升级转成公司新闻或媒体稿。',
      systemPrompt: 'Write concise, factual newsroom copy for a B2B industrial brand. Keep claims conservative and traceable.',
      userPromptTemplate: 'Turn {{sourceSignal}} into a press-style update with headline, summary, why it matters, and press-friendly boilerplate.',
      outputChecklist: ['标题简洁', '摘要可直接用于列表页', '包含 boilerplate'],
      modelHint: 'GPT-5.4',
      locale: 'en-US',
      targetRoute: '/company/press',
      enabled: true,
    },
    {
      id: 'tpl-faq-cluster',
      name: '商城 FAQ 问答簇',
      contentType: 'faq',
      objective: '针对购买、支付、物流、MOQ、询盘路径补充面向买家的 FAQ。',
      systemPrompt: 'Generate short, scannable FAQ answers for B2B buyers. Be direct and avoid unsupported commitments.',
      userPromptTemplate: 'Produce 8 buyer-facing FAQ pairs for {{keywordCluster}} with concise answers and suggestions for related support links.',
      outputChecklist: ['问句自然', '答案简洁', '适合 FAQPage 结构化数据'],
      modelHint: 'GPT-5.4',
      locale: 'en-US',
      targetRoute: '/faq',
      enabled: true,
    },
    {
      id: 'tpl-tech-faq',
      name: '技术 FAQ',
      contentType: 'tech-faq',
      objective: '补充尺寸选型、驱动调试、布线、合规与物流相关的技术问答。',
      systemPrompt: 'Write technical FAQ entries for motion-control engineers. Prefer clear explanations, bullets, and formulas only when justified.',
      userPromptTemplate: 'Create a technical FAQ entry for {{question}} with search summary, engineering explanation, bullets, and related glossary/product references.',
      outputChecklist: ['包含 search summary', '必要时包含公式或代码块', '指出关联术语与产品'],
      modelHint: 'GPT-5.4',
      locale: 'en-US',
      targetRoute: '/tech-faq',
      enabled: true,
    },
    {
      id: 'tpl-glossary',
      name: '术语词条',
      contentType: 'glossary',
      objective: '扩充 motion-control、drivetrain、compliance 相关术语库。',
      systemPrompt: 'Write concise glossary definitions for industrial motion-control readers. Clarify meaning, context, and adjacent terms.',
      userPromptTemplate: 'Generate a glossary term for {{term}} with synonyms, definition, related terms, and suggested linked products.',
      outputChecklist: ['定义简洁', '带同义词', '可用于 DefinedTermSet'],
      modelHint: 'GPT-5.4',
      locale: 'en-US',
      targetRoute: '/glossary',
      enabled: true,
    },
    {
      id: 'tpl-support-refresh',
      name: '支持文章刷新',
      contentType: 'support',
      objective: '把物流、售后、支付、退换政策等支持内容维持在可检索、可解释的状态。',
      systemPrompt: 'Refresh support-center content with operational clarity. Keep instructions actionable and aligned with existing business policies.',
      userPromptTemplate: 'Refresh the support article for {{route}} using {{sourceSignal}} and surface the top buyer questions to answer inline.',
      outputChecklist: ['明确步骤', '补 FAQ 化表达', '补相关支持内链'],
      modelHint: 'GPT-5.4',
      locale: 'en-US',
      targetRoute: '/support',
      enabled: true,
    },
  ],
  rules: [
    {
      id: 'rule-blog-weekly',
      name: '每周高意图博客扩写',
      contentType: 'blog',
      triggerType: 'schedule',
      cadence: 'weekly',
      sourceSignal: 'Search Console 高意图关键词 + 新增产品族',
      targetKeywordCluster: 'stepper motor sizing, driver tuning, shipping and customs, bldc troubleshooting',
      autoCreateBrief: true,
      autoQueueGeneration: false,
      requiresHumanReview: true,
      enabled: true,
      nextRunAt: '2026-06-07T09:00:00.000Z',
    },
    {
      id: 'rule-faq-gap',
      name: 'FAQ 缺口扫描',
      contentType: 'faq',
      triggerType: 'faq-gap',
      cadence: 'biweekly',
      sourceSignal: '客服、询盘、站内搜索零结果、订单备注',
      targetKeywordCluster: 'MOQ, lead time, duty, VAT, direct-buy vs RFQ',
      autoCreateBrief: true,
      autoQueueGeneration: true,
      requiresHumanReview: true,
      enabled: true,
      nextRunAt: '2026-06-14T09:00:00.000Z',
    },
    {
      id: 'rule-product-refresh',
      name: '产品更新驱动内容刷新',
      contentType: 'support',
      triggerType: 'product-update',
      cadence: 'manual',
      sourceSignal: '新品上架、价格/物流/认证策略变更',
      targetKeywordCluster: 'support articles, shipping, pricing, payment, compliance',
      autoCreateBrief: true,
      autoQueueGeneration: false,
      requiresHumanReview: true,
      enabled: true,
      nextRunAt: null,
    },
    {
      id: 'rule-glossary-quarterly',
      name: '季度术语库补全',
      contentType: 'glossary',
      triggerType: 'seo-refresh',
      cadence: 'quarterly',
      sourceSignal: 'Blog / FAQ / Support 高频术语提取',
      targetKeywordCluster: 'microstepping, inertia ratio, backlash, DDP, duty cycle',
      autoCreateBrief: true,
      autoQueueGeneration: false,
      requiresHumanReview: true,
      enabled: true,
      nextRunAt: '2026-07-01T09:00:00.000Z',
    },
  ],
  briefs: [
    {
      id: 'brief-blog-nema23',
      title: 'NEMA 23 stepper motor sizing guide for CNC retrofits',
      contentType: 'blog',
      targetKeyword: 'nema 23 stepper motor sizing guide',
      searchIntent: '选型 / 比较 / 工程验证',
      audience: '设备工程师、采购、CNC 改造团队',
      funnelStage: 'MOFU',
      locale: 'en-US',
      targetRoute: '/blog',
      aiTemplateId: 'tpl-blog-engineering',
      linkedProductSlugs: ['23-stepper-motor-240ncm'],
      outline: ['When a NEMA 23 is enough', 'Torque and inertia checkpoints', 'Driver and PSU pairing', 'Common retrofit mistakes', 'Related products and FAQ'],
      status: 'brief-ready',
      scheduledAt: '2026-06-05T08:00:00.000Z',
      owner: '内容运营',
      notes: '优先覆盖 retrofit / replacement intent，避免只写参数堆砌。',
      updatedAt: '2026-05-30T10:00:00.000Z',
    },
    {
      id: 'brief-techfaq-ddp',
      title: 'What does DDP shipping actually cover for industrial orders?',
      contentType: 'tech-faq',
      targetKeyword: 'ddp shipping industrial orders',
      searchIntent: '物流解释 / 风险确认',
      audience: '国际采购、运营、物流经理',
      funnelStage: 'BOFU',
      locale: 'en-US',
      targetRoute: '/tech-faq',
      aiTemplateId: 'tpl-tech-faq',
      linkedProductSlugs: [],
      outline: ['Meaning of DDP', 'What it usually includes', 'What still requires buyer confirmation', 'How it differs from DAP/EXW'],
      status: 'review',
      scheduledAt: null,
      owner: '运营后台',
      notes: '要和 support/shipping 页对齐，不要给出绝对承诺。',
      updatedAt: '2026-05-29T18:00:00.000Z',
    },
    {
      id: 'brief-faq-moq',
      title: 'Buyer FAQ cluster for MOQ, lead time, and sample orders',
      contentType: 'faq',
      targetKeyword: 'sample order MOQ lead time faq',
      searchIntent: '交易规则 / 下单前确认',
      audience: '首次采购客户',
      funnelStage: 'BOFU',
      locale: 'en-US',
      targetRoute: '/faq',
      aiTemplateId: 'tpl-faq-cluster',
      linkedProductSlugs: [],
      outline: ['MOQ basics', 'Sample order path', 'Lead time expectation', 'RFQ vs direct buy'],
      status: 'idea',
      scheduledAt: null,
      owner: '销售支持',
      notes: null,
      updatedAt: '2026-05-28T09:30:00.000Z',
    },
  ],
  runs: [
    {
      id: 'run-blog-1',
      briefId: 'brief-blog-nema23',
      contentType: 'blog',
      modelName: 'GPT-5.4',
      status: 'completed',
      outputTitle: 'NEMA 23 Stepper Motor Sizing Guide for CNC Retrofits',
      outputSlug: 'nema-23-stepper-motor-sizing-guide-cnc-retrofits',
      qualityScore: 91,
      reviewNotes: '技术结构完整，需人工补充 2 条内部链接和 1 段 FAQ。',
      createdAt: '2026-05-30T11:00:00.000Z',
      updatedAt: '2026-05-30T11:18:00.000Z',
    },
    {
      id: 'run-techfaq-1',
      briefId: 'brief-techfaq-ddp',
      contentType: 'tech-faq',
      modelName: 'GPT-5.4',
      status: 'reviewed',
      outputTitle: 'What DDP Shipping Covers for Industrial Orders',
      outputSlug: null,
      qualityScore: 87,
      reviewNotes: '合规表达已收敛，待物流团队确认具体用语。',
      createdAt: '2026-05-29T18:05:00.000Z',
      updatedAt: '2026-05-29T18:40:00.000Z',
    },
    {
      id: 'run-faq-1',
      briefId: null,
      contentType: 'faq',
      modelName: 'GPT-5.4',
      status: 'failed',
      outputTitle: 'MOQ cluster trial draft',
      outputSlug: null,
      qualityScore: null,
      reviewNotes: '问答和现有 FAQ 语义重复度过高，已退回重做 brief。',
      createdAt: '2026-05-27T09:00:00.000Z',
      updatedAt: '2026-05-27T09:07:00.000Z',
    },
  ],
};

export function cloneEditorialAutomationConfig(config: EditorialAutomationConfig): EditorialAutomationConfig {
  return {
    workflowSettings: {
      brandVoiceSummary: config.workflowSettings.brandVoiceSummary,
      geoStrategy: config.workflowSettings.geoStrategy,
      internalLinkPolicy: config.workflowSettings.internalLinkPolicy,
      factCheckingPolicy: config.workflowSettings.factCheckingPolicy,
      schemaPriorities: [...config.workflowSettings.schemaPriorities],
      publishGuardrails: [...config.workflowSettings.publishGuardrails],
    },
    templates: config.templates.map((item) => ({ ...item, outputChecklist: [...item.outputChecklist] })),
    rules: config.rules.map((item) => ({ ...item })),
    briefs: config.briefs.map((item) => ({ ...item, linkedProductSlugs: [...item.linkedProductSlugs], outline: [...item.outline] })),
    runs: config.runs.map((item) => ({ ...item })),
  };
}