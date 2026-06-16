import 'server-only';

import type { SupportPage } from '@/server/storefront/types';
import { supportPages } from '@/server/storefront/site-shell';

export type SupportCatalog = {
  sourceMode: 'code-seeded' | 'admin-managed';
  pages: SupportPage[];
};

function cloneSupportPage(page: SupportPage): SupportPage {
  return {
    slug: page.slug,
    title: page.title,
    eyebrow: page.eyebrow,
    description: page.description,
    primaryAction: page.primaryAction ? { ...page.primaryAction } : undefined,
    secondaryAction: page.secondaryAction ? { ...page.secondaryAction } : undefined,
    sections: page.sections.map((section) => ({
      title: section.title,
      paragraphs: section.paragraphs ? [...section.paragraphs] : undefined,
      bullets: section.bullets ? [...section.bullets] : undefined,
    })),
  };
}

export async function getSupportCatalog(): Promise<SupportCatalog> {
  return {
    sourceMode: 'code-seeded',
    pages: supportPages.map(cloneSupportPage),
  };
}

export async function getSupportPageBySlug(slug: string) {
  const catalog = await getSupportCatalog();
  return catalog.pages.find((page) => page.slug === slug) ?? null;
}