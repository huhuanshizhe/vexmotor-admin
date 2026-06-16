import type { StorefrontCompatibleGroup, StorefrontProductCard } from '@/server/storefront';

export type DetailCompatibleGroup = {
  title: string;
  description: string;
  badge: string;
  items: StorefrontProductCard[];
};

export const COMPATIBLE_DESCRIPTIONS: Record<string, string> = {
  drivers: 'Control-side matches typically shortlisted next to this SKU.',
  'mechanical-integration': 'Mounting and motion-transfer components frequently paired with the same family.',
  'power-control': 'Power, wiring, and remaining control accessories for system-level planning.',
  custom: 'Compatible accessories and components for system-level planning.',
};

export const COMPATIBLE_BADGES: Record<string, string> = {
  drivers: 'Adds compatibility check',
  'mechanical-integration': 'Mechanical fit',
  'power-control': 'System fit',
  custom: 'Compatible',
};

export function buildCompatibleGroups(
  explicitGroups: StorefrontCompatibleGroup[],
  fallbackProducts: StorefrontProductCard[],
): DetailCompatibleGroup[] {
  // Use manually configured groups if available
  if (explicitGroups.length > 0) {
    return explicitGroups.map((group) => ({
      title: group.title,
      description: COMPATIBLE_DESCRIPTIONS[group.relationType] ?? COMPATIBLE_DESCRIPTIONS.custom,
      badge: COMPATIBLE_BADGES[group.relationType] ?? COMPATIBLE_BADGES.custom,
      items: group.items.slice(0, 3),
    }));
  }

  // Fallback: regex-based auto-grouping
  const groups: Array<DetailCompatibleGroup & { matcher: RegExp }> = [
    {
      title: 'Drivers',
      description: 'Control-side matches typically shortlisted next to this SKU.',
      badge: 'Adds compatibility check',
      matcher: /(driver|controller)/i,
      items: [],
    },
    {
      title: 'Mechanical integration',
      description: 'Mounting and motion-transfer components frequently paired with the same family.',
      badge: 'Mechanical fit',
      matcher: /(bracket|gear|shaft|linear|coupling)/i,
      items: [],
    },
    {
      title: 'Power & control',
      description: 'Power, wiring, and remaining control accessories for system-level planning.',
      badge: 'System fit',
      matcher: /(power|supply|cable|connector|encoder)/i,
      items: [],
    },
  ];
  const seen = new Set<string>();

  for (const item of fallbackProducts) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    const haystack = `${item.name} ${item.slug}`;
    const targetGroup = groups.find((group) => group.matcher.test(haystack)) ?? groups[groups.length - 1];
    if (targetGroup.items.length < 3) targetGroup.items.push(item);
  }

  return groups.filter((group) => group.items.length).map(({ matcher, ...group }) => group);
}
