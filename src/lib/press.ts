export type PressRelease = {
  slug: string;
  year: number;
  dateLabel: string;
  title: string;
  summary: string;
  category: string;
};

export function createPressReleaseSlug(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'press-release';
}

function makePressRelease(seed: Omit<PressRelease, 'slug'> & { slug?: string }): PressRelease {
  return {
    ...seed,
    slug: seed.slug ?? createPressReleaseSlug(seed.title),
  };
}

export const pressReleases: PressRelease[] = [
  makePressRelease({
    year: 2026,
    dateLabel: 'May 2026',
    title: 'STEPMOTECH expands company pages for certifications, channel, and factory transparency',
    summary: 'The storefront now exposes clearer certification, distributor, factory, and career routes so buyers and media teams can navigate company context without leaving the site.',
    category: 'Company update',
  }),
  makePressRelease({
    year: 2026,
    dateLabel: 'March 2026',
    title: 'Global support and shipping content refreshed for catalog and RFQ buyers',
    summary: 'Support pages were reorganized around help-center, after-sales, shipping, and returns workflows to reduce ambiguity for logistics and service cases.',
    category: 'Support / logistics',
  }),
  makePressRelease({
    year: 2025,
    dateLabel: 'November 2025',
    title: 'Factory-direct product and documentation model unified across catalog and inquiry flows',
    summary: 'The commerce stack now uses one product model for buy-now items, documentation downloads, and engineering-led inquiry handoff.',
    category: 'Product / operations',
  }),
  makePressRelease({
    year: 2025,
    dateLabel: 'July 2025',
    title: 'StepMotech highlights global automation positioning and partner-ready brand story',
    summary: 'Brand and company messaging were updated to support distributor, OEM, and media conversations around industrial motion sourcing.',
    category: 'Brand',
  }),
];

export const pressBoilerplate = 'STEPMOTECH is a factory-direct motion brand focused on stepper motors, drivers, linear actuators, and matched accessories for automation, robotics, and equipment builders.';

export const mediaKitContents = [
  'brand-boilerplate.txt',
  'logo-usage-guide.txt',
  'executive-profile-summary.txt',
  'press-contact.txt',
] as const;