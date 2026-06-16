import { footerBrandStory, footerContactBlocks, footerCopyright, footerNewsletter, footerPaymentMethods, footerServiceHighlights, footerSupportLinks } from './site-shell';
import type { HomeData, ProductListResult, ProductListSort, StorefrontCategory, StorefrontProductDetail } from './types';

function money(amount: number) {
  return {
    currency: 'USD',
    amount,
    formatted: new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount),
  };
}

const categories: StorefrontCategory[] = [
  // 旧站真实分类（15 个）
  {
    id: 'cat-1',
    name: 'Nema 8 Stepper Motor',
    slug: 'nema-8-stepper-motor',
    description: 'Ultra-compact 20mm frame stepper motors for precision micro-devices and small automation.',
    productCount: 6,
    isFeatured: true,
    featuredOrder: 1,
  },
  {
    id: 'cat-2',
    name: 'Nema 11 Stepper Motor',
    slug: 'nema-11-stepper-motor',
    description: 'Compact 28mm frame stepper motors for light-duty positioning and feeder systems.',
    productCount: 6,
    isFeatured: true,
    featuredOrder: 2,
  },
  {
    id: 'cat-3',
    name: 'Nema 14 Stepper Motor',
    slug: 'nema-14-stepper-motor',
    description: '35mm frame stepper motors balancing size and torque for desktop CNC and 3D printers.',
    productCount: 14,
    isFeatured: true,
    featuredOrder: 3,
  },
  {
    id: 'cat-4',
    name: 'Nema 16 Stepper Motor',
    slug: 'nema-16-stepper-motor',
    description: '39mm frame stepper motors for mid-range automation and precision equipment.',
    productCount: 8,
    isFeatured: true,
    featuredOrder: 4,
  },
  {
    id: 'cat-5',
    name: 'Nema 17 Stepper Motor',
    slug: 'nema-17-stepper-motor',
    description: '42mm frame stepper motors - the industry standard for 3D printers, CNC, and robotics.',
    productCount: 59,
    isFeatured: true,
    featuredOrder: 5,
  },
  {
    id: 'cat-6',
    name: 'Nema 23 Stepper Motor',
    slug: 'nema-23-stepper-motor',
    description: '57mm frame high-torque stepper motors for CNC routers, milling, and heavy automation.',
    productCount: 35,
    isFeatured: true,
    featuredOrder: 6,
  },
  {
    id: 'cat-7',
    name: 'Nema 24 Stepper Motor',
    slug: 'nema-24-stepper-motor',
    description: '60mm frame stepper motors with enhanced torque for industrial motion systems.',
    productCount: 6,
    isFeatured: true,
    featuredOrder: 7,
  },
  {
    id: 'cat-8',
    name: 'Nema 34 Stepper Motor',
    slug: 'nema-34-stepper-motor',
    description: '86mm frame heavy-duty stepper motors for maximum torque industrial applications.',
    productCount: 13,
    isFeatured: true,
    featuredOrder: 8,
  },
  {
    id: 'cat-9',
    name: 'Stepper Motor Driver',
    slug: 'stepper-motor-driver',
    description: 'Matched driver modules for smooth microstepping control and reliable motor operation.',
    productCount: 4,
    isFeatured: true,
    featuredOrder: 9,
  },
  {
    id: 'cat-10',
    name: 'Power Supply',
    slug: 'power-supply',
    description: 'Industrial-grade power supplies optimized for stepper motor and driver systems.',
    productCount: 10,
    isFeatured: true,
    featuredOrder: 10,
  },
  {
    id: 'cat-11',
    name: 'Closed Loop Stepper Motor',
    slug: 'closed-loop-stepper-motor',
    description: 'Smart closed-loop stepper motor systems with encoder feedback for zero step loss.',
    productCount: 12,
    isFeatured: true,
    featuredOrder: 11,
  },
  {
    id: 'cat-12',
    name: 'Brushless DC Motor',
    slug: 'brushless-dc-motor',
    description: 'High-efficiency brushless DC motors for continuous duty and long service life.',
    productCount: 8,
    isFeatured: true,
    featuredOrder: 12,
  },
  {
    id: 'cat-13',
    name: 'Brushless Spindle Motor',
    slug: 'brushless-spindle-motor',
    description: 'Precision brushless spindle motors for CNC machining and high-speed applications.',
    productCount: 5,
    isFeatured: true,
    featuredOrder: 13,
  },
  {
    id: 'cat-14',
    name: 'Integrated Stepper Motor',
    slug: 'integrated-stepper-motor',
    description: 'All-in-one integrated stepper motors with built-in drivers for simplified wiring.',
    productCount: 7,
    isFeatured: true,
    featuredOrder: 14,
  },
  {
    id: 'cat-15',
    name: 'Stepper Motor',
    slug: 'stepper-motor',
    description: 'Complete lineup of NEMA stepper motors from top-tier manufacturers.',
    productCount: 150,
    isFeatured: true,
    featuredOrder: 15,
  },
];

