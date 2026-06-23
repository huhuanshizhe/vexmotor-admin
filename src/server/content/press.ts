import 'server-only';

import { mediaKitContents, pressBoilerplate, pressReleases, type PressRelease } from '@/lib/press';

export type PressCatalog = {
  sourceMode: 'code-seeded' | 'admin-managed';
  boilerplate: string;
  mediaKitContents: string[];
  releases: PressRelease[];
};

export async function getPressCatalog(_locale = 'en-US'): Promise<PressCatalog> {
  return {
    sourceMode: 'code-seeded',
    boilerplate: pressBoilerplate,
    mediaKitContents: [...mediaKitContents],
    releases: [...pressReleases].sort((left, right) => {
      if (left.year !== right.year) {
        return right.year - left.year;
      }

      return left.title.localeCompare(right.title);
    }),
  };
}