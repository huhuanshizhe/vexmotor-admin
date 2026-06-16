export const heroBanners = [
  {
    id: 'hero-1',
    eyebrow: 'Precision Motion Components',
    title: 'Stepper motors and drivers for modern automation lines.',
    description:
      'Industrial-grade motion systems designed for CNC, robotics, medical devices, and smart manufacturing teams that need stable torque and predictable lead times.',
    primaryAction: { label: 'Browse Product Series', href: '/products' },
    secondaryAction: { label: 'Request a Quote', href: '/contact' },
  },
];

export const featuredCategories = [
  { id: 'cat-1', name: 'Nema 17 Stepper Motor', slug: 'nema-17-stepper-motor', productCount: 59 },
  { id: 'cat-2', name: 'Nema 23 Stepper Motor', slug: 'nema-23-stepper-motor', productCount: 35 },
  { id: 'cat-3', name: 'Stepper Drivers', slug: 'stepper-drivers', productCount: 12 },
  { id: 'cat-4', name: 'Power Supplies', slug: 'power-supplies', productCount: 10 },
];

export const featuredProducts = [
  {
    id: 'prod-1',
    name: '17 Single Shaft Bipolar Stepper Motor, 45N·cm Torque',
    slug: '17-single-shaft-bipolar-stepper-motor-45ncm',
    sku: 'VXM-17-45NCM',
    purchaseMode: 'buy',
    price: '$23.90',
    summary: '1.8° step angle, 1.5A current, 40mm body, 4-wire.',
  },
  {
    id: 'prod-2',
    name: '23 Stepper Motor, 240N·cm Torque, 82mm Body',
    slug: '23-stepper-motor-240ncm',
    sku: 'VXM-23-240NCM',
    purchaseMode: 'buy',
    price: '$68.50',
    summary: 'High torque motion control for automation cells and CNC tools.',
  },
  {
    id: 'prod-3',
    name: 'Integrated Motion Assembly for OEM Projects',
    slug: 'integrated-motion-assembly-oem',
    sku: 'VXM-OEM-ASM',
    purchaseMode: 'inquiry',
    price: 'Inquiry',
    summary: 'Custom-configured assembly with engineering review and lead-time planning.',
  },
];

export const featuredIndustries = [
  {
    title: 'Industrial Automation',
    description: 'Precision motion control for assembly lines, fixtures, and automated material handling.',
  },
  {
    title: 'Medical Devices',
    description: 'Quiet and consistent stepping performance for diagnostics and controlled delivery systems.',
  },
  {
    title: '3D Printing',
    description: 'Stable microstepping and repeatable positioning for fine layer deposition.',
  },
  {
    title: 'Robotics',
    description: 'Multi-axis actuation for robotic joints, feeders, and adaptive motion modules.',
  },
];

export const trustHighlights = [
  'Free shipping and duties on orders over $299',
  '30-day return support for standard catalog items',
  'Secure payment support for major global cards',
  'Fast technical support during business hours',
];

export const navigation = {
  topLinks: [
    { label: 'Products', href: '/products' },
    { label: 'Resources', href: '/resources' },
    { label: 'Applications', href: '/applications' },
    { label: 'Blog', href: '/blog' },
    { label: 'Tech FAQ', href: '/tech-faq' },
    { label: 'Glossary', href: '/glossary' },
    { label: 'Certifications', href: '/company/certifications' },
    { label: 'About Us', href: '/company/about' },
    { label: 'FAQ', href: '/faq' },
    { label: 'Contact', href: '/contact' },
  ],
};
