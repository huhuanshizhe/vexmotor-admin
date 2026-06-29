import { getCommonLanguage } from '@/lib/languages';
import {
  CONTENT_TRANSLATE_PROFILES,
  filterNonemptyTranslateFields,
  type ContentTranslateType,
  getHtmlContentLabel,
} from '@/lib/content-translate-config';
import { hasMeaningfulHtmlBody } from '@/lib/editorial-html';

import { chatWithLlm } from '@/server/ai/chat-with-llm';
import {
  assertHtmlStructurePreserved,
  HtmlStructureMismatchError,
  repairHtmlAttributes,
  stripMarkdownCodeFence,
} from '@/server/ai/translate-html';

export type { ContentTranslateType };

const TRANSLATION_SYSTEM_PROMPT = `You are a professional technical translator for an industrial motion-control B2B ecommerce brand (STEPMOTECH).
Translate accurately for engineers and sourcing teams. Use natural, professional target-language prose.
Preserve brand names, product model numbers, units (Nm, mm, kW), URLs, email addresses, and placeholders like {year} or {param}.
Return ONLY the requested output format with no explanations.`;

function resolveLocaleLabel(code: string) {
  const language = getCommonLanguage(code);
  return language?.name ?? code;
}

function parseJsonObject(raw: string): Record<string, string> {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const parsed = JSON.parse(cleaned) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('LLM did not return a JSON object');
  }

  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value === 'string') {
      result[key] = value;
    }
  }
  return result;
}

export async function translateText(options: {
  text: string;
  sourceLocale: string;
  targetLocale: string;
  context?: string;
}): Promise<string> {
  const { text, sourceLocale, targetLocale, context } = options;
  if (!text.trim() || sourceLocale === targetLocale) {
    return text;
  }

  const sourceLabel = resolveLocaleLabel(sourceLocale);
  const targetLabel = resolveLocaleLabel(targetLocale);
  const contextNote = context ? `\nContext: This is ${context} content for an industrial ecommerce site.` : '';

  const prompt = `Translate the following text from ${sourceLabel} to ${targetLabel}.${contextNote}

Source text:
"""
${text}
"""

${targetLabel} translation:`;

  return chatWithLlm({
    system: TRANSLATION_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
    maxTokens: 4096,
    temperature: 0.2,
  });
}

async function translatePlainFields(options: {
  contentType: ContentTranslateType;
  sourceLocale: string;
  targetLocale: string;
  fields: Record<string, string>;
}): Promise<Record<string, string>> {
  const { contentType, sourceLocale, targetLocale, fields } = options;
  const profile = CONTENT_TRANSLATE_PROFILES[contentType];
  const payload: Record<string, string> = {};

  for (const key of profile.plainTextFields) {
    const value = fields[key]?.trim();
    if (value) payload[key] = value;
  }

  if (!Object.keys(payload).length) {
    return {};
  }

  const sourceLabel = resolveLocaleLabel(sourceLocale);
  const targetLabel = resolveLocaleLabel(targetLocale);
  const multilineNote = profile.plainTextFields.some((key) => key.endsWith('Text'))
    ? '\nFor multiline fields ending with Text (tagsText, textOptionsText, certificationsText), keep one item per line.'
    : '';

  const prompt = `Translate the following ${profile.serverLabel} fields from ${sourceLabel} to ${targetLabel}.
Return a JSON object with the same keys. Translate only human-readable text values.${multilineNote}

Fields JSON:
${JSON.stringify(payload, null, 2)}`;

  const raw = await chatWithLlm({
    system: `${TRANSLATION_SYSTEM_PROMPT}\nReturn valid JSON only.`,
    messages: [{ role: 'user', content: prompt }],
    maxTokens: 4096,
    temperature: 0.2,
  });

  const parsed = parseJsonObject(raw);
  const result: Record<string, string> = {};
  for (const key of Object.keys(payload)) {
    const value = parsed[key]?.trim();
    if (value) result[key] = parsed[key]!;
  }
  return result;
}

