export type DistributorProgramHighlight = {
  title: string;
  detail: string;
};

export type DistributorCoverage = {
  id: string;
  region: string;
  desk: string;
  warehouse: string;
  lead: string;
  countries: string[];
  note: string;
};

export const distributorProgramHighlights: DistributorProgramHighlight[] = [
  {
    title: 'Margin planning',
    detail: 'Channel-friendly pricing review, volume planning, and deal-registration style coordination for qualified regional partners.',
  },
  {
    title: 'Training enablement',
    detail: 'Application guidance, SKU-family mapping, and onboarding support for teams that need to sell with technical accuracy.',
  },
  {
    title: 'Co-marketing support',
    detail: 'Shared campaign themes, launch bundles, and content support for partners building a visible local channel presence.',
  },
];

export const distributorCoverage: DistributorCoverage[] = [
  {
    id: 'north-america',
    region: 'North America',
    desk: 'US and Canada channel desk',
    warehouse: 'Technical Support Center & Warehouse',
    lead: 'English commercial support with stocked-catalog routing',
    countries: ['United States', 'Canada', 'Mexico'],
    note: 'Best fit for catalog replenishment, OEM line support, and channel requests that depend on North America shipping visibility.',
  },
  {
    id: 'europe',
    region: 'Europe',
    desk: 'DACH and EU partner route',
    warehouse: 'Operate Center with export-compliance handoff',
    lead: 'EU market-entry support and distributor onboarding review',
    countries: ['Germany', 'France', 'Spain', 'Italy', 'Netherlands', 'Poland', 'United Kingdom'],
    note: 'Used when buyers need VAT-aware routing, certification handoff, and a repeatable partner-contact path across Europe.',
  },
  {
    id: 'apac',
    region: 'Asia Pacific',
    desk: 'APAC reseller and OEM channel desk',
    warehouse: 'Factory-direct planning with regional logistics review',
    lead: 'Fast engineering context for reseller, integrator, and OEM partner discussions',
    countries: ['China', 'Japan', 'South Korea', 'Singapore', 'Australia', 'India'],
    note: 'Strongest when the distributor conversation overlaps with sample builds, regional integration support, or export-document planning.',
  },
  {
    id: 'latin-america',
    region: 'Latin America',
    desk: 'LATAM growth-market route',
    warehouse: 'Global support lane with customs-first coordination',
    lead: 'Channel intake for import-sensitive and documentation-heavy markets',
    countries: ['Brazil', 'Chile', 'Colombia', 'Peru'],
    note: 'Suited for partners who need closer customs coordination and structured commercial follow-up before stocking decisions.',
  },
  {
    id: 'mea',
    region: 'Middle East & Africa',
    desk: 'MEA regional partner route',
    warehouse: 'Operate Center with export review escalation',
    lead: 'Partner screening for cross-border projects and industrial supply programs',
    countries: ['United Arab Emirates', 'Saudi Arabia', 'South Africa', 'Egypt', 'Turkey'],
    note: 'Works best for markets where distributor onboarding often includes importer, end-use, or documentation checks before first orders.',
  },
];

export const distributorPortalHighlights = [
  'Current portal access uses the existing business-account login and account center while a dedicated channel portal is still being wired.',
  'Portal users can continue to sign in for account history, order visibility, inquiry follow-up, and saved sourcing activity.',
  'New partner applications should still start with the distributor intake form so the commercial team can approve routing first.',
] as const;

export const distributorApplicationChecklist = [
  'Primary markets, countries, and channel model you want to cover.',
  'Product families you plan to stock or promote first.',
  'Typical customer profile: distributor, systems integrator, OEM, education, or mixed channel.',
  'Expected annual volume and any support needed for launch, training, or co-marketing.',
] as const;

export const distributorProgramSupport = [
  'Commercial review for margin structure, sample strategy, and opening-order planning.',
  'Sales and technical enablement so local teams can recommend the right motor and driver families.',
  'Coordinated content support for campaigns, launch promotions, and buyer-facing documentation packs.',
] as const;