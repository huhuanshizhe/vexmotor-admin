export type SolutionRequirement = {
  label: string;
  value: string;
  note: string;
};

export type SolutionCaseStudy = {
  title: string;
  summary: string;
  outcome: string;
};

export type SolutionResource = {
  title: string;
  meta: string;
  description: string;
  href: string;
};

export type SolutionFaq = {
  question: string;
  answer: string;
};

export type SolutionIndustry = {
  slug: string;
  title: string;
  summary: string;
  painSummary: string;
  imageSrc: string;
  selectorCategory: string;
  selectorIndustry: string;
  recommendedCategorySlugs: string[];
  featuredProductIds: string[];
  requirements: SolutionRequirement[];
  caseStudies: SolutionCaseStudy[];
  resources: SolutionResource[];
  faq: SolutionFaq[];
};

export const solutionIndustries: SolutionIndustry[] = [
  {
    slug: '3d-printing',
    title: '3D Printing',
    summary: 'Compact stepper stacks for gantry, extrusion, feeder, and fine-layer positioning systems.',
    painSummary: '3D printer builders usually need stable microstepping, low resonance, and driver/PSU matching without oversizing the whole control stack.',
    imageSrc: 'https://images.unsplash.com/photo-1581092334651-ddf26d9a09d0?auto=format&fit=crop&w=1400&q=80',
    selectorCategory: 'stepper',
    selectorIndustry: '3d-printing',
    recommendedCategorySlugs: ['nema-17-stepper-motor', 'stepper-drivers', 'power-supplies'],
    featuredProductIds: ['prod-1', 'prod-5', 'prod-6'],
    requirements: [
      { label: 'Typical torque', value: '40-80 N·cm', note: 'X/Y axes and filament feed systems usually start in compact NEMA 17 frames.' },
      { label: 'Speed target', value: '600-1200 rpm', note: 'Higher print-head speed needs a driver and supply combination that stays stable above resonance zones.' },
      { label: 'IP target', value: 'IP40', note: 'Most printer enclosures stay indoors, so thermal and tuning stability matters more than ingress sealing.' },
      { label: 'Feedback', value: 'Open loop or encoder-ready', note: 'Closed-loop is optional for heavier gantries, but most desktop or light industrial builds stay open loop.' },
    ],
    caseStudies: [
      {
        title: 'CoreXY gantry refresh',
        summary: 'A print-farm integrator replaced mixed commodity motors with one NEMA 17 + driver stack for faster commissioning.',
        outcome: 'Driver tuning time dropped and spare-part standardization improved across 24 printers.',
      },
      {
        title: 'Industrial feeder upgrade',
        summary: 'A pellet-fed extrusion module needed cleaner low-speed motion and better current matching.',
        outcome: 'The matched driver and PSU combination reduced missed steps during long print jobs.',
      },
    ],
    resources: [
      { title: 'Run the selector with a 3D printing preset', meta: 'Selector', description: 'Start from the application preset instead of rebuilding the motion scenario manually.', href: '/selector?category=stepper&industry=3d-printing' },
      { title: 'Volume pricing for print-farm demand', meta: 'Pricing', description: 'Review annual quantity savings when a design scales into repeat production.', href: '/volume-pricing' },
    ],
    faq: [
      { question: 'Should 3D printing builds start with open loop?', answer: 'Usually yes. Open-loop NEMA 17 systems remain the default unless gantry inertia, uptime targets, or customer warranty terms justify encoder feedback.' },
      { question: 'When do closed-loop kits make sense?', answer: 'When the gantry mass grows, travel accelerations increase, or missed-step detection matters more than the lowest BOM cost.' },
    ],
  },
  {
    slug: 'cnc',
    title: 'CNC',
    summary: 'Higher-torque motion stacks for routers, tables, tool changers, and mid-load industrial axes.',
    painSummary: 'CNC builders usually balance torque margin, drive voltage, and rigidity, while still keeping the motor/gearbox stack serviceable for maintenance teams.',
    imageSrc: 'https://images.unsplash.com/photo-1565043589221-1a6fd9ae45c7?auto=format&fit=crop&w=1400&q=80',
    selectorCategory: 'stepper',
    selectorIndustry: 'cnc-tooling',
    recommendedCategorySlugs: ['nema-23-stepper-motor', 'stepper-drivers', 'gearboxes'],
    featuredProductIds: ['prod-2', 'prod-4', 'prod-7'],
    requirements: [
      { label: 'Typical torque', value: '180-500 N·cm', note: 'Tooling axes and indexers generally move into NEMA 23 or geared 57 mm frames.' },
      { label: 'Speed target', value: '180-900 rpm', note: 'Output speed varies sharply once gear reduction is introduced for torque-heavy axes.' },
      { label: 'IP target', value: 'IP40-IP54', note: 'Chip and dust exposure frequently pushes support hardware and gearbox choices above a purely indoor baseline.' },
      { label: 'Feedback', value: 'Open loop or closed-loop stepper', note: 'Closed-loop kits fit retrofits where missed-step protection is needed without a full servo jump.' },
    ],
    caseStudies: [
      {
        title: 'Router axis standardization',
        summary: 'A small machine OEM consolidated one router platform around a single NEMA 23 motor and driver pair.',
        outcome: 'Spare parts, tuning presets, and after-sales support all became easier to manage across regions.',
      },
      {
        title: 'Indexing fixture gearbox retrofit',
        summary: 'A manual indexing station required higher holding torque without a full cabinet redesign.',
        outcome: 'The 10:1 gearbox route improved output torque while keeping the upstream motor frame compact.',
      },
    ],
    resources: [
      { title: 'Browse CNC-ready motors', meta: 'Catalog', description: 'Jump straight into the heavier NEMA 23 category and matched driver stack.', href: '/c/nema-23-stepper-motor' },
      { title: 'Selector preset for CNC & tooling', meta: 'Selector', description: 'Start the selector with CNC-ready assumptions already applied.', href: '/selector?category=stepper&industry=cnc-tooling' },
    ],
    faq: [
      { question: 'When is a gearbox better than a larger frame motor?', answer: 'When output torque is the limiting factor and the machine envelope or inertia target makes a direct larger frame unattractive.' },
      { question: 'Do all CNC builds need closed-loop feedback?', answer: 'No. Many stable axes still run open loop, but closed-loop kits are common where scrap risk or missed-step recovery is a problem.' },
    ],
  },
  {
    slug: 'robotics',
    title: 'Robotics',
    summary: 'Motion stacks for collaborative joints, feeders, positioning modules, and encoder-aware control loops.',
    painSummary: 'Robotics programs often care about repeatability, fieldbus compatibility, and mechanical packaging as much as raw torque output.',
    imageSrc: 'https://images.unsplash.com/photo-1535378917042-10a22c95931a?auto=format&fit=crop&w=1400&q=80',
    selectorCategory: 'servo',
    selectorIndustry: 'robotics',
    recommendedCategorySlugs: ['nema-23-stepper-motor', 'gearboxes', 'stepper-drivers'],
    featuredProductIds: ['prod-3', 'prod-4', 'prod-7'],
    requirements: [
      { label: 'Typical torque', value: '120-500 N·cm', note: 'Payload, arm length, and duty cycle dictate whether the stack stays stepper-led or moves into integrated control.' },
      { label: 'Speed target', value: '180-1500 rpm', note: 'Indexing modules and AGV subsystems run on very different speed profiles, so presetting the scenario matters.' },
      { label: 'IP target', value: 'IP40-IP54', note: 'Indoor robotics stays lighter, while mobile or end-of-line modules often need more sealing or connector discipline.' },
      { label: 'Feedback', value: 'Closed loop or encoder', note: 'Encoder-aware motion is common once recovery, diagnostics, or tighter tuning are required.' },
    ],
    caseStudies: [
      {
        title: 'Collaborative feeder module',
        summary: 'A robotics integrator needed predictable motion for a compact feeder with limited cabinet depth.',
        outcome: 'A closed-loop stepper kit reduced integration time compared with a loose motor-driver pairing.',
      },
      {
        title: 'OEM joint subassembly review',
        summary: 'A custom motion assembly was scoped for a robotics OEM that needed fieldbus-ready communication and brake support.',
        outcome: 'The project moved into RFQ with integrated control assumptions captured early.',
      },
    ],
    resources: [
      { title: 'Talk to engineering about robotics programs', meta: 'Contact', description: 'Use the engineering desk when the motion stack includes custom mechanics, fieldbus, or brake requirements.', href: '/contact?topic=engineering-call' },
      { title: 'Robotics selector preset', meta: 'Selector', description: 'Open the selector with robotics already selected on the application step.', href: '/selector?category=servo&industry=robotics' },
    ],
    faq: [
      { question: 'When should a robotics program move to RFQ?', answer: 'Once the project needs integrated control, a custom mechanical package, or commercial review beyond stocked catalog parts.' },
      { question: 'Are gearboxes common in robotics builds?', answer: 'Yes. Many robotic axes use reduction to improve output torque, controllability, and packaging around the joint.' },
    ],
  },
  {
    slug: 'medical',
    title: 'Medical',
    summary: 'Quiet, precise motion for diagnostics, fluid handling, positioning modules, and controlled delivery systems.',
    painSummary: 'Medical-device teams usually care about noise, repeatability, documentation readiness, and compact mechanical envelopes more than brute-force acceleration.',
    imageSrc: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=1400&q=80',
    selectorCategory: 'linear-actuator',
    selectorIndustry: 'medical-devices',
    recommendedCategorySlugs: ['nema-17-stepper-motor', 'linear-motion', 'power-supplies'],
    featuredProductIds: ['prod-1', 'prod-8', 'prod-6'],
    requirements: [
      { label: 'Typical torque', value: '30-260 N·cm', note: 'Low-noise positioning, pumps, and subassemblies often stay in compact stepper or actuator formats.' },
      { label: 'Speed target', value: '100-800 rpm', note: 'Many medical motions prioritize controllability and repeatability over high top speed.' },
      { label: 'IP target', value: 'IP40-IP54', note: 'Enclosure discipline varies by device class and cleaning expectations.' },
      { label: 'Feedback', value: 'Open loop with traceability or encoder', note: 'Feedback is added when the process or audit trail needs stronger positional confirmation.' },
    ],
    caseStudies: [
      {
        title: 'Diagnostic tray positioning',
        summary: 'A compact tray motion subsystem needed repeatable travel without a bulky gearbox stack.',
        outcome: 'A lead-screw style actuator simplified the mechanism and reduced assembly parts.',
      },
      {
        title: 'Pump platform refresh',
        summary: 'An OEM moved from mixed local suppliers to one compact stepper platform for a fluid-delivery module.',
        outcome: 'Noise and serviceability both improved while documentation remained easier to manage.',
      },
    ],
    resources: [
      { title: 'Medical-device selector preset', meta: 'Selector', description: 'Open the guided selector with medical-device context already applied.', href: '/selector?category=linear-actuator&industry=medical-devices' },
      { title: 'Certification support overview', meta: 'Support', description: 'Review the certification and compliance landing page before documenting a regulated build.', href: '/company/certifications' },
    ],
    faq: [
      { question: 'Do medical builds always need closed-loop motion?', answer: 'Not always. Many compact pumps and diagnostic modules stay open loop when the mechanical design is stable and the risk model allows it.' },
      { question: 'What usually triggers a custom development path?', answer: 'Custom shafts, unusual thermal constraints, quieter operation targets, or documentation-driven design reviews usually move the program into RFQ or custom intake.' },
    ],
  },
  {
    slug: 'semiconductor',
    title: 'Semiconductor',
    summary: 'Precision motion for wafer handling, alignment, compact transfer modules, and encoder-aware subsystems.',
    painSummary: 'Semiconductor tools often need cleaner packaging, tighter positioning assumptions, and stronger control integration than general automation lines.',
    imageSrc: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1400&q=80',
    selectorCategory: 'servo',
    selectorIndustry: 'semiconductor',
    recommendedCategorySlugs: ['nema-17-stepper-motor', 'stepper-drivers', 'linear-motion'],
    featuredProductIds: ['prod-3', 'prod-4', 'prod-8'],
    requirements: [
      { label: 'Typical torque', value: '40-300 N·cm', note: 'Positioning subsystems range from compact alignment stages to heavier transfer modules.' },
      { label: 'Speed target', value: '120-1200 rpm', note: 'Motion profiles tend to emphasize repeatability and controlled settling more than maximum throughput alone.' },
      { label: 'IP target', value: 'IP40+', note: 'Tool architecture and enclosure standards drive the actual sealing requirement, but cleanliness expectations remain high.' },
      { label: 'Feedback', value: 'Closed loop or encoder', note: 'Feedback is common where positioning verification and process confidence outweigh BOM simplicity.' },
    ],
    caseStudies: [
      {
        title: 'Mini stage motion review',
        summary: 'A compact handling stage needed encoder-aware motion without growing the cabinet footprint.',
        outcome: 'The team shifted from loose component selection to an integrated inquiry-led motion stack.',
      },
      {
        title: 'Transfer module retrofit',
        summary: 'An older subassembly needed stronger reliability under repeated start-stop cycles.',
        outcome: 'Closed-loop stepping provided a lower-change retrofit path than a full servo redesign.',
      },
    ],
    resources: [
      { title: 'Semiconductor selector preset', meta: 'Selector', description: 'Start from a feedback-aware application preset for tighter positioning programs.', href: '/selector?category=servo&industry=semiconductor' },
      { title: 'Custom development intake', meta: 'RFQ', description: 'Use the custom brief when the program includes special environmental or interface constraints.', href: '/custom' },
    ],
    faq: [
      { question: 'Why not default every semiconductor axis to a full servo stack?', answer: 'Some subassemblies still fit closed-loop stepper or actuator paths when inertia, speed, and error recovery remain within range.' },
      { question: 'What usually moves the project into custom intake?', answer: 'Connector requirements, environmental constraints, integrated control, or packaging changes beyond the catalog envelope.' },
    ],
  },
  {
    slug: 'packaging',
    title: 'Packaging',
    summary: 'Matched motors, gearboxes, and actuators for indexing, sealing, cutting, and synchronized line modules.',
    painSummary: 'Packaging lines usually need a broad mix of fixed-speed axes, intermittent indexing, and long-duty operation while still keeping service parts easy to source.',
    imageSrc: 'https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?auto=format&fit=crop&w=1400&q=80',
    selectorCategory: 'gearmotor',
    selectorIndustry: 'packaging',
    recommendedCategorySlugs: ['gearboxes', 'linear-motion', 'nema-23-stepper-motor'],
    featuredProductIds: ['prod-4', 'prod-7', 'prod-8'],
    requirements: [
      { label: 'Typical torque', value: '120-500 N·cm', note: 'Indexers, conveyors, and sealing modules span a wide torque range depending on reduction and load mass.' },
      { label: 'Speed target', value: '180-1200 rpm', note: 'Packaging lines mix slow output axes with faster upstream motion, so the duty cycle matters as much as top speed.' },
      { label: 'IP target', value: 'IP54', note: 'Washdown-adjacent and dusty packaging zones often push hardware selection above the baseline indoor level.' },
      { label: 'Feedback', value: 'Open loop, closed-loop, or actuator travel reference', note: 'Feedback choices depend on scrap risk and machine synchronization requirements.' },
    ],
    caseStudies: [
      {
        title: 'Film-feed indexing module',
        summary: 'A packaging OEM needed higher output torque without a larger motor body in the same frame space.',
        outcome: 'The gearbox route solved torque demand while staying within the existing mechanical envelope.',
      },
      {
        title: 'Compact pusher assembly',
        summary: 'A stroke-defined motion module needed a simpler mechanism than a separate motor and screw assembly.',
        outcome: 'A linear actuator reduced assembly complexity and sped up field replacement.',
      },
    ],
    resources: [
      { title: 'Packaging selector preset', meta: 'Selector', description: 'Open the selector with packaging already prefilled in the application step.', href: '/selector?category=gearmotor&industry=packaging' },
      { title: 'Request contract pricing for line rollouts', meta: 'Pricing', description: 'Use volume pricing when a packaging design is moving into repeat deployment.', href: '/volume-pricing' },
    ],
    faq: [
      { question: 'Are actuators common in packaging machines?', answer: 'Yes. They work well where stroke and mechanism simplicity matter more than exposing a separate motor and screw stack.' },
      { question: 'When is closed-loop stepping justified?', answer: 'Usually when scrap risk, synchronization, or restart reliability makes missed-step detection worth the extra system cost.' },
    ],
  },
  {
    slug: 'textile',
    title: 'Textile',
    summary: 'Compact motion stacks for feeders, tensioning modules, winding assists, and repetitive factory mechanisms.',
    painSummary: 'Textile equipment often runs long duty cycles in lint-heavy environments, so reliability and serviceability usually dominate over complex control stacks.',
    imageSrc: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1400&q=80',
    selectorCategory: 'gearmotor',
    selectorIndustry: 'textile',
    recommendedCategorySlugs: ['gearboxes', 'nema-17-stepper-motor', 'power-supplies'],
    featuredProductIds: ['prod-1', 'prod-7', 'prod-6'],
    requirements: [
      { label: 'Typical torque', value: '45-500 N·cm', note: 'Feeding, winding, and material handling modules span from compact direct drive to reduced-speed torque output.' },
      { label: 'Speed target', value: '180-1000 rpm', note: 'Winding and feed systems often favor stable, repeatable motion over aggressive acceleration.' },
      { label: 'IP target', value: 'IP40-IP54', note: 'Dust and lint exposure can push enclosures and maintenance planning above general indoor assumptions.' },
      { label: 'Feedback', value: 'Open loop or gearbox-led control', note: 'Many textile modules stay open loop unless line synchronization or traceability demands more feedback.' },
    ],
    caseStudies: [
      {
        title: 'Feeder line refresh',
        summary: 'A textile-machine service team needed a more standard motor platform for recurring feeder replacements.',
        outcome: 'A compact stepper and PSU pairing reduced spares variance across several machines.',
      },
      {
        title: 'Winding torque improvement',
        summary: 'A torque-limited output stage needed more pulling force without a larger cabinet footprint.',
        outcome: 'A gearbox-based solution improved output torque while leaving upstream controls familiar to maintenance teams.',
      },
    ],
    resources: [
      { title: 'Textile selector preset', meta: 'Selector', description: 'Open the selector with textile demand already captured as the industry context.', href: '/selector?category=gearmotor&industry=textile' },
      { title: 'Shipping and customs support', meta: 'Support', description: 'Review export and fulfillment support when field replacements matter more than one-time prototyping.', href: '/support/shipping' },
    ],
    faq: [
      { question: 'Why are gearboxes common in textile equipment?', answer: 'They raise usable output torque while preserving a compact upstream motor footprint for legacy machine envelopes.' },
      { question: 'Do textile lines usually need custom development?', answer: 'Only when the shaft, mounting, enclosure, or duty-cycle assumptions move past stocked catalog hardware.' },
    ],
  },
  {
    slug: 'photonics',
    title: 'Photonics',
    summary: 'Fine positioning motion for optical alignment, shutter modules, compact stages, and beam-path adjustments.',
    painSummary: 'Photonics systems usually favor repeatable fine motion, compact mechanics, and careful actuator or encoder selection over mass-market torque density.',
    imageSrc: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=80',
    selectorCategory: 'linear-actuator',
    selectorIndustry: 'photonics',
    recommendedCategorySlugs: ['linear-motion', 'nema-17-stepper-motor', 'power-supplies'],
    featuredProductIds: ['prod-8', 'prod-1', 'prod-3'],
    requirements: [
      { label: 'Typical torque', value: '30-300 N·cm', note: 'Optical stages and shutters often favor control quality and travel definition over raw torque.' },
      { label: 'Speed target', value: '100-600 rpm', note: 'Settling behavior and fine positioning typically dominate over very high speed.' },
      { label: 'IP target', value: 'IP40', note: 'Indoor lab and optical systems usually prioritize cleanliness and mechanical stability instead of sealed housings.' },
      { label: 'Feedback', value: 'Open loop or encoder-ready', note: 'Encoder feedback appears when alignment tolerance or motion verification is especially strict.' },
    ],
    caseStudies: [
      {
        title: 'Optical alignment stage',
        summary: 'A compact positioning stage needed defined travel and lower assembly complexity.',
        outcome: 'An actuator-style approach simplified the mechanical stack and reduced assembly variation.',
      },
      {
        title: 'Beam-control subassembly review',
        summary: 'A prototype module outgrew off-the-shelf mechanics and needed integrated engineering review.',
        outcome: 'The program moved into RFQ with custom control and packaging assumptions documented early.',
      },
    ],
    resources: [
      { title: 'Photonics selector preset', meta: 'Selector', description: 'Use a travel-first selector preset for fine positioning scenarios.', href: '/selector?category=linear-actuator&industry=photonics' },
      { title: 'Custom development for optical packaging', meta: 'RFQ', description: 'Use the custom brief when actuator packaging or connectors move beyond the catalog line.', href: '/custom' },
    ],
    faq: [
      { question: 'When is an actuator better than a rotary motor plus screw?', answer: 'When travel is already defined and reducing mechanical integration complexity matters more than exposing every subcomponent separately.' },
      { question: 'Do photonics programs usually require RFQ?', answer: 'They often do once tolerance, packaging, or encoder assumptions move past a simple stocked motion module.' },
    ],
  },
  {
    slug: 'aerospace',
    title: 'Aerospace',
    summary: 'Motion stacks for test rigs, subsystems, and harsh-environment reviews where control and documentation both matter.',
    painSummary: 'Aerospace-adjacent programs usually care about traceability, environmental discipline, and higher-risk commercial review rather than rapid commodity sourcing alone.',
    imageSrc: 'https://images.unsplash.com/photo-1517976547714-720226b864c1?auto=format&fit=crop&w=1400&q=80',
    selectorCategory: 'servo',
    selectorIndustry: 'aerospace',
    recommendedCategorySlugs: ['nema-23-stepper-motor', 'gearboxes', 'power-supplies'],
    featuredProductIds: ['prod-2', 'prod-3', 'prod-7'],
    requirements: [
      { label: 'Typical torque', value: '180-500 N·cm', note: 'Test rigs and compact subsystems often need torque margin with documentation-aware control choices.' },
      { label: 'Speed target', value: '180-1500 rpm', note: 'Programs range from slow reduced-speed fixtures to higher-speed integrated motion modules.' },
      { label: 'IP target', value: 'IP54 or review-based', note: 'Environmental expectations vary by subsystem, so many aerospace programs move quickly into engineering review.' },
      { label: 'Feedback', value: 'Encoder or integrated control', note: 'Feedback is common where test confidence, diagnostics, or controlled motion profiles are mandatory.' },
    ],
    caseStudies: [
      {
        title: 'Ground-test fixture update',
        summary: 'A fixture team needed more torque margin and cleaner commercial control over recurring maintenance parts.',
        outcome: 'The program moved from catalog comparison into a structured RFQ with documented assumptions.',
      },
      {
        title: 'Compact subsystem review',
        summary: 'An engineering group used a stocked motor as a reference but needed broader environmental review.',
        outcome: 'Custom development intake captured the packaging and control changes before quotation.',
      },
    ],
    resources: [
      { title: 'Aerospace selector preset', meta: 'Selector', description: 'Open the selector with an aerospace-oriented motion preset already applied.', href: '/selector?category=servo&industry=aerospace' },
      { title: 'Open RFQ workspace', meta: 'RFQ', description: 'Jump to the quote workflow when the program needs controlled commercial review.', href: '/quote' },
    ],
    faq: [
      { question: 'Are aerospace programs usually direct-buy?', answer: 'Not usually. Even when a stocked SKU starts the discussion, many aerospace-adjacent programs move into inquiry or custom review.' },
      { question: 'Why keep catalog products on the page at all?', answer: 'They provide a fast technical starting point before the engineering and compliance questions are escalated into RFQ.' },
    ],
  },
  {
    slug: 'automotive-test',
    title: 'Automotive Test',
    summary: 'Motion stacks for endurance rigs, actuator benches, HIL fixtures, and repeatable lab automation.',
    painSummary: 'Automotive test teams care about repeatability, easy service, and structured commercial follow-up once one rig design rolls across multiple benches.',
    imageSrc: 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=1400&q=80',
    selectorCategory: 'stepper',
    selectorIndustry: 'automotive-test',
    recommendedCategorySlugs: ['nema-23-stepper-motor', 'gearboxes', 'linear-motion'],
    featuredProductIds: ['prod-2', 'prod-4', 'prod-8'],
    requirements: [
      { label: 'Typical torque', value: '120-320 N·cm', note: 'Fixture motion, valve actuation, and endurance benches span both rotary and linear formats.' },
      { label: 'Speed target', value: '180-1200 rpm', note: 'Automotive test cells often blend fixed-cycle movement with longer endurance runs.' },
      { label: 'IP target', value: 'IP40-IP54', note: 'Lab environments vary, but cable discipline and service access are consistently important.' },
      { label: 'Feedback', value: 'Closed loop or actuator reference', note: 'Feedback is common when repeatability and recovery matter across long-duration testing.' },
    ],
    caseStudies: [
      {
        title: 'Valve-cycle endurance rig',
        summary: 'A test team needed a more standardized motion stack across several endurance benches.',
        outcome: 'Closed-loop stepping improved repeatability while keeping service expectations familiar to the lab team.',
      },
      {
        title: 'Fixture actuation refresh',
        summary: 'A travel-defined actuation task was overbuilt with a separate motor and screw stack.',
        outcome: 'A linear actuator simplified replacement planning and reduced assembly overhead.',
      },
    ],
    resources: [
      { title: 'Automotive test selector preset', meta: 'Selector', description: 'Open the selector with automotive test already selected as the application context.', href: '/selector?category=stepper&industry=automotive-test' },
      { title: 'Contract pricing for multi-bench rollouts', meta: 'Pricing', description: 'Use contract pricing when one validated design is rolling into repeated lab deployment.', href: '/volume-pricing' },
    ],
    faq: [
      { question: 'Why do automotive test teams use both actuators and rotary motors?', answer: 'Bench hardware varies. Rotary motion handles many endurance or torque tasks, while actuators simplify linear travel modules.' },
      { question: 'When should a validated rig move to contract pricing?', answer: 'Once the design is stable and the lab or program expects repeated bench build-outs across a year.' },
    ],
  },
  {
    slug: 'renewable',
    title: 'Renewable',
    summary: 'Motion stacks for energy equipment, positioning modules, service tooling, and long-lifecycle field systems.',
    painSummary: 'Renewable-energy programs usually balance lifetime expectations, service logistics, and environmental review before they care about rapid one-off purchasing.',
    imageSrc: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&w=1400&q=80',
    selectorCategory: 'servo',
    selectorIndustry: 'renewable',
    recommendedCategorySlugs: ['power-supplies', 'gearboxes', 'nema-23-stepper-motor'],
    featuredProductIds: ['prod-3', 'prod-6', 'prod-7'],
    requirements: [
      { label: 'Typical torque', value: '180-500 N·cm', note: 'Service tooling, tracking, and compact subsystem motion each sit on different duty cycles but often need higher torque margin.' },
      { label: 'Speed target', value: '180-1500 rpm', note: 'Slow gear-reduced output and higher-speed integrated motion can exist in the same renewable program stack.' },
      { label: 'IP target', value: 'IP54 or engineering review', note: 'Field exposure and service intervals usually push the final enclosure decision into program review.' },
      { label: 'Feedback', value: 'Encoder or integrated control', note: 'Feedback becomes more common where uptime and remote diagnostics matter.' },
    ],
    caseStudies: [
      {
        title: 'Service tooling platform',
        summary: 'A renewable-equipment service group needed a sturdier motion stack and clearer commercial support path.',
        outcome: 'The project moved from ad-hoc catalog buying into a more controlled inquiry-led program.',
      },
      {
        title: 'Compact tracking subassembly review',
        summary: 'A subsystem needed more environmental margin than the default indoor catalog assumption.',
        outcome: 'Custom development intake captured enclosure and control changes before quoting.',
      },
    ],
    resources: [
      { title: 'Renewable selector preset', meta: 'Selector', description: 'Open the selector with renewable-energy demand already selected.', href: '/selector?category=servo&industry=renewable' },
      { title: 'Custom development for environmental review', meta: 'RFQ', description: 'Use the custom brief when the application moves past the standard catalog envelope.', href: '/custom' },
    ],
    faq: [
      { question: 'Do renewable programs usually start with stocked parts?', answer: 'They often start there for technical reference, but many move into RFQ once the environmental and lifecycle assumptions are documented.' },
      { question: 'When is a gearbox preferred in renewable applications?', answer: 'When a compact motor package still needs more output torque for a lower-speed mechanism or service module.' },
    ],
  },
  {
    slug: 'education',
    title: 'Education',
    summary: 'Accessible motion stacks for teaching labs, demo rigs, student projects, and repeatable training platforms.',
    painSummary: 'Education buyers usually want straightforward parts, safe documentation, and pricing that still works for repeated classroom replenishment.',
    imageSrc: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1400&q=80',
    selectorCategory: 'stepper',
    selectorIndustry: 'education',
    recommendedCategorySlugs: ['nema-17-stepper-motor', 'stepper-drivers', 'power-supplies'],
    featuredProductIds: ['prod-1', 'prod-5', 'prod-6'],
    requirements: [
      { label: 'Typical torque', value: '30-80 N·cm', note: 'Most teaching rigs and student projects stay in compact frames with approachable current and voltage requirements.' },
      { label: 'Speed target', value: '300-1200 rpm', note: 'Classroom use favors visible, controllable motion more than highly optimized industrial throughput.' },
      { label: 'IP target', value: 'IP40', note: 'Indoor lab and classroom environments usually keep the enclosure requirement simple.' },
      { label: 'Feedback', value: 'Open loop', note: 'Open loop remains the most approachable entry point unless the lesson specifically targets encoder or closed-loop control.' },
    ],
    caseStudies: [
      {
        title: 'Teaching bench standardization',
        summary: 'A training center wanted one motor-driver-PSU stack for multiple student exercises.',
        outcome: 'The platform became easier to document, stock, and restock across terms.',
      },
      {
        title: 'Senior project lab refresh',
        summary: 'A university lab needed repeatable motion hardware for multidisciplinary capstone teams.',
        outcome: 'A compact catalog stack reduced setup time and gave students a consistent starting point.',
      },
    ],
    resources: [
      { title: 'Education selector preset', meta: 'Selector', description: 'Start the selector with classroom and lab demand already selected.', href: '/selector?category=stepper&industry=education' },
      { title: 'Browse stocked classroom-friendly motors', meta: 'Catalog', description: 'Jump directly into the compact NEMA 17 catalog family.', href: '/c/nema-17-stepper-motor' },
    ],
    faq: [
      { question: 'Why is open loop still recommended for education?', answer: 'It keeps the control model approachable while still being good enough for most teaching rigs and student motion projects.' },
      { question: 'When should education buyers use volume pricing?', answer: 'When the same teaching platform is being rolled out across multiple benches, campuses, or repeated semesters.' },
    ],
  },
];

export function getSolutionIndustry(slug: string) {
  return solutionIndustries.find((industry) => industry.slug === slug) ?? null;
}