import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getAdminEditorialDashboard, updateAdminEditorialConfig } from '@/server/admin/editorial';

const workflowSettingsSchema = z.object({
  brandVoiceSummary: z.string().trim().min(1),
  geoStrategy: z.string().trim().min(1),
  internalLinkPolicy: z.string().trim().min(1),
  factCheckingPolicy: z.string().trim().min(1),
  schemaPriorities: z.array(z.string().trim().min(1)).default([]),
  publishGuardrails: z.array(z.string().trim().min(1)).default([]),
});

const templateSchema = z.object({
  id: z.string().default(''),
  name: z.string().trim().min(1),
  contentType: z.enum(['blog', 'press', 'faq', 'tech-faq', 'glossary', 'support']),
  objective: z.string().trim().min(1),
  systemPrompt: z.string().trim().min(1),
  userPromptTemplate: z.string().trim().min(1),
  outputChecklist: z.array(z.string().trim().min(1)).default([]),
  modelHint: z.string().trim().min(1),
  locale: z.string().trim().min(1),
  targetRoute: z.string().trim().min(1),
  enabled: z.boolean().default(true),
});

const ruleSchema = z.object({
  id: z.string().default(''),
  name: z.string().trim().min(1),
  contentType: z.enum(['blog', 'press', 'faq', 'tech-faq', 'glossary', 'support']),
  triggerType: z.enum(['schedule', 'product-update', 'faq-gap', 'seo-refresh', 'support-signal', 'manual']),
  cadence: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'manual']),
  sourceSignal: z.string().trim().min(1),
  targetKeywordCluster: z.string().trim().min(1),
  autoCreateBrief: z.boolean().default(false),
  autoQueueGeneration: z.boolean().default(false),
  requiresHumanReview: z.boolean().default(true),
  enabled: z.boolean().default(true),
  nextRunAt: z.string().trim().nullable().optional().transform((value) => value ?? null),
});

const briefSchema = z.object({
  id: z.string().default(''),
  title: z.string().trim().min(1),
  contentType: z.enum(['blog', 'press', 'faq', 'tech-faq', 'glossary', 'support']),
  targetKeyword: z.string().trim().min(1),
  searchIntent: z.string().trim().min(1),
  audience: z.string().trim().min(1),
  funnelStage: z.string().trim().min(1),
  locale: z.string().trim().min(1),
  targetRoute: z.string().trim().min(1),
  aiTemplateId: z.string().trim().nullable().optional().transform((value) => value ?? null),
  linkedProductSlugs: z.array(z.string().trim().min(1)).default([]),
  outline: z.array(z.string().trim().min(1)).default([]),
  status: z.enum(['idea', 'brief-ready', 'generating', 'review', 'scheduled', 'published']),
  scheduledAt: z.string().trim().nullable().optional().transform((value) => value ?? null),
  owner: z.string().trim().min(1),
  notes: z.string().trim().nullable().optional().transform((value) => value ?? null),
  updatedAt: z.string().trim().min(1),
});

const runSchema = z.object({
  id: z.string().default(''),
  briefId: z.string().trim().nullable().optional().transform((value) => value ?? null),
  contentType: z.enum(['blog', 'press', 'faq', 'tech-faq', 'glossary', 'support']),
  modelName: z.string().trim().min(1),
  status: z.enum(['queued', 'running', 'completed', 'failed', 'reviewed']),
  outputTitle: z.string().trim().min(1),
  outputSlug: z.string().trim().nullable().optional().transform((value) => value ?? null),
  qualityScore: z.coerce.number().min(0).max(100).nullable().optional().transform((value) => value ?? null),
  reviewNotes: z.string().trim().nullable().optional().transform((value) => value ?? null),
  createdAt: z.string().trim().min(1),
  updatedAt: z.string().trim().min(1),
});

const editorialConfigSchema = z.object({
  workflowSettings: workflowSettingsSchema,
  templates: z.array(templateSchema).default([]),
  rules: z.array(ruleSchema).default([]),
  briefs: z.array(briefSchema).default([]),
  runs: z.array(runSchema).default([]),
});

export async function GET() {
  const dashboard = await getAdminEditorialDashboard();
  return NextResponse.json(dashboard);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const parsed = editorialConfigSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const dashboard = await updateAdminEditorialConfig(parsed.data);
  return NextResponse.json(dashboard);
}