const HTML_TRANSLATION_SYSTEM = `${TRANSLATION_SYSTEM_PROMPT}
You translate HTML rich-text body content. Rules:
- Keep every HTML tag, nesting order, and closing tag exactly as in the source.
- Do NOT add, remove, or rename tags.
- Preserve all attributes exactly: class, id, href, src, alt, target, rel, data-language.
- Translate ONLY visible text between tags.
- Do NOT wrap output in markdown code fences.
- Return ONLY the translated HTML string.`;

async function translateHtmlBodyOnce(options: {
  html: string;
  sourceLocale: string;
  targetLocale: string;
  contentType: ContentTranslateType;
  strict?: boolean;
}): Promise<string> {
  const { html, sourceLocale, targetLocale, contentType, strict } = options;
  const sourceLabel = resolveLocaleLabel(sourceLocale);
  const targetLabel = resolveLocaleLabel(targetLocale);
  const contentLabel = getHtmlContentLabel(contentType);

  const strictNote = strict
    ? '\nCRITICAL: The output must have identical HTML tag structure and attributes as the source. Only change text nodes.'
    : '';

  const prompt = `Translate this ${contentLabel} HTML from ${sourceLabel} to ${targetLabel}.
Preserve all HTML structure, classes, links, images, tables, lists, and code blocks.${strictNote}

Source HTML:
${html}`;

  const raw = await chatWithLlm({
    system: HTML_TRANSLATION_SYSTEM,
    messages: [{ role: 'user', content: prompt }],
    maxTokens: 8192,
    temperature: 0.2,
  });

  return stripMarkdownCodeFence(raw);
}

export async function translateHtmlBody(options: {
  html: string;
  sourceLocale: string;
  targetLocale: string;
  contentType: ContentTranslateType;
}): Promise<string> {
  const { html, sourceLocale, targetLocale, contentType } = options;
  if (!html.trim() || sourceLocale === targetLocale) {
    return html;
  }

  let translated = await translateHtmlBodyOnce({ html, sourceLocale, targetLocale, contentType });
  translated = repairHtmlAttributes(html, translated);

  try {
    assertHtmlStructurePreserved(html, translated);
    return translated;
  } catch {
    translated = await translateHtmlBodyOnce({
      html,
      sourceLocale,
      targetLocale,
      contentType,
      strict: true,
    });
    translated = repairHtmlAttributes(html, translated);
    assertHtmlStructurePreserved(html, translated);
    return translated;
  }
}

export async function translateContentFields(options: {
  contentType: ContentTranslateType;
  sourceLocale: string;
  targetLocale: string;
  fields: Record<string, string>;
}): Promise<Record<string, string>> {
  const { contentType, sourceLocale, targetLocale, fields } = options;
  if (sourceLocale === targetLocale) {
    return { ...fields };
  }

  const profile = CONTENT_TRANSLATE_PROFILES[contentType];
  const result: Record<string, string> = {};

  for (const key of profile.passthroughFields ?? []) {
    if (fields[key]?.trim()) {
      result[key] = fields[key];
    }
  }

  const htmlField = profile.htmlField;
  const htmlSource = htmlField ? fields[htmlField]?.trim() : '';

  const [plainFields, html] = await Promise.all([
    translatePlainFields({ contentType, sourceLocale, targetLocale, fields }),
    htmlSource
      ? translateHtmlBody({
          html: htmlSource,
          sourceLocale,
          targetLocale,
          contentType,
        })
      : Promise.resolve(''),
  ]);

  Object.assign(result, plainFields);
  if (html && htmlField && hasMeaningfulHtmlBody(html)) {
    result[htmlField] = html;
  }

  return filterNonemptyTranslateFields(contentType, result);
}

export { HtmlStructureMismatchError };
