export type StorefrontFaq = {
  id: string;
  question: string;
  answer: string;
};

export type KnowledgeLinkedProduct = {
  slug: string;
  name: string;
  sku: string;
  purchaseMode: 'buy' | 'inquiry';
  priceLabel: string;
  shortDescription?: string;
};

export const storefrontFaqs: StorefrontFaq[] = [
  {
    id: 'direct-buy-vs-inquiry',
    question: 'How do I know whether a product is direct-buy or inquiry-only?',
    answer: 'Each product detail page exposes the purchase mode. Direct-buy items show cart actions, while inquiry-mode items route into RFQ and support flows.',
  },
  {
    id: 'guest-inquiry',
    question: 'Can guests submit an inquiry?',
    answer: 'Yes. The inquiry API supports guest submission, while signed-in users can later review inquiry history from the account center.',
  },
  {
    id: 'rfq-details',
    question: 'What details should I include in an RFQ?',
    answer: 'Include quantity, target market, delivery expectations, voltage or torque requirements, and any customization notes that affect feasibility.',
  },
  {
    id: 'lead-times-moq',
    question: 'Are lead times and MOQ fixed for all products?',
    answer: 'No. Standard catalog items and OEM projects follow different operational rules, which is why the storefront separates direct-buy and RFQ flows.',
  },
  {
    id: 'matched-drivers-and-assemblies',
    question: 'Do you support matched drivers, accessories, and assemblies?',
    answer: 'Yes. The catalog and support content are structured to help buyers navigate motors, drivers, power supplies, gearboxes, and custom motion combinations.',
  },
  {
    id: 'track-orders-and-rfqs',
    question: 'Where can I track orders or RFQs after submission?',
    answer: 'Orders, addresses, wishlist items, and inquiry records are available through the account center after sign-in.',
  },
];

export const techFaqCategories = ['Stepper', 'BLDC', 'Servo', 'Drivers', 'Wiring', 'Sizing', 'Compliance', 'Shipping'] as const;

export type TechFaqCategory = (typeof techFaqCategories)[number];

export type TechFaqEntry = {
  id: string;
  category: TechFaqCategory;
  question: string;
  searchSummary: string;
  answer: {
    paragraphs: string[];
    bullets?: string[];
    formula?: {
      label: string;
      expression: string;
    };
    codeSample?: {
      label: string;
      code: string;
    };
  };
  relatedGlossaryTermIds: string[];
  relatedProductSlugs: string[];
};

export type GlossaryTerm = {
  id: string;
  term: string;
  synonyms: string[];
  searchSummary: string;
  definition: string[];
  relatedTermIds: string[];
  relatedProductSlugs: string[];
};

