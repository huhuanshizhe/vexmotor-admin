export type CareerValue = {
  title: string;
  detail: string;
};

export type CareerRole = {
  slug: string;
  title: string;
  department: string;
  location: string;
  remoteMode: string;
  type: string;
  summary: string;
  responsibilities: string[];
  requirements: string[];
  compensation: string;
  applyEmail: string;
};

export const careerValues: CareerValue[] = [
  {
    title: 'Precision',
    detail: 'We value careful execution, documentation discipline, and engineering decisions that hold up under real buyer scrutiny.',
  },
  {
    title: 'Ownership',
    detail: 'Roles are expected to move work across sales, operations, engineering, and support instead of handing off half-finished context.',
  },
  {
    title: 'Customer context',
    detail: 'The company works best when teams understand how catalog buyers, RFQ programs, and distributors actually use the motion stack.',
  },
  {
    title: 'Sustainable growth',
    detail: 'We build repeatable systems for channel, production, and support rather than relying on one-off heroics.',
  },
];

export const careerBenefits = [
  'Cross-functional exposure to commerce, factory operations, export logistics, and technical support.',
  'Structured onboarding with product-family, application, and documentation training.',
  'Flexible collaboration across Hong Kong and remote-support windows for selected roles.',
  'Opportunity to shape how a factory-direct motion brand scales its global channel and content system.',
] as const;

export const careerHiringProcess = [
  'Initial screen to confirm role fit, market context, and communication style.',
  'Functional review with the hiring owner using real workflow or case-study discussion.',
  'Cross-team interview focused on collaboration, ownership, and execution quality.',
  'Offer, onboarding plan, and role-specific training path.',
] as const;

export const careerRoles: CareerRole[] = [
  {
    slug: 'channel-sales-manager-apac',
    title: 'Channel Sales Manager, APAC',
    department: 'Sales / Channel',
    location: 'Hong Kong',
    remoteMode: 'Hybrid',
    type: 'Full-time',
    summary: 'Own distributor growth across selected APAC markets, help partners ramp the catalog, and coordinate opening-order plans with operations and support.',
    responsibilities: [
      'Build and manage distributor and reseller relationships across selected APAC territories.',
      'Coordinate pricing, margin review, launch bundles, and pipeline follow-up with the commercial team.',
      'Translate partner feedback into product, marketing, and logistics actions that can actually ship.',
      'Support trade-show, campaign, and co-marketing execution with regional channel partners.',
    ],
    requirements: [
      'Experience in industrial distribution, motion control, automation components, or a similar B2B channel environment.',
      'Strong written and verbal communication for partner follow-up, commercial review, and cross-team coordination.',
      'Comfort working across SKU-heavy catalogs, technical sales context, and export-aware commercial workflows.',
    ],
    compensation: 'Base salary + performance incentive aligned to regional channel goals.',
    applyEmail: 'support@stepmotech.online',
  },
  {
    slug: 'motion-application-engineer',
    title: 'Motion Application Engineer',
    department: 'Engineering / Support',
    location: 'Hong Kong',
    remoteMode: 'On-site with overlap support windows',
    type: 'Full-time',
    summary: 'Help buyers and partners size motors, drivers, and accessory stacks while improving the documents, selector logic, and troubleshooting paths behind the storefront.',
    responsibilities: [
      'Review application context for torque, wiring, controller compatibility, and duty-cycle questions.',
      'Support sample qualification, distributor enablement, and post-sale technical handoff when cases need engineering depth.',
      'Improve selector logic, documentation sets, and support references based on real issue patterns.',
      'Work with factory and channel teams to close the loop between product behavior and customer guidance.',
    ],
    requirements: [
      'Hands-on understanding of stepper motors, drivers, motion-control systems, or adjacent industrial hardware.',
      'Ability to explain technical tradeoffs clearly to both internal teams and external customers.',
      'Comfort turning repeated support patterns into clearer tools, documents, and qualification flows.',
    ],
    compensation: 'Competitive salary with role-based bonus tied to execution and support quality.',
    applyEmail: 'support@stepmotech.online',
  },
  {
    slug: 'supply-chain-planner',
    title: 'Supply Chain Planner',
    department: 'Operations / Supply Chain',
    location: 'Hong Kong',
    remoteMode: 'On-site',
    type: 'Full-time',
    summary: 'Plan stocked-catalog replenishment, sample readiness, and opening orders so commercial promises stay aligned with real factory and warehouse capacity.',
    responsibilities: [
      'Coordinate forecast input from catalog demand, RFQ conversion, and distributor onboarding plans.',
      'Manage replenishment priorities across motors, drivers, power supplies, and matched accessories.',
      'Work with warehouse, factory, and support teams to keep lead-time signals accurate on the storefront.',
      'Flag supply or logistics risks early enough for channel and support teams to respond clearly.',
    ],
    requirements: [
      'Experience in supply planning, purchasing, inventory control, or operations inside a hardware business.',
      'Comfort with SKU-level planning, lead-time analysis, and cross-team coordination.',
      'Clear communication when capacity or material constraints affect customer commitments.',
    ],
    compensation: 'Salary package based on planning scope and execution responsibility.',
    applyEmail: 'support@stepmotech.online',
  },
];

export function getCareerRoleBySlug(slug: string) {
  return careerRoles.find((role) => role.slug === slug) ?? null;
}