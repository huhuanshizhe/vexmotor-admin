import 'server-only';

import {
  glossaryTerms,
  storefrontFaqs,
  techFaqCategories,
  techFaqEntries,
  type GlossaryTerm,
  type StorefrontFaq,
  type TechFaqCategory,
  type TechFaqEntry,
} from '@/lib/knowledge';

export type KnowledgeCatalog = {
  sourceMode: 'code-seeded' | 'admin-managed';
  glossaryTerms: GlossaryTerm[];
  storefrontFaqs: StorefrontFaq[];
  techFaqCategories: TechFaqCategory[];
  techFaqEntries: TechFaqEntry[];
};

export async function getKnowledgeCatalog(): Promise<KnowledgeCatalog> {
  return {
    sourceMode: 'code-seeded',
    glossaryTerms: [...glossaryTerms],
    storefrontFaqs: [...storefrontFaqs],
    techFaqCategories: [...techFaqCategories],
    techFaqEntries: [...techFaqEntries],
  };
}