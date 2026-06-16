export type ResourceSection = 'whitepapers' | 'videos' | 'webinars' | 'downloads' | 'cad' | 'datasheet';

export type WebinarStatus = 'upcoming' | 'on-demand';
export type ResourceDownloadKind = 'pdf' | 'zip' | 'txt';

export type ResourceSectionMeta = {
  slug: ResourceSection;
  label: string;
  shortLabel: string;
  description: string;
  eyebrow: string;
};

export type ResourceItem = {
  slug: string;
  title: string;
  section: ResourceSection;
  topic: string;
  productLine: string;
  language: string;
  format: string;
  gated: boolean;
  summary: string;
  sku?: string;
  duration?: string;
  webinarStatus?: WebinarStatus;
  eventDate?: string;
  downloadKind?: ResourceDownloadKind;
  downloadFileName?: string;
};

export const resourceSections: ResourceSectionMeta[] = [
  {
    slug: 'whitepapers',
    label: 'Whitepapers',
    shortLabel: 'Whitepapers',
    eyebrow: 'Technical papers',
    description: 'Application notes, export guidance, and engineering planning documents gated for commercial follow-up.',
  },
  {
    slug: 'videos',
    label: 'Videos',
    shortLabel: 'Videos',
    eyebrow: 'Video briefings',
    description: 'Short-format walkthroughs that mirror the reference layout with 16:9 previews and quick-scan durations.',
  },
  {
    slug: 'webinars',
    label: 'Webinars',
    shortLabel: 'Webinars',
    eyebrow: 'Live and on-demand',
    description: 'Upcoming sessions capture registration intent, while on-demand decks remain available behind a lead gate.',
  },
  {
    slug: 'downloads',
    label: 'Downloads',
    shortLabel: 'Downloads',
    eyebrow: 'Operational files',
    description: 'Operational packs, project templates, and editable checklists used before quote lock or production release.',
  },
  {
    slug: 'cad',
    label: 'CAD Library',
    shortLabel: 'CAD',
    eyebrow: '3D integration',
    description: 'SKU-searchable STEP and integration packages for enclosure checks, bracket fit, and cable routing reviews.',
  },
  {
    slug: 'datasheet',
    label: 'Datasheet Library',
    shortLabel: 'Datasheets',
    eyebrow: 'Technical documents',
    description: 'Datasheets grouped by SKU, product line, and language so engineering teams can download current exports quickly.',
  },
];