function applyProductDefaults<T extends Record<string, unknown>>(p: T): StorefrontProductDetail {
  return {
    moq: 1,
    leadTimeMin: 3,
    leadTimeMax: 15,
    leadTimeUnit: 'business_days',
    lifecycleStatus: 'active',
    eolDate: null,
    lastTimeBuyDate: null,
    efficiencyClass: null,
    certifications: [],
    ...p,
  } as unknown as StorefrontProductDetail;
}

const _rawProducts = [
  {
    id: 'prod-1',
    name: '17 Single Shaft Bipolar Stepper Motor, 45N·cm Torque',
    slug: '17-single-shaft-bipolar-stepper-motor-45ncm',
    sku: 'VXM-17-45NCM',
    shortDescription: '1.8° step angle, 1.5A current, 40mm body, 4-wire.',
    description:
      'A catalog-ready Nema 17 motor targeted at compact automation cells, 3D printing assemblies, and precision feeders that need stable torque with repeatable performance.',
    coverImage: {
      id: 'img-1',
      url: 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=1200&q=80',
      alt: 'Industrial stepper motor close-up',
      width: 1200,
      height: 800,
    },
    gallery: [
      {
        id: 'img-1',
        url: 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=1200&q=80',
        alt: 'Industrial stepper motor close-up',
        width: 1200,
        height: 800,
      },
      {
        id: 'img-2',
        url: 'https://images.unsplash.com/photo-1565043589221-1a6fd9ae45c7?auto=format&fit=crop&w=1200&q=80',
        alt: 'Motor detail and housing',
        width: 1200,
        height: 800,
      },
    ],
    price: money(23.9),
    compareAtPrice: money(27.5),
    purchaseMode: 'buy',
    inStock: true,
    stockQuantity: 186,
    brand: {
      id: 'brand-1',
      name: 'VexMotor',
      slug: 'vexmotor',
    },
    categories: [categories[0]],
    attributes: [
      { group: 'Body Length', value: '40mm' },
      { group: 'Current', value: '1.5A' },
      { group: 'Wiring', value: '4-Wire' },
    ],
    attachments: [
      {
        id: 'att-1',
        name: 'Specification Sheet',
        url: 'https://example.com/spec/vxm-17-45ncm.pdf',
        mimeType: 'application/pdf',
      },
    ],
    relatedProducts: [],
    compatibleGroups: [],
    seoTitle: 'Nema 17 Bipolar Stepper Motor 45Ncm Torque',
    seoDescription: 'Buy a Nema 17 industrial stepper motor with 45Ncm torque and 1.5A rated current.',
    features: [
      { key: 'Torque', value: '45', unit: 'N·cm' },
      { key: 'Current', value: '1.5', unit: 'A' },
      { key: 'Step Angle', value: '1.8', unit: '°' },
    ],
  },
  {
    id: 'prod-2',
    name: '23 Stepper Motor, 240N·cm Torque, 82mm Body',
    slug: '23-stepper-motor-240ncm',
    sku: 'VXM-23-240NCM',
    shortDescription: '4A current, 82mm body, industrial torque profile for CNC and tooling.',
    description:
      'High-torque Nema 23 motor designed for larger industrial axes, tooling automation, and higher load applications.',
    coverImage: {
      id: 'img-3',
      url: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80',
      alt: 'Industrial automation assembly',
      width: 1200,
      height: 800,
    },
    gallery: [
      {
        id: 'img-3',
        url: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80',
        alt: 'Industrial automation assembly',
        width: 1200,
        height: 800,
      },
    ],
    price: money(68.5),
    compareAtPrice: null,
    purchaseMode: 'buy',
    inStock: true,
    stockQuantity: 62,
    brand: {
      id: 'brand-1',
      name: 'VexMotor',
      slug: 'vexmotor',
    },
    categories: [categories[1]],
    attributes: [
      { group: 'Body Length', value: '82mm' },
      { group: 'Current', value: '4A' },
      { group: 'Wiring', value: '4-Wire' },
    ],
    attachments: [],
    relatedProducts: [],
    compatibleGroups: [],
    seoTitle: 'Nema 23 Stepper Motor 240Ncm Torque',
    seoDescription: 'Industrial Nema 23 stepper motor for CNC and automation projects.',
    features: [
      { key: 'Torque', value: '240', unit: 'N·cm' },
      { key: 'Current', value: '4', unit: 'A' },
    ],
  },
  {
    id: 'prod-3',
    name: 'Integrated Motion Assembly for OEM Projects',
    slug: 'integrated-motion-assembly-oem',
    sku: 'VXM-OEM-ASM',
    shortDescription: 'Custom-configured assembly with engineering review and OEM quotation workflow.',
    description:
      'A quotation-led configurable motion assembly sold through RFQ rather than instant checkout, suitable for custom industrial projects.',
    coverImage: {
      id: 'img-4',
      url: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=1200&q=80',
      alt: 'Precision engineering prototype',
      width: 1200,
      height: 800,
    },
    gallery: [
      {
        id: 'img-4',
        url: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=1200&q=80',
        alt: 'Precision engineering prototype',
        width: 1200,
        height: 800,
      },
    ],
    price: money(0),
    compareAtPrice: null,
    purchaseMode: 'inquiry',
    inStock: true,
    stockQuantity: 0,
    brand: {
      id: 'brand-1',
      name: 'VexMotor',
      slug: 'vexmotor',
    },
    categories: [categories[2]],
    attributes: [{ group: 'Sales Model', value: 'Custom RFQ' }],
    attachments: [],
    relatedProducts: [],
    compatibleGroups: [],
    seoTitle: 'OEM Motion Assembly RFQ',
    seoDescription: 'Submit an inquiry for a custom integrated motion assembly.',
    features: [{ key: 'Workflow', value: 'Inquiry-first' }],
  },
  {
    id: 'prod-4',
    name: 'Closed Loop Stepper Motor Kit, 2.0N·m with Driver and Encoder',
    slug: 'closed-loop-stepper-motor-kit-2nm',
    sku: 'VXM-CL57-2NM-KIT',
    shortDescription: '57mm closed loop kit with matched driver, feedback encoder, and quick commissioning profile.',
    description:
      'A standard closed loop kit for higher reliability motion builds where missed-step protection, stable torque, and ready-to-wire packaging matter.',
    coverImage: {
      id: 'img-5',
      url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
      alt: 'Closed loop stepper kit and driver',
      width: 1200,
      height: 800,
    },
    gallery: [
      {
        id: 'img-5',
        url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
        alt: 'Closed loop stepper kit and driver',
        width: 1200,
        height: 800,
      },
    ],
    price: money(129),
    compareAtPrice: money(149),
    purchaseMode: 'buy',
    inStock: true,
    stockQuantity: 28,
    brand: {
      id: 'brand-1',
      name: 'VexMotor',
      slug: 'vexmotor',
    },
    categories: [categories[1], categories[2]],
    attributes: [
      { group: 'Frame Size', value: '57mm' },
      { group: 'Control', value: 'Closed Loop' },
      { group: 'Included', value: 'Motor + Driver + Encoder' },
    ],
    attachments: [],
    relatedProducts: [],
    compatibleGroups: [],
    seoTitle: 'Closed Loop Stepper Motor Kit 2.0Nm',
    seoDescription: 'Factory-direct closed loop stepper kit with driver and encoder feedback.',
    features: [
      { key: 'Holding Torque', value: '2.0', unit: 'N·m' },
      { key: 'Supply Voltage', value: '24-48', unit: 'VDC' },
    ],
  },
  {
    id: 'prod-5',
    name: 'Digital Stepper Driver, 18-50VDC, 1.0-4.5A',
    slug: 'digital-stepper-driver-18-50vdc',
    sku: 'VXM-DM542D',
    shortDescription: 'Matched digital driver for NEMA 17/23/24 stepper motors with smooth microstepping control.',
    description:
      'A daily-use digital stepper driver for standard motors, balancing compact packaging, stable current control, and straightforward parameter setup.',
    coverImage: {
      id: 'img-6',
      url: 'https://images.unsplash.com/photo-1553406830-ef2513450d76?auto=format&fit=crop&w=1200&q=80',
      alt: 'Industrial motor driver module',
      width: 1200,
      height: 800,
    },
    gallery: [
      {
        id: 'img-6',
        url: 'https://images.unsplash.com/photo-1553406830-ef2513450d76?auto=format&fit=crop&w=1200&q=80',
        alt: 'Industrial motor driver module',
        width: 1200,
        height: 800,
      },
    ],
    price: money(24.5),
    compareAtPrice: money(29),
    purchaseMode: 'buy',
    inStock: true,
    stockQuantity: 140,
    brand: {
      id: 'brand-1',
      name: 'VexMotor',
      slug: 'vexmotor',
    },
    categories: [categories[2]],
    attributes: [
      { group: 'Current Range', value: '1.0-4.5A' },
      { group: 'Voltage', value: '18-50VDC' },
      { group: 'Control Mode', value: 'Pulse/Dir' },
    ],
    attachments: [],
    relatedProducts: [],
    compatibleGroups: [],
    seoTitle: 'Digital Stepper Driver 18-50VDC',
    seoDescription: 'Factory-direct digital stepper driver for NEMA 17, 23, and 24 motion systems.',
    features: [
      { key: 'Input Voltage', value: '18-50', unit: 'VDC' },
      { key: 'Output Current', value: '4.5', unit: 'A max' },
    ],
  },
  {
    id: 'prod-6',
    name: 'Switching Power Supply, 48V 10A, 480W',
    slug: 'switching-power-supply-48v-10a',
    sku: 'VXM-PS-480-48',
    shortDescription: 'Industrial switching power supply sized for stepper and driver combinations in compact control cabinets.',
    description:
      'A cabinet-ready power supply used with standard motion systems where stable output and straightforward wiring are more important than unnecessary complexity.',
    coverImage: {
      id: 'img-7',
      url: 'https://images.unsplash.com/photo-1581092335397-9583eb92d232?auto=format&fit=crop&w=1200&q=80',
      alt: 'Power supply unit for motion control cabinet',
      width: 1200,
      height: 800,
    },
    gallery: [
      {
        id: 'img-7',
        url: 'https://images.unsplash.com/photo-1581092335397-9583eb92d232?auto=format&fit=crop&w=1200&q=80',
        alt: 'Power supply unit for motion control cabinet',
        width: 1200,
        height: 800,
      },
    ],
    price: money(58),
    compareAtPrice: null,
    purchaseMode: 'buy',
    inStock: true,
    stockQuantity: 54,
    brand: {
      id: 'brand-1',
      name: 'VexMotor',
      slug: 'vexmotor',
    },
    categories: [categories[3]],
    attributes: [
      { group: 'Output', value: '48V / 10A' },
      { group: 'Power', value: '480W' },
      { group: 'Input', value: '110/220VAC' },
    ],
    attachments: [],
    relatedProducts: [],
    compatibleGroups: [],
    seoTitle: '48V 10A Switching Power Supply',
    seoDescription: 'Industrial 48V switching power supply for stepper and servo control cabinets.',
    features: [
      { key: 'Rated Output', value: '48V / 10A' },
      { key: 'Power', value: '480', unit: 'W' },
    ],
  },
  {
    id: 'prod-7',
    name: 'Planetary Gearbox, 10:1 Ratio for 57mm Motor Frame',
    slug: 'planetary-gearbox-10-1-57mm',
    sku: 'VXM-PG57-10',
    shortDescription: 'Compact gearbox for stepper and servo assemblies requiring torque multiplication and controlled backlash.',
    description:
      'A matched planetary gearbox used in packaging, indexing, and automated fixtures that need a higher torque output from compact motor frames.',
    coverImage: {
      id: 'img-8',
      url: 'https://images.unsplash.com/photo-1532187643603-ba119ca4109e?auto=format&fit=crop&w=1200&q=80',
      alt: 'Planetary gearbox and shaft assembly',
      width: 1200,
      height: 800,
    },
    gallery: [
      {
        id: 'img-8',
        url: 'https://images.unsplash.com/photo-1532187643603-ba119ca4109e?auto=format&fit=crop&w=1200&q=80',
        alt: 'Planetary gearbox and shaft assembly',
        width: 1200,
        height: 800,
      },
    ],
    price: money(72),
    compareAtPrice: money(79),
    purchaseMode: 'buy',
    inStock: true,
    stockQuantity: 33,
    brand: {
      id: 'brand-1',
      name: 'VexMotor',
      slug: 'vexmotor',
    },
    categories: [categories[5]],
    attributes: [
      { group: 'Gear Ratio', value: '10:1' },
      { group: 'Frame Match', value: '57mm' },
      { group: 'Backlash', value: '< 20 arc-min' },
    ],
    attachments: [],
    relatedProducts: [],
    compatibleGroups: [],
    seoTitle: '57mm Planetary Gearbox 10:1',
    seoDescription: 'Factory-direct 10:1 planetary gearbox for 57mm stepper and servo motors.',
    features: [
      { key: 'Ratio', value: '10:1' },
      { key: 'Backlash', value: '20', unit: 'arc-min max' },
    ],
  },
  {
    id: 'prod-8',
    name: 'Electric Linear Actuator, 100mm Stroke, 24VDC',
    slug: 'electric-linear-actuator-100mm-stroke',
    sku: 'VXM-LA-100-24',
    shortDescription: 'Compact linear actuator for fixture positioning, gates, and light-duty motion modules.',
    description:
      'A compact electric linear actuator for guided positioning tasks where a clean integrated structure is preferred over separate motor and screw assembly.',
    coverImage: {
      id: 'img-9',
      url: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=1200&q=80',
      alt: 'Linear actuator on industrial bench',
      width: 1200,
      height: 800,
    },
    gallery: [
      {
        id: 'img-9',
        url: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=1200&q=80',
        alt: 'Linear actuator on industrial bench',
        width: 1200,
        height: 800,
      },
    ],
    price: money(96),
    compareAtPrice: null,
    purchaseMode: 'buy',
    inStock: true,
    stockQuantity: 21,
    brand: {
      id: 'brand-1',
      name: 'VexMotor',
      slug: 'vexmotor',
    },
    categories: [categories[4]],
    attributes: [
      { group: 'Stroke', value: '100mm' },
      { group: 'Voltage', value: '24VDC' },
      { group: 'Mounting', value: 'Inline' },
    ],
    attachments: [],
    relatedProducts: [],
    compatibleGroups: [],
    seoTitle: '24V Electric Linear Actuator 100mm Stroke',
    seoDescription: 'Compact electric linear actuator for fixture and equipment positioning.',
    features: [
      { key: 'Stroke', value: '100', unit: 'mm' },
      { key: 'Supply Voltage', value: '24', unit: 'VDC' },
    ],
  },
];

