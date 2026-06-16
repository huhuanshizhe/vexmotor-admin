import type { BrandStory, FooterContactBlock, HomeFooterSection, NavigationData, NewsletterModule, SupportPage, StorefrontServiceHighlight } from './types';

const productLinks = [
  {
    label: 'Stepper Motor',
    href: '/products',
    children: [
      { label: 'Nema 8 Stepper Motor', href: '/c/nema-8-stepper-motor' },
      { label: 'Nema 11 Stepper Motor', href: '/c/nema-11-stepper-motor' },
      { label: 'Nema 14 Stepper Motor', href: '/c/nema-14-stepper-motor' },
      { label: 'Nema 16 Stepper Motor', href: '/c/nema-16-stepper-motor' },
      { label: 'Nema 17 Stepper Motor', href: '/c/nema-17-stepper-motor' },
      { label: 'Nema 23 Stepper Motor', href: '/c/nema-23-stepper-motor' },
      { label: 'Nema 24 Stepper Motor', href: '/c/nema-24-stepper-motor' },
      { label: 'Nema 34 Stepper Motor', href: '/c/nema-34-stepper-motor' },
    ],
  },
  { label: 'Power Supply', href: '/c/power-supply' },
  { label: 'Stepper Motor Driver', href: '/c/stepper-motor-driver' },
  { label: 'Closed Loop Stepper Motor', href: '/c/closed-loop-stepper-motor' },
  { label: 'Brushless Spindle Motor', href: '/c/brushless-spindle-motor' },
  { label: 'Brushless DC Motor', href: '/c/brushless-dc-motor' },
  { label: 'Integrated Stepper Motor', href: '/c/integrated-stepper-motor' },
];

export const homeHeroSlides = [
  {
    label: 'Contact Us',
    href: '/contact',
    imageSrc: 'https://www.vexmotor.com/modules/cz_imageslider/views/img/49439aaed7c5afe45ee274551d13ee8ad217b95d_banner606-3.jpg',
    alt: 'Contact support banner',
    description: 'Talk directly with StepMotech about sourcing, lead times, and technical questions.',
  },
  {
    label: 'From $2.99',
    href: '/products',
    imageSrc: 'https://www.vexmotor.com/modules/cz_imageslider/views/img/3928a24e97861950ddd72a252316edb60e506c6b_banner606-1.jpg',
    alt: 'Low-price starter products banner',
    description: 'Jump to the legacy low-price search route used on the original storefront.',
  },
  {
    label: 'Free Shipping',
    href: '/support/free-shipping',
    imageSrc: 'https://www.vexmotor.com/modules/cz_imageslider/views/img/c07f59be042de7ced48f894e83e5be57187d367f_banner606-2.jpg',
    alt: 'Free shipping promotion banner',
    description: 'Orders above $299 qualify for the duty-covered shipping promise from the old site.',
  },
  {
    label: 'Stepper Motor',
    href: '/products',
    imageSrc: 'https://www.vexmotor.com/modules/cz_imageslider/views/img/02145fae0050168397ddc8a9d5076d0a263887d1_banner-slid1.png',
    alt: 'Stepper motor catalog banner',
    description: 'Browse the main motor family highlighted in the original homepage navigation area.',
  },
];

export const homeReleaseCategories = [
  { label: 'Nema 24 Stepper Motor', href: '/c/nema-24-stepper-motor', productCount: 6 },
  { label: 'Nema 23 Stepper Motor', href: '/c/nema-23-stepper-motor', productCount: 35 },
  { label: 'Nema 11 Stepper Motor', href: '/c/nema-11-stepper-motor', productCount: 6 },
  { label: 'Nema 17 Stepper Motor', href: '/c/nema-17-stepper-motor', productCount: 59 },
  { label: 'Nema 14 Stepper Motor', href: '/c/nema-14-stepper-motor', productCount: 14 },
  { label: 'Nema 8 Stepper Motor', href: '/c/nema-8-stepper-motor', productCount: 6 },
  { label: 'Nema 34 Stepper Motor', href: '/c/nema-34-stepper-motor', productCount: 13 },
  { label: 'Nema 16 Stepper Motor', href: '/c/nema-16-stepper-motor', productCount: 8 },
  { label: 'Power Supply', href: '/c/power-supply', productCount: 10 },
  { label: 'Stepper Motor Driver', href: '/c/stepper-motor-driver', productCount: 4 },
];

