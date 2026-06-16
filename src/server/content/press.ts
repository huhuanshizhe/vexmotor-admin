import 'server-only';

import { buildPressReleaseFromEntry } from '@/lib/editorial-content';
import { mediaKitContents, pressBoilerplate, pressReleases, type PressRelease } from '@/lib/press';
import { getPublishedAdminEditorialPressEntries } from '@/server/admin/editorial-content';

export type PressCatalog = {
  sourceMode: 'code-seeded' | 'admin-managed';
  boilerplate: string;
  mediaKitContents: string[];
  releases: PressRelease[];
};

export async function getPressCatalog(locale = 'en-US'): Promise<PressCatalog> {
  const adminEntries = await getPublishedAdminEditorialPressEntries(locale);
  const mergedReleases = new Map(pressReleases.map((release) => [release.slug, release]));

  for (const entry of adminEntries) {
    mergedReleases.set(entry.slug, buildPressReleaseFromEntry(entry));
  }

  return {
    sourceMode: adminEntries.length ? 'admin-managed' : 'code-seeded',
    boilerplate: pressBoilerplate,
    mediaKitContents: [...mediaKitContents],
    releases: Array.from(mergedReleases.values()).sort((left, right) => {
      if (left.year !== right.year) {
        return right.year - left.year;
      }

      return left.title.localeCompare(right.title);
    }),
  };
}