/* ────────────────────────────────────────────────────────────
   Blog data model — restructured for SEO & professional trust
   ──────────────────────────────────────────────────────────── */

// ── Primary classification: Content category ──
export const blogCategories = ['Technical Guide', 'Application Note', 'Tutorial', 'News & Updates'] as const;
export type BlogCategory = (typeof blogCategories)[number];

export const blogCategorySlug: Record<BlogCategory, string> = {
  'Technical Guide': 'technical-guide',
  'Application Note': 'application-note',
  'Tutorial': 'tutorial',
  'News & Updates': 'news',
};

export const blogCategoryFromSlug: Record<string, BlogCategory> = Object.fromEntries(
  Object.entries(blogCategorySlug).map(([key, value]) => [value, key as BlogCategory]),
);

// ── Secondary dimension: Product topic (for hub pages) ──
export const blogProductTopics = ['Stepper Motor', 'BLDC Motor', 'Servo & Integrated', 'Drivers & Power'] as const;
export type BlogProductTopic = (typeof blogProductTopics)[number];

export const blogProductTopicSlug: Record<BlogProductTopic, string> = {
  'Stepper Motor': 'stepper-motor',
  'BLDC Motor': 'bldc-motor',
  'Servo & Integrated': 'servo-integrated',
  'Drivers & Power': 'drivers-power',
};

export const blogProductTopicFromSlug: Record<string, BlogProductTopic> = Object.fromEntries(
  Object.entries(blogProductTopicSlug).map(([key, value]) => [value, key as BlogProductTopic]),
);

// ── Industry (unchanged) ──
export const blogIndustries = ['Factory Automation', 'Robotics', 'Medical Devices', 'Packaging', 'CNC', 'Lab Automation'] as const;
export type BlogIndustry = (typeof blogIndustries)[number];

// ── Authors ──
export type BlogAuthor = {
  id: string;
  name: string;
  role: string;
  bio: string;
};

export const blogAuthors: BlogAuthor[] = [
  {
    id: 'lena-zhou',
    name: 'Lena Zhou',
    role: 'Motion Applications Engineer',
    bio: 'Lena works across sizing, thermal validation, and launch enablement for OEM stepper and integrated motion programs.',
  },
  {
    id: 'marco-hein',
    name: 'Marco Hein',
    role: 'Drive Systems Architect',
    bio: 'Marco focuses on driver tuning, industrial Ethernet integration, and test workflows for distributed motion systems.',
  },
  {
    id: 'irene-park',
    name: 'Irene Park',
    role: 'Industrial Market Lead',
    bio: 'Irene translates customer demand from packaging, robotics, and medical programs into repeatable catalog and OEM content.',
  },
];

// ── Content blocks ──
export type BlogBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'code'; language: string; code: string }
  | { type: 'table'; caption: string; columns: string[]; rows: string[][] }
  | { type: 'product'; productSlug: string; eyebrow: string; body: string };

export type BlogSection = {
  id: string;
  title: string;
  blocks: BlogBlock[];
};

// ── Blog post type ──
export type BlogPost = {
  slug: string;
  title: string;
  summary: string;
  seoTitle: string | null;
  seoDescription: string | null;
  lead: string;
  category: BlogCategory;
  productTopics: BlogProductTopic[];
  industry: BlogIndustry;
  authorId: string;
  locale: string;
  publishedAt: string;
  updatedAt: string;
  readMinutes: number;
  viewCount: number;
  coverAlt: string;
  relatedProductSlugs: string[];
  relatedPostSlugs: string[];
  sections: BlogSection[];
};

// ── Helper ──
function makePost(seed: Omit<BlogPost, 'coverAlt' | 'seoTitle' | 'seoDescription' | 'locale' | 'updatedAt'>): BlogPost {
  return {
    ...seed,
    seoTitle: seed.title,
    seoDescription: seed.summary,
    locale: 'en-US',
    updatedAt: seed.publishedAt,
    coverAlt: `${seed.title} — STEPMOTECH engineering article`,
  };
}

// ════════════════════════════════════════════════════════════
// Seed blog posts
// ════════════════════════════════════════════════════════════