export const storefrontNavigationBase: Omit<NavigationData, 'categories'> = {
  utilityLinks: [
    { label: 'cart', href: '/cart' },
    { label: 'Compare', href: '/compare' },
    { label: 'Wishlist', href: '/account/wishlist' },
    { label: 'Login', href: '/login' },
  ],
  mainLinks: [
    { label: 'Home', href: '/' },
    { label: 'Products', href: '/products', children: productLinks },
    { label: 'Blog', href: '/blog' },
    { label: 'FAQ', href: '/faq' },
    { label: 'About', href: '/company/about' },
    { label: 'Contact', href: '/contact' },
  ],
};

export const footerSupportLinks: HomeFooterSection['links'] = [
  { label: 'Shipping & Delivery', href: '/support/shipping' },
  { label: 'Returns & Warranty', href: '/support/returns' },
  { label: 'Payment Methods', href: '/support/payment-methods' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Blog', href: '/blog' },
  { label: 'Track Order', href: 'https://www.17track.net/en', external: true },
  { label: 'Terms of Sale', href: '/legal/terms' },
  { label: 'Privacy Policy', href: '/legal/privacy' },
];

export const footerNewsletter: NewsletterModule = {
  title: 'Subscribe To Our Newsletter!!',
  description: 'Be Aware of The Latest News, Special Offers and Discounts',
  placeholder: 'Enter Your E-mail Address...',
  buttonLabel: 'SUBSCRIBE',
};

export const footerBrandStory: BrandStory = {
  title: 'StepMotech',
  description:
    'StepMotech is a brand owned and operated by FA Dreamworks Ltd. For over two decades, FA Dreamworks has been a trusted automation partner to global leaders like Tesla, CATL, and the BMW Group. Our precision-engineered stepper motors combine industrial-grade performance with disruptive pricing, empowering smart manufacturing ecosystems and driving the global automation revolution.',
};

export const footerContactBlocks: FooterContactBlock[] = [
  {
    title: 'Phone',
    lines: ['WhatsApp: +86-19952400441', 'Global Support: +1-518-722-7315'],
  },
  {
    title: 'Email',
    lines: ['support@stepmotech.online'],
    href: 'mailto:support@stepmotech.online',
  },
  {
    title: 'Operate Center',
    lines: ['UNIT B53, 2/F, KWAI SHING IND BLDG PHASE 1, 36-40 TAI LIN PAI ROAD, KWAI CHUNG, N.T. HONG KONG'],
  },
  {
    title: 'Technical Support Center & Warehouse',
    lines: ['UNIT B53, 2/F, KWAI SHING IND BLDG PHASE 1, 36-40 TAI LIN PAI ROAD, KWAI CHUNG, N.T. HONG KONG'],
  },
];

export const footerPaymentMethods = ['Visa', 'MasterCard', 'American Express', 'Discover', 'PayPal'];

export const footerServiceHighlights: StorefrontServiceHighlight[] = [
  {
    title: 'Free Shipping',
    description: 'Free shipping and duties on orders $299+.',
  },
  {
    title: 'Easy Returns',
    description: 'Fast returns processed within 30 days.',
  },
  {
    title: 'Secure Payments',
    description: 'Multiple secure payment options available.',
  },
  {
    title: 'Reliable Support',
    description: 'Quick support during business hours.',
  },
];

export const footerCopyright = '© 2026 StepMotech™ All Rights Reserved.';

export const supportPages: SupportPage[] = [
  {
    slug: 'payment-methods',
    title: 'Payment Methods',
    eyebrow: 'Support',
    description: 'Secure checkout and offline procurement payment options for both online orders and high-value industrial buying.',
    sections: [
      {
        title: 'Online Payments',
        bullets: [
          'Credit & Debit Cards: Visa, MasterCard, American Express, Discovery, Diners Club, and JCB.',
          'Digital Wallets: PayPal, Google Pay, and Apple Pay.',
          'Buy Now, Pay Later: Klarna and Afterpay where supported.',
          'Local payment methods appear at checkout based on your region.',
        ],
      },
      {
        title: 'Bank Transfers for High-Value Transactions',
        bullets: [
          'International Telegraphic Transfer (T/T) is supported for bulk orders and offline procurement.',
          'Domestic bank transfers are available in selected countries.',
          'Bank account details and remittance instructions are provided on request by the StepMotech account manager.',
        ],
      },
      {
        title: 'Currency, Security, and Support',
        paragraphs: [
          'Payments can be processed in multiple major currencies, with final settlement affected by exchange rates or fees charged by the customer’s financial institution.',
          'Transactions run through secure gateways with full encryption and certified third-party providers.',
          'If you need a formal quotation, pro forma invoice, or payment documentation, contact the sales or support team directly.',
        ],
      },
    ],
  },
  {
    slug: 'returns',
    title: 'Returns & Warranty',
    eyebrow: 'Support',
    description: 'Return windows, evidence requirements, deduction rules, refund timing, and warranty scope for order-linked support cases.',
    sections: [
      {
        title: 'Return Window and Refund Timing',
        bullets: [
          'Return requests must be submitted within 30 calendar days of receiving the order.',
          'Refunds are typically issued within 2 business days after inspection, with funds appearing in 10 to 15 business days depending on the payment provider.',
          'Approved returns must be shipped within 7 natural days, otherwise the return right is considered waived.',
        ],
      },
      {
        title: 'Approved Return Scenarios',
        bullets: [
          'StepMotech covers return shipping when a quality defect is confirmed or the wrong item was shipped.',
          'For change of mind, mistaken purchase, or demand change, the customer is responsible for return freight.',
          'Defective returns require clear visual evidence, including multi-angle videos, high-definition photos, and a fault description attached to the original packaging.',
        ],
      },
      {
        title: 'Deductions, Inspection, and Rights',
        paragraphs: [
          'Refund calculations may deduct inspection, secondary packaging, warehouse management, and transportation losses depending on product type.',
          'Initial export postage and packaging fees are non-refundable, and the warehouse may reject packages without an approved RMA number.',
          'Customers should use official website or email channels for return handling and may request a second inspection or submit a third-party test report if a dispute arises.',
        ],
      },
    ],
  },
  {
    slug: 'shipping-policy',
    title: 'Shipping Policy',
    eyebrow: 'Support',
    description: 'Global shipping options, delivery ranges, DDP handling, and free-shipping thresholds aligned with the legacy storefront.',
    sections: [
      {
        title: 'Order Processing and Delivery Methods',
        bullets: [
          'Orders are processed within 1 to 2 business days, with weekend and holiday orders handled on the next working day.',
          'DDP Sea + Truck: 15 to 30 business days, duties included, tracking included.',
          'DDP Air Direct: 7 to 12 business days, duties included, tracking included.',
          'Express Economy: 5 to 8 business days, duties included, tracking included.',
          'Express Priority: 3 to 5 business days, duties included, tracking included.',
          'Standard Courier: 5 to 10 business days depending on destination, with duties not included.',
        ],
      },
      {
        title: 'Regions and Duty Handling',
        paragraphs: [
          'The policy covers North America, Europe, Latin America, East and Southeast Asia, the Middle East and North Africa, Oceania, and Sub-Saharan Africa, with custom logistics support available for unlisted destinations.',
          'Orders over $299 ship via DDP with no extra customs or VAT charges, while Standard Courier shipments may require duties and VAT to be paid on delivery.',
          'StepMotech provides itemized invoices and HS code documentation to support international shipments.',
        ],
      },
      {
        title: 'Tracking and Support',
        bullets: [
          'A tracking number is sent to the customer’s email after dispatch.',
          'Address updates must be requested before the order is handed over to the carrier.',
          'Support can assist with delivery issues, shipment status, and routing questions.',
        ],
      },
    ],
  },
  {
    slug: 'clearance-duty',
    title: 'Clearance & Duty',
    eyebrow: 'Support',
    description: 'A simplified explanation of which logistics options include customs handling and when the customer remains responsible for import charges.',
    sections: [
      {
        title: 'Duty-Covered Options',
        bullets: [
          'Orders above $299 can qualify for all-inclusive DDP sea plus truck delivery with customs duties and import taxes covered.',
          'DDP Air Direct and Express Economy also cover clearance and duty charges upfront.',
          'These routes are designed for customers who want predictable landed cost without extra customs paperwork.',
        ],
      },
      {
        title: 'Standard Shipping Responsibilities',
        bullets: [
          'Standard Express or Courier delivery may require the customer to pay import duties and VAT based on local regulations.',
          'Customers may need to coordinate customs clearance directly with the local logistics provider when DDP is not supported.',
        ],
      },
      {
        title: 'Compliance Support and Recommendations',
        paragraphs: [
          'The logistics team can help with EORI numbers, import licenses, VAT reclaim support, HS code declarations, commercial invoices, and third-party forwarder coordination.',
          'For large orders or destinations with more complex customs processes, StepMotech recommends DDP services to reduce delays and unexpected charges.',
          'If you are unsure which route is appropriate for your project, contact the sales team before checkout.',
        ],
      },
    ],
  },
  {
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    eyebrow: 'Support',
    description: 'How StepMotech collects, uses, protects, and shares customer data while fulfilling orders and providing support.',
    sections: [
      {
        title: 'Information We Collect',
        bullets: [
          'Full name, contact details, shipping address, and login credentials when needed to provide services.',
          'IP address, device and browser details, and page interaction data for operational and performance purposes.',
          'Order, support, and subscription information supplied through account creation, checkout, contact forms, or marketing opt-in.',
        ],
      },
      {
        title: 'How Information Is Used',
        bullets: [
          'To fulfill and ship orders, respond to support requests, and communicate about purchases or account activity.',
          'To improve website performance and comply with legal or regulatory requirements.',
          'To send marketing content only when the customer has opted in, with unsubscribe rights available at any time.',
        ],
      },
      {
        title: 'Cookies, Sharing, and Rights',
        paragraphs: [
          'Cookies are used to remember cart contents, maintain session preferences, and analyze traffic or performance.',
          'StepMotech does not sell, rent, or trade personal information, but may share it with payment processors, logistics providers, and authorities when legally required.',
          'Customers may request access, correction, deletion, portability, or restriction of their data by contacting support@stepmotech.online.',
        ],
      },
      {
        title: 'Security and Retention',
        paragraphs: [
          'The policy references SSL encryption, restricted internal access, firewalls, ongoing security monitoring, and employee data protection training.',
          'Data is retained only as long as needed to complete transactions, satisfy legal requirements, or support legitimate business interests such as fraud prevention.',
        ],
      },
    ],
  },
  {
    slug: 'terms-and-conditions',
    title: 'Terms & Conditions',
    eyebrow: 'Support',
    description: 'Trading terms for customs responsibility, cancellation, quality handling, warranty coverage, and lifetime technical support.',
    sections: [
      {
        title: 'Customs and Clearance Responsibilities',
        paragraphs: [
          'Cross-border tax burden depends on the shipping warehouse and destination. Orders shipped from certain overseas warehouses may include taxes, while China-warehouse shipments can follow DDU handling where import duties are not included.',
          'Customers in markets with stricter import requirements, such as India, Türkiye, Brazil, and South Africa, are expected to confirm that they are qualified for customs clearance before ordering.',
        ],
      },
      {
        title: 'Cancellation and Quality Issues',
        bullets: [
          'Cancellation requests must be submitted promptly by email and are only valid before the parcel is handed to the carrier.',
          'If a suspected defect appears within 30 days of receipt, customers should contact technical support so the issue can be tested and handled through return, replacement, or repair.',
          'Problems caused by improper operation or human damage may result in repair charges outside the warranty scope.',
        ],
      },
      {
        title: 'Warranty and Lifetime Support',
        bullets: [
          'The legacy terms state a 3-year warranty from the delivery date for performance failures, functional failures, or significant defects under normal use.',
          'Warranty exclusions include misuse, non-functional cosmetic defects, and issues arising outside the warranty period.',
          'Even after the warranty period ends, StepMotech commits to lifetime technical support with advance notice of any material or service charges for paid repair options.',
        ],
      },
    ],
  },
  {
    slug: 'affiliate',
    title: 'Affiliate Program',
    eyebrow: 'Support',
    description: 'Creator and publisher partnership information copied from the AWIN-backed StepMotech affiliate page.',
    primaryAction: {
      label: 'Join On AWIN',
      href: 'https://ui.awin.com/express-signup/en/awin/116843/f224f04e-55e0-4ac6-879c-5584bca442f3?t=sTwJPi8_8Du3OYkRbYqmHDwepcB-fJXyh0L8N4_18tY',
      external: true,
    },
    secondaryAction: {
      label: 'Contact Partnership Team',
      href: '/contact',
    },
    sections: [
      {
        title: 'Why Partner with StepMotech',
        paragraphs: [
          'The affiliate page positions StepMotech as a global brand for industrial-grade stepper motors serving engineers, makers, and motion-control professionals building CNC, 3D printing, robotics, and automation systems.',
        ],
      },
      {
        title: 'What You Get',
        bullets: [
          '10% commission on every sale referred through your content.',
          'Free review kits for qualified creators.',
          'Custom discount codes, fast support from the affiliate team, and monthly featured campaigns or bundles.',
        ],
      },
      {
        title: 'Who Should Join',
        bullets: [
          'Creators covering CNC builds, 3D printers, DIY robotics, motion control, electronics, maker projects, or engineering blogs.',
          'Technical reviewers and publishers with an audience that needs practical industrial motion products.',
        ],
      },
      {
        title: 'How to Join',
        paragraphs: ['The legacy site sends applicants through AWIN. After approval, partners receive tracking links, creatives, and campaign updates.'],
      },
    ],
  },
  {
    slug: 'free-shipping',
    title: 'Free Shipping',
    eyebrow: 'Support',
    description: 'Promotion details for sea-freight and duty-inclusive offers, plus the newsletter-led qualification flow shown on the original site.',
    sections: [
      {
        title: 'Offer Overview',
        paragraphs: [
          'The legacy page promotes free shipping and duty-free handling on qualified orders, positioning the offer around StepMotech’s sea freight program.',
          'It also highlights insider news, technical tips, and special member-only offers distributed through the mailing list.',
        ],
      },
      {
        title: 'Why Subscribe',
        bullets: [
          'Free sea freight shipping and duty-free handling on qualifying orders.',
          'Early access to promotions, new product launches, and restocks.',
          'Tailored offers based on industry or project requirements.',
          'Expert tips and how-to guides from in-house engineers.',
        ],
      },
      {
        title: 'Claim the Offer in Three Steps',
        bullets: [
          'Fill out the subscription form with contact or company information.',
          'Confirm the email address.',
          'Receive shipping eligibility details and next steps by email.',
        ],
      },
      {
        title: 'Promotion Details',
        paragraphs: [
          'The page states that free sea freight and duty-free benefits apply to qualified online orders over $299, while some promotional wording also references an order weight threshold. Large-volume or B2B orders are handled separately by the offline sales team with custom pricing and logistics.',
          'StepMotech reserves the right to modify or interpret the terms of the offer at any time.',
        ],
      },
    ],
  },
];

export function getSupportPageBySlug(slug: string) {
  return supportPages.find((page) => page.slug === slug) ?? null;
}