import { hasMeaningfulHtmlBody } from '@/lib/editorial-html';

export type ContentTranslateType =
  | 'blog'
  | 'faq'
  | 'brand'
  | 'category'
  | 'product'
  | 'feature'
  | 'shippingMethod';

type ContentTranslateProfile = {
  sourceFields: readonly string[];
  plainTextFields: readonly string[];
  htmlField?: string;
  passthroughFields?: readonly string[];
  serverLabel: string;
  tooltip: string;
};

export const CONTENT_TRANSLATE_PROFILES: Record<ContentTranslateType, ContentTranslateProfile> = {
  blog: {
    sourceFields: [
      'title',
      'category',
      'summary',
      'body',
      'authorName',
      'authorTitle',
      'authorBio',
      'tagsText',
      'seoTitle',
      'seoDescription',
      'relatedProductSlugsText',
    ],
    plainTextFields: [
      'title',
      'category',
      'summary',
      'authorName',
      'authorTitle',
      'authorBio',
      'tagsText',
      'seoTitle',
      'seoDescription',
    ],
    htmlField: 'body',
    passthroughFields: ['relatedProductSlugsText'],
    serverLabel: 'engineering blog article',
    tooltip: '将默认语言已保存的标题、摘要、正文、作者与 SEO 字段翻译到当前语言；Slug 与关联产品 Slug 不会翻译；保留原文排版结构与链接，仅翻译可见文字',
  },
  faq: {
    sourceFields: ['title', 'body', 'seoTitle', 'seoDescription'],
    plainTextFields: ['title', 'seoTitle', 'seoDescription'],
    htmlField: 'body',
    serverLabel: 'FAQ entry',
    tooltip: '将默认语言已保存的问答标题、正文与 SEO 字段翻译到当前语言；Slug 不会翻译；保留原文排版结构与链接，仅翻译可见文字',
  },
  brand: {
    sourceFields: ['name', 'description', 'tagsText', 'seoTitle', 'seoDescription'],
    plainTextFields: ['name', 'description', 'tagsText', 'seoTitle', 'seoDescription'],
    serverLabel: 'product brand',
    tooltip: '将默认语言已保存的品牌名称、描述与 SEO 字段翻译到当前语言；Slug 不会翻译，翻译后请校对',
  },
  category: {
    sourceFields: ['name', 'description', 'tagsText', 'seoTitle', 'seoDescription'],
    plainTextFields: ['name', 'description', 'tagsText', 'seoTitle', 'seoDescription'],
    serverLabel: 'product category',
    tooltip: '将默认语言已保存的分类名称、描述与 SEO 字段翻译到当前语言；Slug 不会翻译，翻译后请校对',
  },
  product: {
    sourceFields: [
      'name',
      'shortDescription',
      'description',
      'coverAlt',
      'certificationsText',
      'tagsText',
      'seoTitle',
      'seoDescription',
    ],
    plainTextFields: [
      'name',
      'shortDescription',
      'coverAlt',
      'certificationsText',
      'tagsText',
      'seoTitle',
      'seoDescription',
    ],
    htmlField: 'description',
    serverLabel: 'catalog product',
    tooltip: '将默认语言已保存的产品名称、描述、认证与 SEO 字段翻译到当前语言，并按汇率换算销售价与原价；Slug 不会翻译；详细描述保留排版结构',
  },
  feature: {
    sourceFields: ['name', 'unit', 'textOptionsText'],
    plainTextFields: ['name', 'unit', 'textOptionsText'],
    serverLabel: 'product feature definition',
    tooltip: '将默认语言已保存的特性名称、单位与可选值翻译到当前语言，Key 与值类型不会翻译',
  },
  shippingMethod: {
    sourceFields: ['name', 'etaLabel', 'note'],
    plainTextFields: ['name', 'etaLabel', 'note'],
    serverLabel: 'shipping method',
    tooltip: '将默认语言已保存的物流方式名称、时效与说明翻译到当前语言；编码不会翻译，翻译后请校对',
  },
};

export function pickTranslatePayload(
  contentType: ContentTranslateType,
  fields: Record<string, string>,
): Record<string, string> {
  const profile = CONTENT_TRANSLATE_PROFILES[contentType];
  const payload: Record<string, string> = {};
  for (const key of profile.sourceFields) {
    const value = fields[key];
    if (!value?.trim()) continue;
    if (key === profile.htmlField) {
      if (hasMeaningfulHtmlBody(value)) payload[key] = value;
    } else {
      payload[key] = value;
    }
  }
  return payload;
}

/** 丢弃空字符串；富文本字段需有实质内容才保留。 */
export function filterNonemptyTranslateFields(
  contentType: ContentTranslateType,
  fields: Record<string, string>,
): Record<string, string> {
  const profile = CONTENT_TRANSLATE_PROFILES[contentType];
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (!value?.trim()) continue;
    if (key === profile.htmlField) {
      if (hasMeaningfulHtmlBody(value)) result[key] = value;
    } else {
      result[key] = value;
    }
  }
  return result;
}

/** 仅将非空翻译结果合并进当前草稿，避免空字符串覆盖已有内容。 */
export function applyNonemptyTranslatedFields<T extends Record<string, unknown>>(
  current: T,
  translated: Record<string, string>,
): T {
  const next = { ...current };
  for (const [key, value] of Object.entries(translated)) {
    if (value?.trim()) {
      (next as Record<string, string>)[key] = value;
    }
  }
  return next;
}

export function validateDefaultTranslateSource(
  contentType: ContentTranslateType,
  fields: Record<string, string>,
): string | null {
  if (contentType === 'blog' || contentType === 'faq') {
    const titleKey = contentType === 'blog' ? 'title' : 'title';
    if (!fields[titleKey]?.trim()) {
      return '默认语言内容不完整，请先完善标题与正文';
    }
    if (!hasMeaningfulHtmlBody(fields.body ?? '')) {
      return '默认语言内容不完整，请先完善标题与正文';
    }
    return null;
  }

  if (!fields.name?.trim()) {
    return '默认语言内容不完整，请先完善名称';
  }

  return null;
}

export function getHtmlContentLabel(contentType: ContentTranslateType): string {
  switch (contentType) {
    case 'blog':
      return 'engineering blog article body';
    case 'faq':
      return 'FAQ answer body';
    case 'product':
      return 'product detail description HTML';
    default:
      return 'rich text body';
  }
}