export const blogPosts: BlogPost[] = [
  // ── 1. Stepper Torque Margin for Packaging Axes ──
  makePost({
    slug: 'stepper-torque-margin-for-packaging-axes',
    title: 'Stepper Torque Margin for Packaging Axes',
    summary: 'How to keep a packaging axis stable when acceleration targets, ambient swings, and cable drag all move at once.',
    lead: 'Packaging teams often oversize motors to stay safe, but the better move is to track reflected inertia, duty cycle, and cable drag as one system.',
    category: 'Application Note',
    productTopics: ['Stepper Motor', 'Drivers & Power'],
    industry: 'Packaging',
    authorId: 'lena-zhou',
    publishedAt: '2026-04-12',
    readMinutes: 6,
    viewCount: 1890,
    relatedProductSlugs: ['17-single-shaft-bipolar-stepper-motor-45ncm', '23-stepper-motor-240ncm'],
    relatedPostSlugs: ['driver-current-loop-checks-before-fat', 'when-to-pick-an-integrated-motion-assembly'],
    sections: [
      {
        id: 'what-changes-when-lines-speed-up',
        title: 'What changes when packaging lines speed up',
        blocks: [
          { type: 'paragraph', text: 'Teams usually discover the real torque problem after cartons, pusher arms, and cable carriers are all on the same move profile. A static nameplate number is not enough.' },
          { type: 'paragraph', text: 'We review margin in three windows: launch current, sustained thermal load, and recovery after a stop-start event. That keeps quoting and mechanical review aligned.' },
          { type: 'list', items: [
            'Model reflected inertia before increasing motor frame size.',
            'Check the torque reserve after cable drag and spring loads are added.',
            'Thermal headroom matters more than peak torque when the line runs continuously.',
          ]},
        ],
      },
      {
        id: 'sizing-checkpoints',
        title: 'Sizing checkpoints',
        blocks: [{
          type: 'table',
          caption: 'A compact checklist used before prototype approval.',
          columns: ['Checkpoint', 'Target', 'Reason'],
          rows: [
            ['Reflected inertia ratio', '< 8:1', 'Keeps the drive from chasing unstable settling.'],
            ['Duty-cycle thermal rise', '< 80% of limit', 'Leaves room for summer ambient swing.'],
            ['Recovery after jam clear', '< 2 cycles', 'Prevents manual reset after short line stops.'],
          ],
        }],
      },
      {
        id: 'torque-margin-logging',
        title: 'Reference snippet for margin logging',
        blocks: [{ type: 'code', language: 'ts', code: "const margin = (availableTorqueNm - demandTorqueNm) / demandTorqueNm;\nif (margin < 0.25) {\n  throw new Error('Increase motor size or reduce acceleration.');\n}\nconsole.log(`Torque margin: ${(margin * 100).toFixed(1)}%`);" }],
      },
    ],
  }),

  // ── 2. BLDC Acoustic Tuning for Medical Devices ──
  makePost({
    slug: 'bldc-acoustic-tuning-for-medical-devices',
    title: 'BLDC Acoustic Tuning for Medical Devices',
    summary: 'A practical checklist for lowering audible signature without sacrificing closed-loop stability.',
    lead: 'Medical device teams rarely care about peak speed first. What they notice is audible roughness during dwell, low-speed creep, and door-open service states.',
    category: 'Technical Guide',
    productTopics: ['BLDC Motor'],
    industry: 'Medical Devices',
    authorId: 'marco-hein',
    publishedAt: '2026-03-28',
    readMinutes: 7,
    viewCount: 1675,
    relatedProductSlugs: ['integrated-motion-assembly-oem', 'switching-power-supply-48v-10a'],
    relatedPostSlugs: ['servo-bandwidth-targets-for-robotic-joints', 'driver-current-loop-checks-before-fat'],
    sections: [
      {
        id: 'noise-starts-in-control-loop',
        title: 'Noise usually starts in the control loop',
        blocks: [
          { type: 'paragraph', text: 'The acoustic story is shaped by commutation strategy, current ripple, and mechanical resonance together. Moving only one variable seldom fixes the symptom.' },
          { type: 'paragraph', text: 'For regulated device programs, we log the acoustic state in the same worksheet as thermal rise and speed regulation so validation teams can compare revisions directly.' },
          { type: 'list', items: [
            'Tune low-speed commutation before chasing enclosure damping.',
            'Log idle-state noise and loaded-state noise separately.',
            'Keep the PSU ripple review inside the same validation pack.',
          ]},
        ],
      },
      {
        id: 'acoustic-validation',
        title: 'Acoustic validation pack',
        blocks: [{
          type: 'table',
          caption: 'The review pack used before pilot release.',
          columns: ['Mode', 'Measure', 'Watch-out'],
          rows: [
            ['Dwell', 'A-weighted noise', 'Unexpected whine during hold current.'],
            ['Creep', 'Velocity ripple', 'Visible surging in imaging or dosing paths.'],
            ['Start/stop', 'Recovery time', 'Unstable loop after repeated short strokes.'],
          ],
        }],
      },
      {
        id: 'drive-side-logging',
        title: 'Drive-side logging example',
        blocks: [{ type: 'code', language: 'json', code: '{\n  "mode": "low-speed-creep",\n  "busVoltage": 48,\n  "phaseCurrentA": 1.9,\n  "noiseDbA": 37.4,\n  "velocityRipplePct": 1.8\n}' }],
      },
    ],
  }),

  // ── 3. Servo Bandwidth Targets for Robotic Joints ──
  makePost({
    slug: 'servo-bandwidth-targets-for-robotic-joints',
    title: 'Servo Bandwidth Targets for Robotic Joints',
    summary: 'Set bandwidth targets that survive real payload, cable drag, and gear compliance instead of only lab-bench conditions.',
    lead: 'Servo loops can look perfect on a rigid bench and unravel after the harness, payload, and actual gearbox lash arrive. The target has to be workload-aware.',
    category: 'Technical Guide',
    productTopics: ['Servo & Integrated'],
    industry: 'Robotics',
    authorId: 'marco-hein',
    publishedAt: '2026-03-11',
    readMinutes: 8,
    viewCount: 2142,
    relatedProductSlugs: ['23-stepper-motor-240ncm', 'integrated-motion-assembly-oem'],
    relatedPostSlugs: ['bldc-acoustic-tuning-for-medical-devices', 'when-to-pick-an-integrated-motion-assembly'],
    sections: [
      {
        id: 'bandwidth-on-real-joint',
        title: 'Bandwidth must be measured on the real joint',
        blocks: [
          { type: 'paragraph', text: 'Joint bandwidth is constrained by compliance, encoder placement, and the move profile that matters in production. Bench-only figures mislead the quoting phase.' },
          { type: 'paragraph', text: 'We separate target bandwidth into command-following, disturbance rejection, and recovery after payload swing so controls and mechanics can tune against the same brief.' },
          { type: 'list', items: [
            'Validate with the actual harness and mounting stack, not a shortened test rig.',
            'Track position error under disturbance, not only under command input.',
            'Record gain windows that remain stable across temperature spread.',
          ]},
        ],
      },
      {
        id: 'joint-tuning-windows',
        title: 'Joint tuning windows',
        blocks: [{
          type: 'table',
          caption: 'Use one worksheet for controls, mechanics, and production FAT.',
          columns: ['Window', 'Goal', 'Failure sign'],
          rows: [
            ['Command following', '< 5% overshoot', 'Oscillation on short point-to-point moves.'],
            ['Disturbance rejection', '< 0.8 deg drift', 'Payload bump causes visible lag.'],
            ['Thermal drift', 'Stable after 20 min', 'Retune required after warm-up.'],
          ],
        }],
      },
      {
        id: 'loop-check-pseudocode',
        title: 'Loop-check pseudocode',
        blocks: [{ type: 'code', language: 'ts', code: "const stable = overshoot < 0.05 && settlingMs < 80 && disturbanceDriftDeg < 0.8;\nreturn stable ? 'ready-for-fat' : 'retune-with-payload';" }],
      },
    ],
  }),

  // ── 4. Driver Current Loop Checks Before FAT ──
  makePost({
    slug: 'driver-current-loop-checks-before-fat',
    title: 'Driver Current Loop Checks Before FAT',
    summary: 'A short FAT checklist that keeps current ripple, idle current, and protection settings from surprising the customer on site.',
    lead: 'Driver settings are often treated as late-stage commissioning details, but most field surprises were already visible during FAT with the right logging.',
    category: 'Tutorial',
    productTopics: ['Drivers & Power'],
    industry: 'Factory Automation',
    authorId: 'marco-hein',
    publishedAt: '2026-02-22',
    readMinutes: 5,
    viewCount: 2438,
    relatedProductSlugs: ['switching-power-supply-48v-10a', '17-single-shaft-bipolar-stepper-motor-45ncm'],
    relatedPostSlugs: ['stepper-torque-margin-for-packaging-axes', 'using-driver-logs-to-speed-up-site-commissioning'],
    sections: [
      {
        id: 'fat-cheapest-place',
        title: 'FAT is the cheapest place to catch tuning drift',
        blocks: [
          { type: 'paragraph', text: 'By the time the cabinet is on site, a current-loop mismatch becomes a schedule problem. FAT gives enough signal to fix it while the hardware team is still close to the project.' },
          { type: 'paragraph', text: 'We keep one short log template for idle current, thermal state, and protection events so factory and field teams read the same evidence.' },
          { type: 'list', items: [
            'Verify idle current after the final enclosure build, not before.',
            'Confirm protection thresholds with the intended PSU, not a bench supply.',
            'Save one reference log from the customer acceptance build.',
          ]},
        ],
      },
      {
        id: 'fat-logging-set',
        title: 'FAT logging set',
        blocks: [{
          type: 'table',
          caption: 'These checks are quick enough to repeat on every cabinet build.',
          columns: ['Signal', 'Target', 'Notes'],
          rows: [
            ['Idle current', 'Expected hold state', 'Avoid unnecessary heating at dwell.'],
            ['Current ripple', 'Within driver spec', 'No resonance burst in low-speed window.'],
            ['Protection events', '0 unintended trips', 'Document every threshold that was changed.'],
          ],
        }],
      },
      {
        id: 'commissioning-log-structure',
        title: 'Commissioning log structure',
        blocks: [{ type: 'code', language: 'yaml', code: "station: FAT-02\npsu: 48V-10A\nidle_current_pct: 55\ntrip_events: []\nripple_ok: true" }],
      },
    ],
  }),

  // ── 5. CAD Handshake Before Mechanical Freeze ──
  makePost({
    slug: 'tutorial-cad-handshake-before-mechanical-freeze',
    title: 'CAD Handshake Before Mechanical Freeze',
    summary: 'A tutorial for turning CAD requests into a repeatable, version-safe release process before brackets and harness lengths are frozen.',
    lead: 'Most CAD confusion is not about whether a STEP file exists. It is about version control, mating features, and whether the enclosure team is validating the same geometry as sourcing.',
    category: 'Tutorial',
    productTopics: ['Stepper Motor', 'Servo & Integrated'],
    industry: 'Factory Automation',
    authorId: 'lena-zhou',
    publishedAt: '2026-02-09',
    readMinutes: 6,
    viewCount: 1522,
    relatedProductSlugs: ['17-single-shaft-bipolar-stepper-motor-45ncm', 'integrated-motion-assembly-oem'],
    relatedPostSlugs: ['why-datasheet-language-control-matters-for-global-oems', 'when-to-pick-an-integrated-motion-assembly'],
    sections: [
      {
        id: 'cad-handoff-timing',
        title: 'CAD handoff should happen before bracket sign-off',
        blocks: [
          { type: 'paragraph', text: 'Mechanical freeze often slips because teams ask for CAD after the bracket concept is already approved. That leaves no room for connector keep-outs or cable exit corrections.' },
          { type: 'paragraph', text: 'A lightweight handshake on revision, mating surfaces, and file type removes most of the churn before sourcing touches the BOM.' },
          { type: 'list', items: [
            'Lock file format and revision naming before sending the first request.',
            'Include connector keep-out and cable bend assumptions in the same package.',
            'Treat CAD approval as a gate before harness and enclosure release.',
          ]},
        ],
      },
      {
        id: 'cad-request-pack',
        title: 'CAD request pack',
        blocks: [{
          type: 'table',
          caption: 'The minimum package we ask teams to confirm before download.',
          columns: ['Item', 'Needed from team', 'Why'],
          rows: [
            ['Revision tag', 'Project release tag', 'Avoids mismatched bracket and motor geometry.'],
            ['File type', 'STEP, DXF, PDF', 'Lets each discipline open the same package.'],
            ['Mounting assumption', 'Bracket or rail context', 'Captures fastener stack and keep-out zone.'],
          ],
        }],
      },
      {
        id: 'revision-naming',
        title: 'Revision naming example',
        blocks: [{ type: 'code', language: 'txt', code: "project=cartoner-axis-b\nassembly=vxm17-bracket-kit\nrevision=R03\nexport=STEP+DXF+PDF" }],
      },
    ],
  }),

  // ── 6. Motion Platform Q2 Release Roundup ──
  makePost({
    slug: 'news-motion-platform-q2-release-roundup',
    title: 'Motion Platform Q2 Release Roundup',
    summary: 'A concise view of the catalog and enablement items that moved in the last quarterly release window.',
    lead: 'Quarterly launches matter most when the commercial, design, and documentation teams all ship together. Otherwise the release only creates another round of support tickets.',
    category: 'News & Updates',
    productTopics: ['Drivers & Power'],
    industry: 'Factory Automation',
    authorId: 'irene-park',
    publishedAt: '2026-01-30',
    readMinutes: 4,
    viewCount: 1284,
    relatedProductSlugs: ['23-stepper-motor-240ncm', 'switching-power-supply-48v-10a'],
    relatedPostSlugs: ['driver-current-loop-checks-before-fat', 'using-driver-logs-to-speed-up-site-commissioning'],
    sections: [
      {
        id: 'what-shipped',
        title: 'What actually shipped in the quarter',
        blocks: [
          { type: 'paragraph', text: 'This release window focused on packaging axes, global documents, and a faster CAD response path rather than a long list of incremental SKU changes.' },
          { type: 'paragraph', text: 'The key question for OEM teams is whether the release changed what they can validate immediately. That is the lens used in this summary.' },
          { type: 'list', items: [
            'Datasheet and CAD response times were reduced for the most common request set.',
            'The release added clearer FAT logging for drivers and power paths.',
            'Channel and OEM enablement now share the same reference pack.',
          ]},
        ],
      },
      {
        id: 'release-highlights',
        title: 'Release highlights',
        blocks: [{
          type: 'table',
          caption: 'The items that had a direct effect on buyer or engineer workflow.',
          columns: ['Area', 'Change', 'Practical effect'],
          rows: [
            ['Resources', 'CAD + datasheet hub expanded', 'Fewer support loops before quote approval.'],
            ['Drivers', 'FAT logging template updated', 'Cleaner site handoff after factory test.'],
            ['Enablement', 'Quarterly webinar deck published', 'Faster distributor ramp for launch items.'],
          ],
        }],
      },
    ],
  }),

  // ── 7. Using Driver Logs to Speed Up Site Commissioning ──
  makePost({
    slug: 'using-driver-logs-to-speed-up-site-commissioning',
    title: 'Using Driver Logs to Speed Up Site Commissioning',
    summary: 'How to hand field teams one log format that shortens troubleshooting instead of creating more email chains.',
    lead: 'The fastest commissioning fixes happen when the factory and field teams share the same log headings, thresholds, and naming conventions from day one.',
    category: 'Tutorial',
    productTopics: ['Drivers & Power'],
    industry: 'Packaging',
    authorId: 'marco-hein',
    publishedAt: '2025-12-18',
    readMinutes: 6,
    viewCount: 1943,
    relatedProductSlugs: ['switching-power-supply-48v-10a', '23-stepper-motor-240ncm'],
    relatedPostSlugs: ['driver-current-loop-checks-before-fat', 'news-motion-platform-q2-release-roundup'],
    sections: [
      {
        id: 'good-logs-shorten-blame-cycle',
        title: 'Good logs shorten the blame cycle',
        blocks: [
          { type: 'paragraph', text: 'Site issues are not always hard. They are often just poorly described. One structured log lets the right engineer see the real failure in minutes instead of days.' },
          { type: 'paragraph', text: 'We use the same log header at FAT and on site so field teams can attach evidence that maps cleanly back to the release packet.' },
          { type: 'list', items: [
            'Use identical signal names at FAT and in field service.',
            'Record the exact PSU and firmware revision in every upload.',
            'Keep the log short enough that installers will actually use it.',
          ]},
        ],
      },
      {
        id: 'field-log-minimums',
        title: 'Field log minimums',
        blocks: [{
          type: 'table',
          caption: 'Enough data to make a real decision without overwhelming installers.',
          columns: ['Field', 'Why it matters', 'Typical mistake'],
          rows: [
            ['Firmware revision', 'Maps issue to release state', 'Installer omits it from screenshots.'],
            ['Bus voltage', 'Separates PSU issues from loop tuning', 'Measured with no load only.'],
            ['Fault code + timestamp', 'Correlates event to machine state', 'Copied without machine context.'],
          ],
        }],
      },
      {
        id: 'csv-header-example',
        title: 'CSV header example',
        blocks: [{ type: 'code', language: 'csv', code: 'timestamp,fault_code,bus_voltage,phase_current,station,firmware,notes\n2025-12-18T10:42:00Z,,47.8,2.4,cartoner-2,1.4.3,stable run' }],
      },
    ],
  }),

  // ── 8. Why Datasheet Language Control Matters ──
  makePost({
    slug: 'why-datasheet-language-control-matters-for-global-oems',
    title: 'Why Datasheet Language Control Matters for Global OEMs',
    summary: 'The hidden cost of mixing outdated English and local-language exports across purchasing, engineering, and QA.',
    lead: 'Document mismatches do not look urgent until they affect sourcing approval, QA inspection notes, or local technical reviews. By then the program is already slower.',
    category: 'Technical Guide',
    productTopics: ['Stepper Motor'],
    industry: 'Lab Automation',
    authorId: 'irene-park',
    publishedAt: '2025-11-21',
    readMinutes: 5,
    viewCount: 1448,
    relatedProductSlugs: ['23-stepper-motor-240ncm', '17-single-shaft-bipolar-stepper-motor-45ncm'],
    relatedPostSlugs: ['tutorial-cad-handshake-before-mechanical-freeze', 'news-motion-platform-q2-release-roundup'],
    sections: [
      {
        id: 'one-document-owner',
        title: 'Global review needs one document owner',
        blocks: [
          { type: 'paragraph', text: 'When engineering reads English and sourcing reads a local export, version drift becomes a real risk. Language control is therefore part of release management, not just translation.' },
          { type: 'paragraph', text: 'The fix is simple: tag every export with the same revision and keep the distribution path inside a single library instead of ad hoc attachments.' },
          { type: 'list', items: [
            'Treat translated datasheets as controlled exports, not loose attachments.',
            'Keep revision tags identical across every language variant.',
            'Publish downloads in one place so local teams stop forwarding stale files.',
          ]},
        ],
      },
      {
        id: 'document-control-checks',
        title: 'Document control checks',
        blocks: [{
          type: 'table',
          caption: 'These checks are small but stop most mismatches.',
          columns: ['Check', 'Owner', 'Risk prevented'],
          rows: [
            ['Shared revision ID', 'Product marketing', 'Mixed-language mismatch during approval.'],
            ['Central library', 'Web team', 'Old files reappear through email threads.'],
            ['Release note', 'Applications', 'Local teams miss parameter changes.'],
          ],
        }],
      },
      {
        id: 'filename-convention',
        title: 'Filename convention',
        blocks: [{ type: 'code', language: 'txt', code: 'VXM-23-240NCM_datasheet_R05_EN.pdf\nVXM-23-240NCM_datasheet_R05_ZH.pdf' }],
      },
    ],
  }),

  // ── 9. When to Pick an Integrated Motion Assembly ──
  makePost({
    slug: 'when-to-pick-an-integrated-motion-assembly',
    title: 'When to Pick an Integrated Motion Assembly',
    summary: 'A framework for deciding when an integrated assembly is faster and safer than stitching together a loose component stack.',
    lead: 'Integrated assemblies are not automatically better. They become the right answer when the project would otherwise burn time reconciling brackets, wiring, and control assumptions across teams.',
    category: 'Technical Guide',
    productTopics: ['Servo & Integrated'],
    industry: 'Robotics',
    authorId: 'lena-zhou',
    publishedAt: '2025-10-17',
    readMinutes: 7,
    viewCount: 2031,
    relatedProductSlugs: ['integrated-motion-assembly-oem', '17-single-shaft-bipolar-stepper-motor-45ncm'],
    relatedPostSlugs: ['tutorial-cad-handshake-before-mechanical-freeze', 'servo-bandwidth-targets-for-robotic-joints'],
    sections: [
      {
        id: 'integration-cost-in-coordination',
        title: 'Integration cost is usually hidden in coordination',
        blocks: [
          { type: 'paragraph', text: 'A loose stack seems flexible until the project starts paying for bracket rework, harness changes, and duplicated validation notes. That cost should be made explicit early.' },
          { type: 'paragraph', text: 'Integrated motion is strongest when ownership, interfaces, and FAT scope are all easier with one release package than with several vendors.' },
          { type: 'list', items: [
            'Count coordination loops, not only material cost.',
            'Look at FAT scope and field support before deciding the stack.',
            'Use integrated assemblies when wiring and mounting assumptions move together.',
          ]},
        ],
      },
      {
        id: 'decision-guide',
        title: 'Decision guide',
        blocks: [{
          type: 'table',
          caption: 'Use this before freezing the commercial structure of the project.',
          columns: ['Signal', 'Loose stack', 'Integrated assembly'],
          rows: [
            ['Bracket churn', 'High risk', 'Lower risk'],
            ['Wiring ownership', 'Split across teams', 'Single package'],
            ['Field support', 'More cross-vendor coordination', 'Cleaner escalation path'],
          ],
        }],
      },
      {
        id: 'quick-scoring-model',
        title: 'Quick scoring model',
        blocks: [{ type: 'code', language: 'ts', code: "const chooseIntegrated = coordinationLoops > 3 || harnessRisk === 'high' || fatScope === 'shared';" }],
      },
    ],
  }),

  // ── 10. Stepper Startup Failures in Cold Warehouses ──
  makePost({
    slug: 'stepper-startup-failures-in-cold-warehouses',
    title: 'Stepper Startup Failures in Cold Warehouses',
    summary: 'A field-oriented checklist for low-temperature starts, stiff grease, and voltage drop on distributed packaging equipment.',
    lead: 'Cold-start complaints are rarely caused by one parameter alone. Temperature, lubrication, supply sag, and acceleration ramps usually combine into the same symptom.',
    category: 'Application Note',
    productTopics: ['Stepper Motor'],
    industry: 'Packaging',
    authorId: 'lena-zhou',
    publishedAt: '2025-09-26',
    readMinutes: 5,
    viewCount: 1331,
    relatedProductSlugs: ['23-stepper-motor-240ncm', 'switching-power-supply-48v-10a'],
    relatedPostSlugs: ['stepper-torque-margin-for-packaging-axes', 'using-driver-logs-to-speed-up-site-commissioning'],
    sections: [
      {
        id: 'cold-starts-change-window',
        title: 'Cold starts change the whole operating window',
        blocks: [
          { type: 'paragraph', text: 'The startup state of a warehouse conveyor or carton line is not the same as the warmed-up state. That distinction needs to show up in the validation plan.' },
          { type: 'paragraph', text: 'The fastest fix is to log supply voltage, ambient, and first-cycle recovery together. Otherwise teams keep retuning only the ramp.' },
          { type: 'list', items: [
            'Measure the first three cycles after power-on, not only steady-state behavior.',
            'Review grease drag and cable stiffness together with motor current.',
            'Do not sign off cold-start behavior from a room-temperature FAT only.',
          ]},
        ],
      },
      {
        id: 'cold-start-checks',
        title: 'Cold-start checks',
        blocks: [{
          type: 'table',
          caption: 'A practical inspection path for field engineers.',
          columns: ['Check', 'Expected result', 'If it fails'],
          rows: [
            ['Bus voltage at first move', '> threshold', 'Check supply sizing and cable length.'],
            ['First-cycle motion', 'No stall', 'Reduce ramp or increase reserve torque.'],
            ['Warm-up recovery', 'Stable within 3 cycles', 'Review lubrication and drag load.'],
          ],
        }],
      },
      {
        id: 'first-cycle-event-log',
        title: 'First-cycle event log',
        blocks: [{ type: 'code', language: 'json', code: '{\n  "ambientC": 4,\n  "busVoltageFirstMove": 45.7,\n  "stall": false,\n  "recoveredByCycle": 2\n}' }],
      },
    ],
  }),

  // ── 11. BLDC Power Supply Sizing for Fast Axis Recovery ──
  makePost({
    slug: 'bldc-power-supply-sizing-for-fast-axis-recovery',
    title: 'BLDC Power Supply Sizing for Fast Axis Recovery',
    summary: 'Why supply headroom matters most during recovery events instead of during calm, repeated moves.',
    lead: 'Power supplies often pass a nominal cycle review and still fail the recovery moment after a jam clear or operator stop. That is the event that should set the ceiling.',
    category: 'Technical Guide',
    productTopics: ['BLDC Motor', 'Drivers & Power'],
    industry: 'Factory Automation',
    authorId: 'marco-hein',
    publishedAt: '2025-08-15',
    readMinutes: 6,
    viewCount: 1214,
    relatedProductSlugs: ['switching-power-supply-48v-10a', 'integrated-motion-assembly-oem'],
    relatedPostSlugs: ['driver-current-loop-checks-before-fat', 'bldc-acoustic-tuning-for-medical-devices'],
    sections: [
      {
        id: 'recovery-events-set-ceiling',
        title: 'Recovery events set the real ceiling',
        blocks: [
          { type: 'paragraph', text: 'A power supply sized only for repeated nominal moves will often dip right when operators need the machine to recover. That is why recovery should be a first-class test state.' },
          { type: 'paragraph', text: 'We calculate headroom using both average demand and the short recovery burst after a forced stop or jam clear.' },
          { type: 'list', items: [
            'Check recovery current separately from production average current.',
            'Validate cable drop on the actual installation distance.',
            'Review PSU thermal margin at the same ambient used for machine FAT.',
          ]},
        ],
      },
      {
        id: 'supply-review-matrix',
        title: 'Supply review matrix',
        blocks: [{
          type: 'table',
          caption: 'The matrix used before PSU approval.',
          columns: ['State', 'What to log', 'Reason'],
          rows: [
            ['Nominal cycle', 'Average current', 'Confirms continuous demand.'],
            ['Recovery event', 'Peak current + voltage dip', 'Protects restart margin.'],
            ['Warm cabinet', 'Thermal output stability', 'Catches late-stage power derating.'],
          ],
        }],
      },
      {
        id: 'recovery-headroom-check',
        title: 'Recovery headroom check',
        blocks: [{ type: 'code', language: 'ts', code: "const headroomPct = ((psuMaxCurrent - recoveryPeakCurrent) / psuMaxCurrent) * 100;\nconsole.log(`Recovery headroom ${headroomPct.toFixed(1)}%`);" }],
      },
    ],
  }),

  // ── 12. Servo Cable Routing Rules ──
  makePost({
    slug: 'servo-cable-routing-rules-for-clean-feedback',
    title: 'Servo Cable Routing Rules for Clean Feedback',
    summary: 'Cable-routing habits that prevent feedback noise and intermittent commissioning issues on multi-axis builds.',
    lead: 'Many feedback issues blamed on the motor or drive turn out to be routing discipline problems. The fix is cheap if it happens before cabinet freeze.',
    category: 'Tutorial',
    productTopics: ['Servo & Integrated'],
    industry: 'CNC',
    authorId: 'lena-zhou',
    publishedAt: '2025-07-04',
    readMinutes: 5,
    viewCount: 1712,
    relatedProductSlugs: ['integrated-motion-assembly-oem', 'switching-power-supply-48v-10a'],
    relatedPostSlugs: ['servo-bandwidth-targets-for-robotic-joints', 'tutorial-cad-handshake-before-mechanical-freeze'],
    sections: [
      {
        id: 'clean-feedback-starts-with-routing',
        title: 'Clean feedback starts with physical routing',
        blocks: [
          { type: 'paragraph', text: 'Feedback quality is shaped before the first parameter file is loaded. Routing distance, bend control, and separation from noisy lines all matter.' },
          { type: 'paragraph', text: 'A clean routing rule set prevents the kind of intermittent issue that burns days because it appears only after the cabinet is closed.' },
          { type: 'list', items: [
            'Separate feedback and power paths as early as possible in the cabinet.',
            'Control bend radius at the moving point, not only in the trunk.',
            'Photograph the approved routing path for repeat builds.',
          ]},
        ],
      },
      {
        id: 'routing-checkpoints',
        title: 'Routing checkpoints',
        blocks: [{
          type: 'table',
          caption: 'These rules are simple enough to use in every build review.',
          columns: ['Checkpoint', 'Good state', 'Risk if ignored'],
          rows: [
            ['Path separation', 'Maintained through cabinet', 'Injected noise in feedback line.'],
            ['Bend radius', 'Within cable spec', 'Intermittent signal loss over time.'],
            ['Documentation', 'Photos attached to build pack', 'Repeat builds drift from validated route.'],
          ],
        }],
      },
      {
        id: 'install-note-template',
        title: 'Install note template',
        blocks: [{ type: 'code', language: 'md', code: "1. Separate feedback trunk from power trunk\n2. Confirm bend radius at moving point\n3. Save cabinet photos into FAT record" }],
      },
    ],
  }),

  // ── 13. Sample Plan Before OEM Approval ──
  makePost({
    slug: 'tutorial-sample-plan-before-oem-approval',
    title: 'Sample Plan Before OEM Approval',
    summary: 'How to structure a sample run so commercial approval, CAD handoff, and FAT expectations all move together.',
    lead: 'A sample program only saves time if it proves the next decision. Otherwise it becomes an expensive placeholder with no agreed acceptance target.',
    category: 'Tutorial',
    productTopics: ['Stepper Motor', 'Servo & Integrated'],
    industry: 'Lab Automation',
    authorId: 'irene-park',
    publishedAt: '2025-06-13',
    readMinutes: 6,
    viewCount: 1179,
    relatedProductSlugs: ['17-single-shaft-bipolar-stepper-motor-45ncm', 'integrated-motion-assembly-oem'],
    relatedPostSlugs: ['when-to-pick-an-integrated-motion-assembly', 'tutorial-cad-handshake-before-mechanical-freeze'],
    sections: [
      {
        id: 'sample-programs-need-decision-gates',
        title: 'Sample programs need decision gates',
        blocks: [
          { type: 'paragraph', text: 'The best sample plans define what each team will decide after the run: mechanics, controls, sourcing, or compliance. Without that, the sample never closes the loop.' },
          { type: 'paragraph', text: 'We structure samples around one acceptance pack so the OEM team does not have to reverse-engineer what was being validated.' },
          { type: 'list', items: [
            'Define the approval question before shipping the sample.',
            'Attach CAD, datasheet, and FAT expectations to the same sample record.',
            'Use the sample to decide the next commercial step, not just technical feasibility.',
          ]},
        ],
      },
      {
        id: 'sample-approval-sheet',
        title: 'Sample approval sheet',
        blocks: [{
          type: 'table',
          caption: 'A lightweight sheet used for OEM sample decisions.',
          columns: ['Decision area', 'Evidence', 'Owner'],
          rows: [
            ['Mechanical fit', 'CAD review + photos', 'Mechanical team'],
            ['Control behavior', 'Move log + current settings', 'Controls team'],
            ['Commercial next step', 'MOQ / timeline note', 'Program owner'],
          ],
        }],
      },
      {
        id: 'sample-checklist-header',
        title: 'Sample checklist header',
        blocks: [{ type: 'code', language: 'yaml', code: "sample_id: OEM-2025-0613\napproval_question: can-the-axis-freeze-mechanical-design\nnext_step_if_pass: pilot-bom-lock" }],
      },
    ],
  }),

  // ── 14. Resource Library Update ──
  makePost({
    slug: 'news-resource-library-update-for-cad-and-datasheets',
    title: 'Resource Library Update for CAD and Datasheets',
    summary: 'Why the library update matters for distributor enablement, OEM review speed, and cleaner document control.',
    lead: 'Document migration only matters if engineers and buyers reach files faster with fewer mismatches. That is the lens for this library update.',
    category: 'News & Updates',
    productTopics: ['Stepper Motor'],
    industry: 'Robotics',
    authorId: 'irene-park',
    publishedAt: '2025-05-19',
    readMinutes: 4,
    viewCount: 986,
    relatedProductSlugs: ['17-single-shaft-bipolar-stepper-motor-45ncm', '23-stepper-motor-240ncm'],
    relatedPostSlugs: ['why-datasheet-language-control-matters-for-global-oems', 'tutorial-cad-handshake-before-mechanical-freeze'],
    sections: [
      {
        id: 'library-as-workflow-tool',
        title: 'The library is now an engineering workflow tool',
        blocks: [
          { type: 'paragraph', text: 'The update grouped whitepapers, downloads, CAD, and datasheets into one place so teams stop bouncing between product pages, email threads, and support tickets.' },
          { type: 'paragraph', text: 'That matters most for distributors and OEM teams that need repeatable answers, not just a one-time file handoff.' },
          { type: 'list', items: [
            'CAD and datasheet discovery is faster when SKU search lives in one hub.',
            'Gated assets now capture commercial context instead of disappearing into email threads.',
            'Resource controls make revision and language management easier to enforce.',
          ]},
        ],
      },
      {
        id: 'library-impact-summary',
        title: 'Library impact summary',
        blocks: [{
          type: 'table',
          caption: 'What improved for day-to-day teams.',
          columns: ['User', 'What changed', 'Result'],
          rows: [
            ['OEM engineer', 'Unified search and filters', 'Shorter file discovery time.'],
            ['Distributor', 'Gated webinar and whitepaper flow', 'Cleaner commercial follow-up.'],
            ['QA / sourcing', 'Controlled datasheet variants', 'Lower risk of stale documents.'],
          ],
        }],
      },
    ],
  }),

  // ── 15. Stepper Holding Current Rules for Lab Automation ──
  makePost({
    slug: 'stepper-holding-current-rules-for-lab-automation',
    title: 'Stepper Holding Current Rules for Lab Automation',
    summary: 'How to set hold current in small instruments without trading away repeatability, temperature budget, or serviceability.',
    lead: 'In lab automation, holding current is usually where heat, noise, and repeatability begin to compete. The right answer depends on when the axis actually needs torque.',
    category: 'Technical Guide',
    productTopics: ['Stepper Motor'],
    industry: 'Lab Automation',
    authorId: 'lena-zhou',
    publishedAt: '2025-04-08',
    readMinutes: 5,
    viewCount: 1566,
    relatedProductSlugs: ['17-single-shaft-bipolar-stepper-motor-45ncm', 'switching-power-supply-48v-10a'],
    relatedPostSlugs: ['bldc-acoustic-tuning-for-medical-devices', 'driver-current-loop-checks-before-fat'],
    sections: [
      {
        id: 'hold-current-follows-risk',
        title: 'Hold current should follow the real risk state',
        blocks: [
          { type: 'paragraph', text: 'Many instruments keep hold current high by default even though the axis only needs torque in a few defined windows. That burns thermal budget for no real gain.' },
          { type: 'paragraph', text: 'We map hold state against gravity, vibration risk, and recovery demand so the control team can justify each setting with actual use cases.' },
          { type: 'list', items: [
            'Separate hold states by axis orientation and disturbance risk.',
            'Document temperature rise after idle dwell, not only during motion.',
            'Use the same hold-current logic in service mode and production mode unless there is a clear reason not to.',
          ]},
        ],
      },
      {
        id: 'hold-current-review',
        title: 'Hold-current review',
        blocks: [{
          type: 'table',
          caption: 'The same worksheet can be reused across small instrument platforms.',
          columns: ['State', 'Hold current', 'Why'],
          rows: [
            ['Idle horizontal axis', 'Reduced', 'Preserves thermal budget.'],
            ['Vertical hold', 'Higher', 'Maintains position against gravity.'],
            ['Service mode', 'Documented override only', 'Avoids hidden behavior in maintenance.'],
          ],
        }],
      },
      {
        id: 'state-based-hold-control',
        title: 'State-based hold control',
        blocks: [{ type: 'code', language: 'ts', code: "const holdCurrentPct = axisOrientation === 'vertical' ? 70 : 45;\ncontroller.setHoldCurrent(holdCurrentPct);" }],
      },
    ],
  }),
];