export const techFaqEntries: TechFaqEntry[] = [
  {
    id: 'stepper-microstepping-noise',
    category: 'Stepper',
    question: 'Why does a stepper still sound rough after I raise the microstep setting?',
    searchSummary: 'Microstepping smooths current shape, but it does not remove resonance, poor mechanics, or unrealistic acceleration commands by itself.',
    answer: {
      paragraphs: [
        'Microstep count mainly changes how the driver shapes phase current. If the axis is still exciting a structural resonance, the motor can remain noisy even at 16x or 32x microstepping.',
        'Treat microstepping as one tuning lever, not a universal fix. Stable results usually come from matching current, acceleration, coupling stiffness, and supply headroom at the same time.',
      ],
      bullets: [
        'Start at 8x or 16x before pushing higher divisions.',
        'Confirm the driver current against the motor nameplate instead of tuning only by sound.',
        'Check belt tension, coupling preload, and frame stiffness before blaming the motor.',
      ],
    },
    relatedGlossaryTermIds: ['microstepping', 'detent-torque', 'holding-torque'],
    relatedProductSlugs: ['17-single-shaft-bipolar-stepper-motor-45ncm', 'digital-stepper-driver-18-50vdc'],
  },
  {
    id: 'closed-loop-stepper-fit',
    category: 'Stepper',
    question: 'When is a closed-loop stepper a better fit than open-loop?',
    searchSummary: 'Closed-loop stepper starts to pay off when missed-step risk, restart cost, or duty cycle make open-loop uncertainty expensive.',
    answer: {
      paragraphs: [
        'Open-loop stepper is still the right first stop for many catalog axes, but closed-loop becomes attractive once recovery from a lost position is more expensive than the encoder and tuned driver.',
        'Use it when the axis must keep a tighter error envelope, survive load variation, or report fault conditions during unattended operation.',
      ],
      bullets: [
        'Choose open-loop first for cost-sensitive fixed loads.',
        'Move to closed-loop when the process cannot tolerate missed steps or manual re-homing.',
        'Validate the controller timing path before assuming encoder feedback alone solves the issue.',
      ],
    },
    relatedGlossaryTermIds: ['closed-loop', 'torque-margin', 'duty-cycle'],
    relatedProductSlugs: ['closed-loop-stepper-motor-kit-2nm', '17-single-shaft-bipolar-stepper-motor-45ncm'],
  },
  {
    id: 'bldc-bus-margin',
    category: 'BLDC',
    question: 'How much DC bus margin should I keep for BLDC peak-load events?',
    searchSummary: 'Size the bus for transient current, regenerative events, and thermal headroom rather than nominal torque alone.',
    answer: {
      paragraphs: [
        'A BLDC drive that looks fine at nominal load can still trip on acceleration spikes, fast decel energy, or a power supply that collapses under multiple axes starting together.',
        'For catalog-level planning, leave enough voltage and current margin to absorb worst-case motion events and confirm whether braking or regen handling is required upstream.',
      ],
      formula: {
        label: 'Peak mechanical power estimate',
        expression: 'P_peak = T_peak x omega_peak',
      },
      bullets: [
        'Treat 15% to 20% electrical headroom as a starting rule, not a guarantee.',
        'Review supply recovery time if several axes share one bus.',
        'Check whether deceleration energy must be dissipated or redirected before finalizing the cabinet design.',
      ],
    },
    relatedGlossaryTermIds: ['bus-voltage', 'duty-cycle', 'acceleration'],
    relatedProductSlugs: ['switching-power-supply-48v-10a', 'integrated-motion-assembly-oem'],
  },
  {
    id: 'servo-backlash-limit',
    category: 'Servo',
    question: 'When does gearbox backlash become the real servo positioning limit?',
    searchSummary: 'Once commanded moves are smaller than the drivetrain deadband, tuning harder will not recover the lost positioning resolution.',
    answer: {
      paragraphs: [
        'Servo tuning can only correct what the feedback loop can still observe and influence. If the commanded move sits inside gearbox backlash, the load may not respond even though the motor shaft does.',
        'This matters most on short indexing moves, reversal-heavy profiles, and inspection fixtures where direction changes are frequent and positional error cannot be averaged out over longer travel.',
      ],
      bullets: [
        'Compare commanded move size with the gearbox deadband at the load.',
        'Watch reversal error, not only one-direction repeatability.',
        'Do not use aggressive gain to hide a mechanical gap that should be solved in hardware selection.',
      ],
    },
    relatedGlossaryTermIds: ['backlash', 'gear-ratio', 'inertia-ratio'],
    relatedProductSlugs: ['planetary-gearbox-10-1-57mm', 'integrated-motion-assembly-oem'],
  },
  {
    id: 'servo-inertia-ratio',
    category: 'Servo',
    question: 'What inertia ratio is still reasonable before servo tuning becomes unstable?',
    searchSummary: 'A 3:1 to 5:1 load-to-motor inertia ratio is a common safe starting window for catalog sizing, but the mechanics still decide the real limit.',
    answer: {
      paragraphs: [
        'The usable inertia ratio depends on compliance, backlash, coupling stiffness, and the profile you actually plan to run. Published ratios are guidance, not a promise.',
        'If the ratio climbs quickly, consider a gearbox, a different frame, or a slower move profile before assuming the controller alone will recover the margin.',
      ],
      formula: {
        label: 'Starting catalog guideline',
        expression: 'J_load / J_motor <= 5:1',
      },
      bullets: [
        'Treat 1:1 to 3:1 as a comfortable tuning zone for many catalog axes.',
        'Above 5:1, validate the full mechanism with realistic moves instead of relying on paper sizing only.',
      ],
    },
    relatedGlossaryTermIds: ['inertia-ratio', 'gear-ratio', 'torque-margin'],
    relatedProductSlugs: ['planetary-gearbox-10-1-57mm', 'electric-linear-actuator-100mm-stroke'],
  },
  {
    id: 'driver-current-start-point',
    category: 'Drivers',
    question: 'Where should I start with stepper driver current and idle current?',
    searchSummary: 'Start from rated phase current, then trim idle current and microstep only after temperature, noise, and torque are measured together.',
    answer: {
      paragraphs: [
        'Most field problems start with current guessed from online examples rather than the motor data. Set the driver from the motor rating first, then measure case temperature and missed-step risk under real load.',
        'Idle current should reduce heat without starving the axis during restart or holding conditions that still need torque.',
      ],
      codeSample: {
        label: 'Practical first-pass setup',
        code: 'Peak current: 3.0 A\nIdle current: 50%\nMicrostep: 1600 pulses/rev\nAccel ramp: conservative first run',
      },
      bullets: [
        'Change one variable at a time during commissioning.',
        'Thermal readings after 30 minutes are more useful than one quick bench check.',
      ],
    },
    relatedGlossaryTermIds: ['holding-torque', 'microstepping', 'bus-voltage'],
    relatedProductSlugs: ['digital-stepper-driver-18-50vdc', '17-single-shaft-bipolar-stepper-motor-45ncm'],
  },
  {
    id: 'wiring-noise-rule',
    category: 'Wiring',
    question: 'What wiring rule prevents most encoder and pulse-dir noise issues?',
    searchSummary: 'Keep a clean star reference, separate power from signal, and terminate shields intentionally instead of tying everything everywhere.',
    answer: {
      paragraphs: [
        'Noise issues are usually wiring topology problems before they are mysterious firmware bugs. Mixed returns, parallel power and signal routing, and random shield termination points create most of the trouble.',
        'Build one clean cabinet reference strategy first, then route high-current motor wiring and low-level feedback as separate systems with deliberate crossing points.',
      ],
      codeSample: {
        label: 'Cabinet grounding sketch',
        code: 'PE chassis -> cabinet backplate\nDriver 0V -> single star point\nMotor cable shield -> cabinet entry clamp\nEncoder shield -> controller end only',
      },
      bullets: [
        'Do not run encoder and motor phase wires in the same bundle unless the cable is designed for it.',
        'Keep shield strategy consistent across the full cabinet, not only one device.',
      ],
    },
    relatedGlossaryTermIds: ['emc-grounding', 'closed-loop'],
    relatedProductSlugs: ['digital-stepper-driver-18-50vdc', 'switching-power-supply-48v-10a'],
  },
  {
    id: 'sizing-torque-margin',
    category: 'Sizing',
    question: 'How do I estimate starting torque margin before choosing a frame size?',
    searchSummary: 'Combine reflected inertia, acceleration, friction, and process load first, then add torque margin before selecting a motor frame.',
    answer: {
      paragraphs: [
        'A catalog motor can look large enough until acceleration and reflected inertia are added. Start from the full motion requirement before you compare datasheet holding torque values.',
        'Then leave margin for supply variation, heat, and the mismatch between a clean calculation and the real mechanism.',
      ],
      formula: {
        label: 'First-pass sizing equation',
        expression: 'T_required = (J_total x alpha) + T_friction + T_process',
      },
      bullets: [
        'Use running torque data at the real speed point, not only holding torque.',
        'Keep extra margin when the axis restarts under load or sees variable product weight.',
        'Re-check the motor after gearbox or screw selection changes the reflected inertia.',
      ],
    },
    relatedGlossaryTermIds: ['torque-margin', 'duty-cycle', 'holding-torque'],
    relatedProductSlugs: ['23-stepper-motor-240ncm', 'closed-loop-stepper-motor-kit-2nm'],
  },
  {
    id: 'compliance-document-pack',
    category: 'Compliance',
    question: 'Which compliance files should I ask for before PO release?',
    searchSummary: 'Ask for the document pack tied to the shipped configuration, not only the motor family headline claim.',
    answer: {
      paragraphs: [
        'For production release, the useful question is not only whether a family is compliant in principle. You need the exact declarations, material statements, and labeling support that match the shipped configuration and destination market.',
        'This is especially important when the shipment mixes catalog parts, power supplies, or integrated assemblies that may trigger different file expectations.',
      ],
      bullets: [
        'Request the declaration version, issue date, and covered SKU or assembly scope.',
        'Confirm whether RoHS, REACH, and any destination-specific labeling files are needed.',
        'Keep signed or audited documents linked to the final PO revision in the project record.',
      ],
    },
    relatedGlossaryTermIds: ['protection-index', 'emc-grounding'],
    relatedProductSlugs: ['integrated-motion-assembly-oem', 'switching-power-supply-48v-10a'],
  },
  {
    id: 'shipping-export-consolidation',
    category: 'Shipping',
    question: 'How should motors, drivers, and gearboxes be packed for export consolidation?',
    searchSummary: 'Separate fragile electronics from dense metal parts, control moisture, and label mixed cartons so receiving teams can verify contents quickly.',
    answer: {
      paragraphs: [
        'Motors and gearboxes tolerate weight better than drivers, connectors, or small accessories. Mixed export cartons need internal separation so dense hardware does not turn into impact energy against electronics in transit.',
        'Use moisture control, clear carton labeling, and receiving-friendly line-item identification when the shipment combines several motion subassemblies.',
      ],
      bullets: [
        'Bag and isolate electronics before they share a carton with motors or gearboxes.',
        'Use desiccant and sealed inner packaging for long transit lanes.',
        'Label each carton with the packed SKU mix rather than only the master shipment number.',
      ],
    },
    relatedGlossaryTermIds: [],
    relatedProductSlugs: ['digital-stepper-driver-18-50vdc', 'planetary-gearbox-10-1-57mm'],
  },
];

