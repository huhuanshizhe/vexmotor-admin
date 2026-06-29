import type { BrandStory, FooterContactBlock, HomeFooterSection, NewsletterModule, StorefrontServiceHighlight } from './types';

/** Dev seed / fallback footer copy — not served by storefront APIs. */
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
  { title: 'Free Shipping', description: 'Free shipping and duties on orders $299+.' },
  { title: 'Easy Returns', description: 'Fast returns processed within 30 days.' },
  { title: 'Secure Payments', description: 'Multiple secure payment options available.' },
  { title: 'Reliable Support', description: 'Quick support during business hours.' },
];

export const footerCopyright = '© 2026 StepMotech™ All Rights Reserved.';

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