const products: StorefrontProductDetail[] = _rawProducts.map(applyProductDefaults);

const categoryGroups: HomeData['categoryGroups'] = [
  {
    id: 'group-stepper',
    title: 'Stepper Motors',
    items: [
      { id: 'stepper-1', label: 'Hybrid Stepper Motor', href: '/products?category=nema-17-stepper-motor' },
      { id: 'stepper-2', label: 'Geared Stepper Motor', href: '/products?keyword=geared stepper' },
      { id: 'stepper-3', label: 'Closed Loop Stepper Motor', href: '/products?keyword=closed loop' },
      { id: 'stepper-4', label: 'Integrated Stepper Motor', href: '/products?keyword=integrated stepper' },
      { id: 'stepper-5', label: 'Hollow Shaft Stepper Motor', href: '/products?keyword=hollow shaft' },
      { id: 'stepper-6', label: 'Waterproof Stepper Motor', href: '/products?keyword=waterproof stepper' },
    ],
  },
  {
    id: 'group-servo',
    title: 'Servo & Brushless DC Motor (BLDC)',
    items: [
      { id: 'servo-1', label: 'AC Servo Motor', href: '/products?keyword=servo motor' },
      { id: 'servo-2', label: 'DC Servo Motor', href: '/products?keyword=dc servo' },
      { id: 'servo-3', label: 'Integrated Servo Motor', href: '/products?keyword=integrated servo' },
      { id: 'servo-4', label: 'BLDC Motor', href: '/products?keyword=bldc motor' },
      { id: 'servo-5', label: 'Geared BLDC Motor', href: '/products?keyword=geared bldc' },
      { id: 'servo-6', label: 'Integrated BLDC Motor', href: '/products?keyword=integrated bldc' },
    ],
  },
  {
    id: 'group-linear',
    title: 'Linear Actuator & Linear Stepper Motor',
    items: [
      { id: 'linear-1', label: 'Linear Actuator', href: '/products?category=linear-motion' },
      { id: 'linear-2', label: 'Electric Cylinder', href: '/products?keyword=electric cylinder' },
      { id: 'linear-3', label: 'Lead Screw Linear Stepper', href: '/products?keyword=lead screw linear' },
      { id: 'linear-4', label: 'Ball Screw Linear Stepper', href: '/products?keyword=ball screw linear' },
      { id: 'linear-5', label: 'Non-Captive Linear Stepper', href: '/products?keyword=non-captive linear' },
      { id: 'linear-6', label: 'Captive Linear Stepper', href: '/products?keyword=captive linear' },
    ],
  },
  {
    id: 'group-gearboxes',
    title: 'Gearboxes',
    items: [
      { id: 'gear-1', label: 'Planetary Gearbox', href: '/products?category=gearboxes' },
      { id: 'gear-2', label: 'Helical Planetary Gearbox', href: '/products?keyword=helical gearbox' },
      { id: 'gear-3', label: 'Right Angle Gearbox', href: '/products?keyword=right angle gearbox' },
      { id: 'gear-4', label: 'Harmonic Drive Gearbox', href: '/products?keyword=harmonic drive' },
      { id: 'gear-5', label: 'Worm Drive Gearbox', href: '/products?keyword=worm gearbox' },
      { id: 'gear-6', label: 'Hollow Rotary Platform', href: '/products?keyword=hollow rotary' },
    ],
  },
  {
    id: 'group-electrical',
    title: 'Electrical',
    items: [
      { id: 'electrical-1', label: 'Switching Power Supply', href: '/products?category=power-supplies' },
      { id: 'electrical-2', label: 'DIN Rail Power Supply', href: '/products?keyword=din rail power supply' },
      { id: 'electrical-3', label: 'Transformer', href: '/products?keyword=transformer' },
      { id: 'electrical-4', label: 'Variable Frequency Drive', href: '/products?keyword=variable frequency drive' },
      { id: 'electrical-5', label: 'Encoder', href: '/products?keyword=encoder' },
      { id: 'electrical-6', label: 'Cable', href: '/products?keyword=cable' },
    ],
  },
  {
    id: 'group-mechanical',
    title: 'Mechanical Components',
    items: [
      { id: 'mechanical-1', label: 'Coupling', href: '/products?keyword=coupling' },
      { id: 'mechanical-2', label: 'Timing Pulley', href: '/products?keyword=timing pulley' },
      { id: 'mechanical-3', label: 'Linear Rail', href: '/products?keyword=linear rail' },
      { id: 'mechanical-4', label: 'Mounting Bracket', href: '/products?keyword=mounting bracket' },
      { id: 'mechanical-5', label: 'Bearing Support', href: '/products?keyword=bearing support' },
      { id: 'mechanical-6', label: 'Shaft Connector', href: '/products?keyword=shaft connector' },
    ],
  },
];

