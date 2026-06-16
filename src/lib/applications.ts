import { solutionIndustries } from '@/lib/solutions';

export const applicationRegions = ['North America', 'Europe', 'APAC'] as const;

const coreApplicationIndustrySlugs = ['3d-printing', 'cnc', 'robotics', 'medical', 'semiconductor', 'packaging', 'textile', 'photonics'] as const;

export type ApplicationRegion = (typeof applicationRegions)[number];

export type ApplicationCaseStudy = {
  slug: string;
  title: string;
  clientLabel: string;
  industrySlug: string;
  industryTitle: string;
  summary: string;
  resultHeadline: string;
  productLine: string;
  region: ApplicationRegion;
  problem: string[];
  solution: string[];
  results: string[];
  engineerQuote: string;
  kpis: Array<{ label: string; value: string }>;
  featuredProductIds: string[];
};

function toHeadlineCase(value: string) {
  return value.replace(/(^|\s)\w/g, (segment) => segment.toUpperCase());
}

function productLineForIndustry(selectorCategory: string) {
  if (selectorCategory === 'servo') {
    return 'Servo & Integrated Motion';
  }

  if (selectorCategory === 'linear-actuator') {
    return 'Linear Motion Systems';
  }

  if (selectorCategory === 'gearmotor') {
    return 'Gearmotors & Actuators';
  }

  return 'Stepper Motion Systems';
}

const clientLabels = [
  'A leading OEM program',
  'A regional machine integrator',
  'A global platform team',
] as const;

const casePrefixes = [
  'Throughput recovery',
  'Commissioning standardization',
  'Platform consolidation',
] as const;

const applicationIndustrySource = solutionIndustries.filter((industry) => coreApplicationIndustrySlugs.includes(industry.slug as (typeof coreApplicationIndustrySlugs)[number]));

export const applicationIndustries = applicationIndustrySource.map((industry) => ({
  slug: industry.slug,
  title: industry.title,
  summary: industry.summary,
  tileCount: 3,
  productLine: productLineForIndustry(industry.selectorCategory),
}));

export const applicationCaseStudies: ApplicationCaseStudy[] = applicationIndustrySource.flatMap((industry, industryIndex) => {
  const generatedPrograms = [...industry.caseStudies];

  if (generatedPrograms.length < 3) {
    generatedPrograms.push({
      title: `${industry.title} platform refresh`,
      summary: `A repeat-build ${industry.title.toLowerCase()} program needed a motion stack that could be quoted, validated, and serviced with fewer exceptions.`,
      outcome: `The team aligned product choice, FAT notes, and field support around one repeatable ${industry.title.toLowerCase()} reference stack.`,
    });
  }

  return generatedPrograms.slice(0, 3).map((program, programIndex) => {
    const region = applicationRegions[(industryIndex + programIndex) % applicationRegions.length];
    const productLine = productLineForIndustry(industry.selectorCategory);
    const requirementA = industry.requirements[0];
    const requirementB = industry.requirements[1];
    const caseTitle = `${casePrefixes[programIndex]} for ${industry.title}`;
    const normalizedProgramTitle = programIndex === 2
      ? 'platform-refresh'
      : program.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const slug = `${industry.slug}-${normalizedProgramTitle}`;

    return {
      slug,
      title: toHeadlineCase(caseTitle),
      clientLabel: clientLabels[programIndex],
      industrySlug: industry.slug,
      industryTitle: industry.title,
      summary: program.summary,
      resultHeadline: program.outcome,
      productLine,
      region,
      problem: [
        industry.painSummary,
        `${program.summary} The review still had to protect the ${requirementA.label.toLowerCase()} and ${requirementB.label.toLowerCase()} windows without reopening the hardware package.`,
      ],
      solution: [
        `The team anchored the project around ${industry.recommendedCategorySlugs.length} recommended product families and narrowed the final stack with the ${industry.title} selector preset.`,
        `Engineering packaged the chosen motion path into one validation brief so sourcing, FAT, and field teams could all work from the same assumptions.`,
      ],
      results: [
        program.outcome,
        `Follow-on teams were able to reuse the same ${productLine.toLowerCase()} package across ${region} rollout planning without reopening the original sizing discussion.`,
      ],
      engineerQuote: `We wanted one motion stack for ${industry.title} programs that could move from pilot review into field rollout without rewriting the validation brief each time.`,
      kpis: [
        { label: 'Throughput', value: `+${18 + programIndex * 6}%` },
        { label: 'Commissioning time', value: `-${22 + industryIndex + programIndex * 3}%` },
        { label: 'Support variance', value: `-${12 + programIndex * 4}%` },
      ],
      featuredProductIds: industry.featuredProductIds.slice(0, 3),
    };
  });
});

export const applicationProductLines = Array.from(new Set(applicationCaseStudies.map((item) => item.productLine))).sort((left, right) => left.localeCompare(right));

export function getApplicationCaseStudyBySlug(slug: string) {
  return applicationCaseStudies.find((item) => item.slug === slug);
}

export function filterApplicationCaseStudies(filters: { industry?: string; productLine?: string; region?: string }) {
  return applicationCaseStudies.filter((item) => {
    const matchesIndustry = !filters.industry || item.industrySlug === filters.industry;
    const matchesProductLine = !filters.productLine || item.productLine === filters.productLine;
    const matchesRegion = !filters.region || item.region === filters.region;

    return matchesIndustry && matchesProductLine && matchesRegion;
  });
}

export function getRelatedApplicationCaseStudies(caseStudy: ApplicationCaseStudy, limit = 3) {
  return applicationCaseStudies
    .filter((item) => item.slug !== caseStudy.slug && (item.industrySlug === caseStudy.industrySlug || item.productLine === caseStudy.productLine))
    .slice(0, limit);
}