export const blogPageSize = 12;

// ── Utility functions ──

export function getBlogAuthorById(authorId: string) {
  return blogAuthors.find((author) => author.id === authorId);
}

export function getBlogPostBySlug(slug: string) {
  return blogPosts.find((post) => post.slug === slug);
}

export function getBlogYears() {
  return Array.from(new Set(blogPosts.map((post) => new Date(post.publishedAt).getUTCFullYear().toString()))).sort((left, right) => Number(right) - Number(left));
}

export function filterBlogPosts(posts: BlogPost[], filters: { query?: string; category?: string; industry?: string; author?: string; year?: string }) {
  const query = filters.query?.trim().toLowerCase() ?? '';

  return posts.filter((post) => {
    const author = getBlogAuthorById(post.authorId);
    const matchesQuery = !query || `${post.title} ${post.summary} ${post.lead} ${author?.name ?? ''}`.toLowerCase().includes(query);
    const matchesCategory = !filters.category || blogCategorySlug[post.category] === filters.category;
    const matchesIndustry = !filters.industry || post.industry === filters.industry;
    const matchesAuthor = !filters.author || post.authorId === filters.author;
    const matchesYear = !filters.year || new Date(post.publishedAt).getUTCFullYear().toString() === filters.year;

    return matchesQuery && matchesCategory && matchesIndustry && matchesAuthor && matchesYear;
  });
}

export function filterByProductTopic(posts: BlogPost[], topic: BlogProductTopic) {
  return posts.filter((post) => post.productTopics.includes(topic));
}

export function paginateBlogPosts(posts: BlogPost[], page: number, pageSize = blogPageSize) {
  const totalPages = Math.max(1, Math.ceil(posts.length / pageSize));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const startIndex = (currentPage - 1) * pageSize;

  return {
    page: currentPage,
    totalPages,
    items: posts.slice(startIndex, startIndex + pageSize),
  };
}

export function getMostReadPosts(limit = 4) {
  return [...blogPosts].sort((left, right) => right.viewCount - left.viewCount).slice(0, limit);
}

export function getRelatedPosts(post: BlogPost, limit = 3) {
  return post.relatedPostSlugs.map((slug) => getBlogPostBySlug(slug)).filter((item): item is BlogPost => Boolean(item)).slice(0, limit);
}