const sellingPoints: HomeData['sellingPoints'] = [
  {
    id: 'point-1',
    title: 'Quick Global Dispatch',
    description: 'Standard catalog products are prepared for faster fulfillment from stocked batches and export-ready packaging.',
  },
  {
    id: 'point-2',
    title: 'One Brand, One Source',
    description: 'Motors, drivers, gearboxes, and electrical accessories can be sourced from the same VexMotor product line.',
  },
  {
    id: 'point-3',
    title: 'Quality And Support',
    description: 'Engineering buyers get product guidance, specification confirmation, and post-order follow-up from the same team.',
  },
  {
    id: 'point-4',
    title: 'Flexible Customization',
    description: 'Custom assemblies, matched kits, and OEM-oriented modifications are supported alongside standard catalog ordering.',
  },
];

const footerSections: HomeData['footerSections'] = [
  {
    id: 'footer-products',
    title: 'Products',
    links: [
      { label: 'Nema 8 Stepper Motor', href: '/c/nema-8-stepper-motor' },
      { label: 'Nema 11 Stepper Motor', href: '/c/nema-11-stepper-motor' },
      { label: 'Nema 17 Stepper Motor', href: '/c/nema-17-stepper-motor' },
      { label: 'Nema 23 Stepper Motor', href: '/c/nema-23-stepper-motor' },
      { label: 'Nema 34 Stepper Motor', href: '/c/nema-34-stepper-motor' },
      { label: 'Stepper Motor Driver', href: '/c/stepper-motor-driver' },
      { label: 'View All Products', href: '/products' },
    ],
  },
  {
    id: 'footer-support',
    title: 'Support',
    links: [
      { label: 'FAQ', href: '/faq' },
      { label: 'Shipping & Delivery', href: '/support/shipping' },
      { label: 'Returns & Warranty', href: '/support/returns' },
      { label: 'Payment Methods', href: '/support/payment-methods' },
      { label: 'Track Order', href: 'https://www.17track.net/en', external: true },
    ],
  },
  {
    id: 'footer-company',
    title: 'Company',
    links: [
      { label: 'About Us', href: '/company/about' },
      { label: 'Blog', href: '/blog' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    id: 'footer-legal',
    title: 'Legal',
    links: [
      { label: 'Terms of Sale', href: '/legal/terms' },
      { label: 'Privacy Policy', href: '/legal/privacy' },
    ],
  },
];

function toShelfItem(item: StorefrontProductDetail, tag?: string, note?: string) {
  return {
    ...toCard(item),
    tag: tag ?? null,
    note: note ?? item.shortDescription ?? null,
  };
}

function buildSeedShelves(): HomeData['featuredShelves'] {
  return [
    {
      id: 'bestseller',
      title: 'Bestseller',
      items: [toShelfItem(products[4], 'Hot'), toShelfItem(products[1], 'Hot'), toShelfItem(products[0], 'Hot'), toShelfItem(products[3], 'Hot')],
    },
    {
      id: 'new-products',
      title: 'New Products',
      items: [toShelfItem(products[7], 'New'), toShelfItem(products[6], 'New'), toShelfItem(products[5], 'New'), toShelfItem(products[3], 'New')],
    },
    {
      id: 'sales-products',
      title: 'Specials',
      items: [toShelfItem(products[5], '-10%'), toShelfItem(products[4], '-15%'), toShelfItem(products[6], '-12%'), toShelfItem(products[0], '-8%')],
    },
    {
      id: 'used-products',
      title: 'Used Products',
      items: [toShelfItem(products[6], 'Used'), toShelfItem(products[3], 'Used'), toShelfItem(products[4], 'Used'), toShelfItem(products[2], 'Used')],
    },
  ];
}

for (const product of products) {
  product.relatedProducts = products.filter((item) => item.id !== product.id).slice(0, 2).map((item) => ({
    id: item.id,
    name: item.name,
    slug: item.slug,
    sku: item.sku,
    shortDescription: item.shortDescription,
    coverImage: item.coverImage,
    price: item.price,
    compareAtPrice: item.compareAtPrice,
    purchaseMode: item.purchaseMode,
    inStock: item.inStock,
    brand: item.brand,
  }));
}

export function getSeedHomeData(): HomeData {
  return {
    heroBanners: [
      {
        id: 'hero-1',
        eyebrow: 'Precision Motion Starts Here',
        title: 'Factory-direct stepper motors, drivers, and motion components from one self-owned brand.',
        description:
          'VexMotor focuses on the same StepMotech catalog structure as the legacy storefront, combining direct-buy parts, motion-control accessories, and RFQ support for engineers, OEM teams, and distributors.',
        primaryAction: { label: 'Shop Products', href: '/products' },
        secondaryAction: { label: 'Contact Factory', href: '/contact' },
      },
    ],
    featuredCategories: categories,
    hotSale: products.slice(0, 4).map(toCard),
    newRelease: [...products].reverse().map(toCard),
    featuredIndustries: [
      { title: 'Industrial Automation', description: 'Precision motion control in automated production lines, with +0.05 angular accuracy for CNC tools and IP67 protection for harsh environments.' },
      { title: 'Medical Devices', description: 'Sub-millimeter positioning for surgical systems, ISO 13485-oriented infusion pump motion, and low-noise operation below 40dB.' },
      { title: '3D Printing', description: 'Micron-level layer stacking with 1/256 microstepping for 0.05mm resolution and up to 20kHz pulse response.' },
      { title: 'Robotics', description: 'Multi-axis collaborative motion with EtherCAT-ready integration paths and payload-ready motion assemblies.' },
      { title: 'Automotive', description: 'Smart cabin and actuator motion backed by IATF-oriented supply expectations and wide-temperature operation.' },
      { title: 'Smart Home', description: 'Whisper-quiet automation using compact NEMA 8 microsteppers with low standby draw and IoT-friendly integration.' },
    ],
    testimonials: [
      {
        author: 'Mark Jofferson',
        quote:
          'Absolutely impressed with the quality and performance of this stepper motor. Smooth operation, precise movement, and no overheating issues even after continuous use. It\'s a great addition to my 3D printer setup.',
      },
      {
        author: 'Luies Charls',
        quote:
          'I\'ve used motors from several brands, and this one really stands out. The torque is consistent, wiring is solid, and it fits perfectly into my CNC frame. Shipping was fast too, which is always a bonus.',
      },
      {
        author: 'Jecob Goeckno',
        quote:
          'Solid product overall, quiet, efficient, and running cooler than expected. Installation was simple and straightforward. I would definitely recommend it to anyone working on robotics or motion control projects.',
      },
    ],
    trustHighlights: footerServiceHighlights,
    categoryGroups,
    sellingPoints,
    featuredShelves: buildSeedShelves(),
    mostViewedProducts: [products[0], products[4], products[1], products[5]].map(toCard),
    newsletter: footerNewsletter,
    brandStory: footerBrandStory,
    footerSections,
    footerContact: footerContactBlocks,
    paymentMethods: footerPaymentMethods,
    copyright: footerCopyright,
  };
}

export function getSeedCategories() {
  return categories;
}

export function getSeedProductsResult(input?: {
  keyword?: string;
  categorySlug?: string;
  purchaseMode?: 'buy' | 'inquiry';
  page?: number;
  pageSize?: number;
  sort?: ProductListSort;
  inStockOnly?: boolean;
}): ProductListResult {
  const page = input?.page ?? 1;
  const pageSize = input?.pageSize ?? 12;
  let baseFiltered = [...products];

  if (input?.keyword) {
    const keyword = input.keyword.toLowerCase();
    baseFiltered = baseFiltered.filter((item) =>
      [item.name, item.sku, item.shortDescription, item.description].filter(Boolean).join(' ').toLowerCase().includes(keyword),
    );
  }

  if (input?.categorySlug) {
    baseFiltered = baseFiltered.filter((item) => item.categories.some((category) => category.slug === input.categorySlug));
  }

  if (input?.inStockOnly) {
    baseFiltered = baseFiltered.filter((item) => item.inStock);
  }

  const facetSource = [...baseFiltered];
  let filtered = input?.purchaseMode ? baseFiltered.filter((item) => item.purchaseMode === input.purchaseMode) : baseFiltered;

  const sort = input?.sort ?? 'featured';
  filtered = filtered.sort((left, right) => {
    switch (sort) {
      case 'name-asc':
        return left.name.localeCompare(right.name);
      case 'price-asc':
        return left.price.amount - right.price.amount;
      case 'price-desc':
        return right.price.amount - left.price.amount;
      case 'newest':
        return right.id.localeCompare(left.id);
      case 'featured':
      default:
        return Number(right.inStock) - Number(left.inStock) || left.price.amount - right.price.amount;
    }
  });

  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize).map(toCard);

  return {
    items,
    meta: {
      page,
      pageSize,
      total: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)),
    },
    facets: [
      {
        key: 'purchaseMode',
        label: 'Purchase Mode',
        options: [
          { label: 'Direct Buy', value: 'buy', count: facetSource.filter((item) => item.purchaseMode === 'buy').length },
          { label: 'Inquiry', value: 'inquiry', count: facetSource.filter((item) => item.purchaseMode === 'inquiry').length },
        ],
      },
    ],
  };
}

export function getSeedProductBySlug(slug: string) {
  return products.find((item) => item.slug === slug) ?? null;
}

export function getSeedProductById(id: string) {
  return products.find((item) => item.id === id) ?? null;
}

function toCard(item: StorefrontProductDetail) {
  return {
    id: item.id,
    name: item.name,
    slug: item.slug,
    sku: item.sku,
    shortDescription: item.shortDescription,
    coverImage: item.coverImage,
    price: item.price,
    compareAtPrice: item.compareAtPrice,
    purchaseMode: item.purchaseMode,
    inStock: item.inStock,
    brand: item.brand,
  };
}
