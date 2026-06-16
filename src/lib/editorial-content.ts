import type { BlogCategory, BlogIndustry, BlogPost, BlogProductTopic, BlogSection } from '@/lib/blog';
import type { PressRelease } from '@/lib/press';
import type { EditorialContentType } from '@/lib/editorial-automation';

export const editorialEntryStatuses = ['draft', 'published', 'archived'] as const;

export type EditorialEntryStatus = (typeof editorialEntryStatuses)[number];

type EditorialGenericPayload = Record<string, unknown>;

export type EditorialBlogEntryPayload = {
  lead: string;
  category: BlogCategory;
  productTopics: BlogProductTopic[];
  industry: BlogIndustry;
  authorId: string;
  readMinutes: number;
  viewCount: number;
  coverAlt: string;
  relatedProductSlugs: string[];
  relatedPostSlugs: string[];
  sections: BlogSection[];
};

export type EditorialPressEntryPayload = {
  category: string;
};

export type EditorialContentPayloadByType = {
  blog: EditorialBlogEntryPayload;
  press: EditorialPressEntryPayload;
  faq: EditorialGenericPayload;
  'tech-faq': EditorialGenericPayload;
  glossary: EditorialGenericPayload;
  support: EditorialGenericPayload;
};

export type EditorialContentPayload = EditorialContentPayloadByType[EditorialContentType];

export type AdminEditorialContentEntry<TType extends EditorialContentType = EditorialContentType> = {
  id: string;
  contentType: TType;
  title: string;
  slug: string;
  summary: string | null;
  locale: string;
  status: EditorialEntryStatus;
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: string | null;
  payload: EditorialContentPayloadByType[TType];
  createdAt: string;
  updatedAt: string;
};

export type AdminEditorialBlogEntry = AdminEditorialContentEntry<'blog'>;
export type AdminEditorialPressEntry = AdminEditorialContentEntry<'press'>;

export const defaultEditorialBlogSectionsTemplate: BlogSection[] = [
  {
    id: 'engineering-context',
    title: 'Engineering context',
    blocks: [
      {
        type: 'paragraph',
        text: 'Frame the operating conditions, load profile, and why the design choice matters for OEM selection or line-side troubleshooting.',
      },
      {
        type: 'list',
        items: [
          'State the axis or machine constraint.',
          'List the main sizing or validation checks.',
          'Call out the procurement or deployment risk if the choice is wrong.',
        ],
      },
    ],
  },
  {
    id: 'validation-checks',
    title: 'Validation checks',
    blocks: [
      {
        type: 'table',
        caption: 'Example validation checklist',
        columns: ['Check', 'Why it matters', 'Typical evidence'],
        rows: [
          ['Thermal margin', 'Prevents derating in continuous duty', 'Temperature log or bench result'],
          ['Peak torque reserve', 'Protects startup and disturbance recovery', 'Load profile or torque worksheet'],
          ['Integration handoff', 'Avoids cable, driver, and mounting mismatch', 'CAD, BOM, or wiring review'],
        ],
      },
    ],
  },
];

export function buildBlogPostFromEntry(entry: AdminEditorialBlogEntry): BlogPost {
  return {
    slug: entry.slug,
    title: entry.title,
    summary: entry.summary ?? '',
    seoTitle: entry.seoTitle,
    seoDescription: entry.seoDescription,
    lead: entry.payload.lead,
    category: entry.payload.category,
    productTopics: [...entry.payload.productTopics],
    industry: entry.payload.industry,
    authorId: entry.payload.authorId,
    locale: entry.locale,
    publishedAt: entry.publishedAt ?? entry.updatedAt,
    updatedAt: entry.updatedAt,
    readMinutes: entry.payload.readMinutes,
    viewCount: entry.payload.viewCount,
    coverAlt: entry.payload.coverAlt,
    relatedProductSlugs: [...entry.payload.relatedProductSlugs],
    relatedPostSlugs: [...entry.payload.relatedPostSlugs],
    sections: entry.payload.sections.map((section) => ({
      ...section,
      blocks: section.blocks.map((block) => ({ ...block })),
    })),
  };
}

export function buildPressReleaseFromEntry(entry: AdminEditorialPressEntry): PressRelease {
  const publishedAt = entry.publishedAt ?? entry.updatedAt;
  const publishedDate = new Date(publishedAt);
  const safePublishedDate = Number.isNaN(publishedDate.getTime()) ? new Date(entry.updatedAt) : publishedDate;

  return {
    slug: entry.slug,
    year: safePublishedDate.getUTCFullYear(),
    dateLabel: new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(safePublishedDate),
    title: entry.title,
    summary: entry.summary ?? entry.seoDescription ?? '',
    category: entry.payload.category,
  };
}