export const glossaryTerms: GlossaryTerm[] = [
  {
    id: 'acceleration',
    term: 'Acceleration',
    synonyms: ['Ramp rate'],
    searchSummary: 'The rate of change of speed, which directly drives torque demand through inertia.',
    definition: [
      'Acceleration describes how quickly the axis changes speed. Higher acceleration raises the torque required from the motor and driver because inertia resists the speed change.',
      'In sizing work, aggressive acceleration is often what turns a safe-looking axis into one that stalls, overheats, or demands a larger frame than expected.',
    ],
    relatedTermIds: ['torque-margin', 'inertia-ratio'],
    relatedProductSlugs: ['23-stepper-motor-240ncm', 'closed-loop-stepper-motor-kit-2nm'],
  },
  {
    id: 'backlash',
    term: 'Backlash',
    synonyms: ['Lost motion', 'Gear lash'],
    searchSummary: 'Mechanical play that appears when direction reverses before the load fully follows the motor.',
    definition: [
      'Backlash is the motion gap that appears when a drivetrain changes direction. The motor may move first while the load remains inside that deadband.',
      'It matters most in indexing, short reversal moves, and inspection systems where directional repeatability matters as much as one-way accuracy.',
    ],
    relatedTermIds: ['gear-ratio', 'inertia-ratio'],
    relatedProductSlugs: ['planetary-gearbox-10-1-57mm'],
  },
  {
    id: 'bus-voltage',
    term: 'Bus voltage',
    synonyms: ['DC link voltage'],
    searchSummary: 'The supply voltage seen by the drive power stage, which affects speed capability and transient stability.',
    definition: [
      'Bus voltage is the DC supply level feeding the drive stage. Higher voltage can improve speed capability and current regulation, but only if the full system remains inside safe electrical and thermal limits.',
      'Poor bus stability shows up during acceleration, regeneration, or multi-axis startup when one supply must support several dynamic loads.',
    ],
    relatedTermIds: ['acceleration', 'duty-cycle'],
    relatedProductSlugs: ['switching-power-supply-48v-10a', 'digital-stepper-driver-18-50vdc'],
  },
  {
    id: 'closed-loop',
    term: 'Closed-loop',
    synonyms: ['Feedback control'],
    searchSummary: 'A control architecture that uses feedback to correct position or speed error rather than assuming the command was perfectly executed.',
    definition: [
      'Closed-loop motion uses encoder or other feedback signals so the controller or drive can compare commanded motion with actual response.',
      'It does not remove the need for correct mechanics or sizing, but it improves visibility into faults and can reduce the risk of silent position loss.',
    ],
    relatedTermIds: ['microstepping', 'emc-grounding'],
    relatedProductSlugs: ['closed-loop-stepper-motor-kit-2nm', 'integrated-motion-assembly-oem'],
  },
  {
    id: 'detent-torque',
    term: 'Detent torque',
    synonyms: ['Cogging torque in a stepper context'],
    searchSummary: 'The natural resistance a permanent-magnet stepper rotor produces even with no phase current applied.',
    definition: [
      'Detent torque is the residual torque created by rotor magnet alignment when the stepper phases are not energized.',
      'It contributes to low-speed feel and can interact with resonance or microstep smoothness, especially on light-load axes.',
    ],
    relatedTermIds: ['microstepping', 'holding-torque'],
    relatedProductSlugs: ['17-single-shaft-bipolar-stepper-motor-45ncm'],
  },
  {
    id: 'duty-cycle',
    term: 'Duty cycle',
    synonyms: ['On-time ratio'],
    searchSummary: 'The share of time an axis spends under load, which heavily affects heating and continuous torque planning.',
    definition: [
      'Duty cycle captures how long and how often the axis runs, holds, rests, or repeats a demanding move profile.',
      'Average heating and power demand often depend more on duty cycle than on a single peak event, so it must be part of sizing and power planning.',
    ],
    relatedTermIds: ['acceleration', 'bus-voltage', 'torque-margin'],
    relatedProductSlugs: ['closed-loop-stepper-motor-kit-2nm', 'switching-power-supply-48v-10a'],
  },
  {
    id: 'emc-grounding',
    term: 'EMC grounding',
    synonyms: ['Noise-control grounding', 'Shield strategy'],
    searchSummary: 'Grounding and shielding practice used to control electrical noise in motion cabinets and field wiring.',
    definition: [
      'EMC grounding is the practical layout of protective earth, signal reference, and shield termination used to reduce conducted and radiated noise.',
      'In motion systems, bad EMC practice often appears as encoder errors, random drive trips, or unstable digital inputs long before it is noticed on paper.',
    ],
    relatedTermIds: ['closed-loop', 'bus-voltage'],
    relatedProductSlugs: ['digital-stepper-driver-18-50vdc', 'switching-power-supply-48v-10a'],
  },
  {
    id: 'gear-ratio',
    term: 'Gear ratio',
    synonyms: ['Reduction ratio'],
    searchSummary: 'The speed reduction and torque multiplication relationship between motor and output shaft.',
    definition: [
      'Gear ratio describes how many motor turns produce one output turn. Increasing the ratio reduces output speed while multiplying available output torque.',
      'The tradeoff includes backlash, efficiency loss, reflected inertia changes, and a different tuning feel at the load.',
    ],
    relatedTermIds: ['backlash', 'inertia-ratio'],
    relatedProductSlugs: ['planetary-gearbox-10-1-57mm'],
  },
  {
    id: 'holding-torque',
    term: 'Holding torque',
    synonyms: ['Static torque'],
    searchSummary: 'The torque a stepper can resist at standstill under rated current.',
    definition: [
      'Holding torque is measured at zero speed and is useful for comparing static capability, but it is not the same as usable running torque at operating speed.',
      'Sizing mistakes happen when holding torque is treated like a full-speed performance value without checking the real speed-torque curve.',
    ],
    relatedTermIds: ['torque-margin', 'microstepping'],
    relatedProductSlugs: ['17-single-shaft-bipolar-stepper-motor-45ncm', '23-stepper-motor-240ncm'],
  },
  {
    id: 'inertia-ratio',
    term: 'Inertia ratio',
    synonyms: ['Load-to-motor inertia ratio'],
    searchSummary: 'The relationship between reflected load inertia and motor inertia, which affects tuning difficulty and stability.',
    definition: [
      'Inertia ratio compares the reflected load seen by the motor with the motor inertia itself. Higher ratios generally make the axis harder to control cleanly.',
      'It should be evaluated together with gearbox choice, backlash, stiffness, and the actual move profile rather than as an isolated number.',
    ],
    relatedTermIds: ['gear-ratio', 'acceleration'],
    relatedProductSlugs: ['planetary-gearbox-10-1-57mm', 'electric-linear-actuator-100mm-stroke'],
  },
  {
    id: 'microstepping',
    term: 'Microstepping',
    synonyms: ['Step subdivision'],
    searchSummary: 'Driver-controlled current interpolation that divides a full motor step into finer commanded increments.',
    definition: [
      'Microstepping divides each full step into smaller current-controlled increments to improve smoothness and commanded resolution.',
      'It can reduce noise and improve feel, but it does not create unlimited real positioning accuracy if the mechanics and torque margin are weak.',
    ],
    relatedTermIds: ['detent-torque', 'holding-torque'],
    relatedProductSlugs: ['digital-stepper-driver-18-50vdc', '17-single-shaft-bipolar-stepper-motor-45ncm'],
  },
  {
    id: 'protection-index',
    term: 'Protection index',
    synonyms: ['IP rating'],
    searchSummary: 'The ingress-protection rating that describes how well an enclosure resists dust and water entry.',
    definition: [
      'Protection index, usually discussed as an IP rating, describes how well an enclosure resists solid particles and water intrusion.',
      'It is useful for product selection and compliance review, but it should not be confused with shipping protection or carton quality.',
    ],
    relatedTermIds: ['emc-grounding'],
    relatedProductSlugs: ['integrated-motion-assembly-oem', 'switching-power-supply-48v-10a'],
  },
  {
    id: 'torque-margin',
    term: 'Torque margin',
    synonyms: ['Safety factor on torque'],
    searchSummary: 'The extra usable torque kept between expected load demand and available motor torque.',
    definition: [
      'Torque margin is the buffer between the torque you expect to need and the torque the selected motor can actually provide at the operating speed.',
      'It protects against load variation, supply sag, temperature rise, and the inevitable gap between a clean model and the real machine.',
    ],
    relatedTermIds: ['holding-torque', 'duty-cycle', 'acceleration'],
    relatedProductSlugs: ['23-stepper-motor-240ncm', 'closed-loop-stepper-motor-kit-2nm'],
  },
];

export function techFaqEntryToPlainText(entry: TechFaqEntry) {
  return [
    entry.question,
    entry.searchSummary,
    ...entry.answer.paragraphs,
    ...(entry.answer.bullets ?? []),
    entry.answer.formula?.expression,
    entry.answer.codeSample?.code,
  ]
    .filter(Boolean)
    .join(' ');
}

export function glossaryTermToPlainText(term: GlossaryTerm) {
  return [
    term.term,
    term.synonyms.join(' '),
    term.searchSummary,
    ...term.definition,
  ]
    .filter(Boolean)
    .join(' ');
}

export function getTechFaqEntryById(id: string) {
  return techFaqEntries.find((entry) => entry.id === id);
}

export function getGlossaryTermById(id: string) {
  return glossaryTerms.find((term) => term.id === id);
}