export const resourceItems: ResourceItem[] = [
  {
    slug: 'stepper-sizing-whitepaper',
    title: 'Stepper Motor Sizing Whitepaper',
    section: 'whitepapers',
    topic: 'Sizing',
    productLine: 'Stepper Motors',
    language: 'English',
    format: 'PDF',
    gated: true,
    summary: 'Covers torque margin, reflected inertia, duty cycle, and the handoff checklist used before prototype approval.',
    downloadKind: 'pdf',
    downloadFileName: 'stepmotech-stepper-sizing-whitepaper.pdf',
  },
  {
    slug: 'export-compliance-playbook',
    title: 'Export Compliance Playbook',
    section: 'whitepapers',
    topic: 'Compliance',
    productLine: 'Cross-platform',
    language: 'English',
    format: 'PDF',
    gated: true,
    summary: 'Summarizes REACH, RoHS, HS code, and document pack expectations for mixed direct-buy and OEM shipments.',
    downloadKind: 'pdf',
    downloadFileName: 'stepmotech-export-compliance-playbook.pdf',
  },
  {
    slug: 'driver-tuning-video-brief',
    title: 'Driver Current Tuning Video Brief',
    section: 'videos',
    topic: 'Commissioning',
    productLine: 'Drivers',
    language: 'English',
    format: 'Video',
    gated: false,
    summary: 'A quick engineer-to-engineer overview of current limit setup, idle current strategy, and resonance checks.',
    duration: '06:18',
    downloadKind: 'pdf',
    downloadFileName: 'stepmotech-driver-tuning-video-brief.pdf',
  },
  {
    slug: 'linear-stage-integration-video-brief',
    title: 'Linear Stage Integration Video Brief',
    section: 'videos',
    topic: 'Integration',
    productLine: 'Linear Motion',
    language: 'English',
    format: 'Video',
    gated: false,
    summary: 'Highlights mounting stack-up, cable bend radius, and CAD handoff expectations before mechanical freeze.',
    duration: '08:42',
    downloadKind: 'pdf',
    downloadFileName: 'stepmotech-linear-stage-integration-video-brief.pdf',
  },
  {
    slug: 'global-motion-platform-webinar-2026',
    title: 'Global Motion Platform Webinar 2026',
    section: 'webinars',
    topic: 'Roadmap',
    productLine: 'Cross-platform',
    language: 'English',
    format: 'Webinar',
    gated: false,
    summary: 'Preview of upcoming driver, motor, and accessory launches with a live Q&A block for channel and OEM teams.',
    webinarStatus: 'upcoming',
    eventDate: 'Live on 2026-02-18 · 16:00 CST',
  },
  {
    slug: 'robotics-motion-stack-webinar',
    title: 'Robotics Motion Stack Webinar',
    section: 'webinars',
    topic: 'Robotics',
    productLine: 'Closed Loop Systems',
    language: 'English',
    format: 'Webinar Deck',
    gated: true,
    summary: 'On-demand webinar deck covering motor-drive matching, connector strategy, and validation milestones for robotics integrators.',
    webinarStatus: 'on-demand',
    eventDate: 'On-demand replay',
    downloadKind: 'pdf',
    downloadFileName: 'stepmotech-robotics-motion-stack-webinar-deck.pdf',
  },
  {
    slug: 'commissioning-checklist-pack',
    title: 'Commissioning Checklist Pack',
    section: 'downloads',
    topic: 'Commissioning',
    productLine: 'Cross-platform',
    language: 'English',
    format: 'ZIP',
    gated: false,
    summary: 'Downloadable FAT, incoming inspection, and installation checklists used by integrators before sign-off.',
    downloadKind: 'zip',
    downloadFileName: 'stepmotech-commissioning-checklist-pack.zip',
  },
  {
    slug: 'nda-request-template',
    title: 'NDA Request Template',
    section: 'downloads',
    topic: 'Commercial',
    productLine: 'Cross-platform',
    language: 'English',
    format: 'TXT',
    gated: false,
    summary: 'Editable request template used before opening deeper CAD, firmware, or compliance discussions.',
    downloadKind: 'txt',
    downloadFileName: 'stepmotech-nda-request-template.txt',
  },
  {
    slug: 'vxm-17-45ncm-cad-pack',
    title: 'VXM-17-45NCM CAD Pack',
    section: 'cad',
    topic: 'Integration',
    productLine: 'NEMA 17 Stepper Motors',
    language: 'English',
    format: 'STEP / DXF',
    gated: false,
    summary: '3D body, mounting outline, shaft geometry, and lead exit notes for bracket and enclosure validation.',
    sku: 'VXM-17-45NCM',
    downloadKind: 'zip',
    downloadFileName: 'stepmotech-vxm-17-45ncm-cad-pack.zip',
  },
  {
    slug: 'drv-450-ethercat-cad-pack',
    title: 'DRV-450 EtherCAT CAD Pack',
    section: 'cad',
    topic: 'Controls',
    productLine: 'Drivers',
    language: 'English',
    format: 'STEP / PDF',
    gated: true,
    summary: 'Controller envelope, DIN-rail interface, connector keep-outs, and panel spacing notes for cabinet planning.',
    sku: 'DRV-450-EC',
    downloadKind: 'zip',
    downloadFileName: 'stepmotech-drv-450-ethercat-cad-pack.zip',
  },
  {
    slug: 'vxm-17-45ncm-datasheet-en',
    title: 'VXM-17-45NCM Datasheet',
    section: 'datasheet',
    topic: 'Specifications',
    productLine: 'NEMA 17 Stepper Motors',
    language: 'English',
    format: 'PDF',
    gated: false,
    summary: 'Holding torque, winding data, thermal limits, shaft drawing, and ordering notes for the VXM-17-45NCM platform.',
    sku: 'VXM-17-45NCM',
    downloadKind: 'pdf',
    downloadFileName: 'stepmotech-vxm-17-45ncm-datasheet-en.pdf',
  },
  {
    slug: 'vxm-23-240ncm-datasheet-en',
    title: 'VXM-23-240NCM Datasheet',
    section: 'datasheet',
    topic: 'Specifications',
    productLine: 'NEMA 23 Stepper Motors',
    language: 'English',
    format: 'PDF',
    gated: false,
    summary: 'Covers electrical data, recommended driver pairing, dimensions, inertia, and matching gearbox options.',
    sku: 'VXM-23-240NCM',
    downloadKind: 'pdf',
    downloadFileName: 'stepmotech-vxm-23-240ncm-datasheet-en.pdf',
  },
  {
    slug: 'vxm-23-240ncm-datasheet-zh',
    title: 'VXM-23-240NCM Datasheet CN',
    section: 'datasheet',
    topic: 'Specifications',
    productLine: 'NEMA 23 Stepper Motors',
    language: 'Chinese',
    format: 'PDF',
    gated: false,
    summary: 'Chinese-language export of the same VXM-23-240NCM data pack for local engineering and sourcing review.',
    sku: 'VXM-23-240NCM',
    downloadKind: 'pdf',
    downloadFileName: 'stepmotech-vxm-23-240ncm-datasheet-zh.pdf',
  },
];

export function getResourceSectionMeta(section: ResourceSection) {
  return resourceSections.find((item) => item.slug === section);
}

export function getResourceItemsBySection(section: ResourceSection) {
  return resourceItems.filter((item) => item.section === section);
}

export function getResourceItemBySlug(slug: string) {
  return resourceItems.find((item) => item.slug === slug);
}

export function getResourceFilters(resources: ResourceItem[]) {
  const topics = Array.from(new Set(resources.map((resource) => resource.topic))).sort((left, right) => left.localeCompare(right));
  const productLines = Array.from(new Set(resources.map((resource) => resource.productLine))).sort((left, right) => left.localeCompare(right));
  const languages = Array.from(new Set(resources.map((resource) => resource.language))).sort((left, right) => left.localeCompare(right));
  const formats = Array.from(new Set(resources.map((resource) => resource.format))).sort((left, right) => left.localeCompare(right));

  return { topics, productLines, languages, formats };
}