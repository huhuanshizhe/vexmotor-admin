export type LegalParagraph = string;

export type LegalSection = {
  id: string;
  title: string;
  paragraphs?: LegalParagraph[];
  bullets?: string[];
  /** Optional defined-term references rendered as Glossary links beneath the section. */
  glossaryTerms?: { label: string; termId: string }[];
};

export type LegalVersion = {
  version: string;
  date: string;
  summary: string;
};

export type LegalPage = {
  slug: string;
  navLabel: string;
  title: string;
  eyebrow: string;
  description: string;
  lastUpdated: string;
  effectiveDate: string;
  sections: LegalSection[];
  versionHistory: LegalVersion[];
};

export const legalContact = {
  legalEmail: 'support@stepmotech.online',
  dpoEmail: 'support@stepmotech.online',
  dpoName: 'Data Protection Officer, STEPMOTECH Compliance Office',
  postal: 'STEPMOTECH Compliance Office, UNIT B53, 2/F, KWAI SHING IND BLDG PHASE 1, 36-40 TAI LIN PAI ROAD, KWAI CHUNG, N.T. HONG KONG',
};

export const legalPages: LegalPage[] = [
  {
    slug: 'terms',
    navLabel: 'Terms of Sale & Use',
    title: 'Terms of Sale & Use',
    eyebrow: 'Legal',
    description:
      'The trading terms that govern orders, customs clearance, cancellation, quality issue handling, and warranty between STEPMOTECH and its customers.',
    lastUpdated: '2026-06-07',
    effectiveDate: '2026-06-15',
    sections: [
      {
        id: 'duties',
        title: '1. Customs Fees and Clearance Responsibilities',
        paragraphs: [
          'Tax burden varies by shipping warehouse. Prices for EU, US, FR, UK, AU, and JP warehouses include all applicable taxes. Orders shipped from the China warehouse operate under DDU (Delivered Duty Unpaid) mode, and prices exclude import tariffs.',
          'International customers are responsible for customs duties and clearance fees. Customers in India, Turkey, Brazil, and South Africa must ensure they have the necessary customs clearance qualifications.',
          'If a package is returned due to refusal to pay customs fees, the applicable logistics costs will be deducted from the refund.',
        ],
      },
      {
        id: 'cancellation',
        title: '2. Order Cancellation',
        paragraphs: [
          'Cancellation requests must be submitted via email. A cancellation is valid only if received before the order has been handed to the carrier.',
          'After shipment has commenced, cancellation requires mutual consultation between both parties. Any disputes arising after shipment must be resolved cooperatively, with the customer working with the carrier to arrange return or receipt of the goods.',
        ],
      },
      {
        id: 'quality',
        title: '3. Product Quality Issues',
        paragraphs: [
          'Any product quality concerns must be reported to STEPMOTECH technical support within thirty (30) days of receipt. Professional testing will be conducted to determine the nature of the issue.',
          'Based on testing results, STEPMOTECH will offer a return, replacement, or repair at its discretion. If the issue is caused by improper operation or human damage, the customer bears all repair costs.',
        ],
      },
      {
        id: 'warranty',
        title: '4. Standard Warranty',
        paragraphs: [
          'STEPMOTECH provides a standard one (1) year warranty from the delivery date of the product.',
        ],
      },
    ],
    versionHistory: [
      { version: 'v4.0', date: '2026-06-07', summary: 'Updated to reflect revised trading terms covering customs clearance, order cancellation, quality issue handling, and warranty.' },
      { version: 'v3.0', date: '2026-05-01', summary: 'Clarified Net 30 credit terms and Incoterm-based risk transfer.' },
      { version: 'v2.1', date: '2025-09-12', summary: 'Updated warranty remedy language and liability cap.' },
      { version: 'v2.0', date: '2025-02-03', summary: 'Restructured into numbered articles; added force majeure clause.' },
    ],
  },
  {
    slug: 'privacy',
    navLabel: 'Privacy Policy',
    title: 'Privacy Policy',
    eyebrow: 'Legal',
    description:
      'How STEPMOTECH collects, uses, and protects personal data, and the rights available to you regarding your information.',
    lastUpdated: '2026-06-07',
    effectiveDate: '2026-06-15',
    sections: [
      {
        id: 'collection',
        title: '1. Information Collection',
        paragraphs: [
          'STEPMOTECH follows the minimum necessity principle when collecting personal data. We collect the following categories of information: identity identification (name, username, and password); contact and transaction information (email address, phone number, and delivery address); and device and network information (device type, operating system, browser type, IP address, accessed pages, and dwell time).',
          'Anonymized information that cannot be linked to an identifiable individual is not considered personal information under this policy and may be used for any legitimate business purpose.',
        ],
      },
      {
        id: 'purposes',
        title: '2. Purpose of Information Use',
        bullets: [
          'To process orders and deliver products purchased through the storefront.',
          'To ensure account security and send transaction progress and account changes via email or phone.',
          'To analyze user behavior for the purpose of optimizing and improving our website.',
          'Marketing communications are sent only with your explicit opt-in consent. You may unsubscribe at any time.',
        ],
      },
      {
        id: 'rights',
        title: '3. User Rights Protection',
        paragraphs: [
          'You have the right to access the personal information we hold about you. You may request data portability of your personal information. You may unsubscribe from marketing communications at any time.',
          'To exercise any of these rights, please contact our DPO using the details provided in the footer of this page.',
        ],
      },
    ],
    versionHistory: [
      { version: 'v4.0', date: '2026-06-07', summary: 'Revised to reflect minimum necessity collection principle, defined purposes of information use, and user rights protections.' },
      { version: 'v3.0', date: '2026-05-01', summary: 'Added explicit GDPR legal-basis table and CCPA request routing.' },
      { version: 'v2.2', date: '2025-08-20', summary: 'Updated international transfer safeguards to reference SCCs.' },
      { version: 'v2.0', date: '2025-01-15', summary: 'Separated cookies detail into a dedicated Cookies Policy.' },
    ],
  },
  {
    slug: 'cookies',
    navLabel: 'Cookies Policy',
    title: 'Cookies Policy',
    eyebrow: 'Legal',
    description:
      'The categories of cookies used on this site, what each does, how long it lasts, and how to change your consent at any time.',
    lastUpdated: '2026-05-01',
    effectiveDate: '2026-05-15',
    sections: [
      {
        id: 'overview',
        title: '1. About Cookies',
        paragraphs: [
          'Cookies are small files stored on your device. We use them to keep your cart, remember preferences, and understand site performance.',
        ],
      },
      {
        id: 'necessary',
        title: '2. Necessary Cookies',
        bullets: [
          'cart_token — preserves cart contents — session/30 days — STEPMOTECH.',
          'locale / currency / unit — store site preferences — 12 months — STEPMOTECH.',
          'cookie_consent — records your consent choice — 12 months — STEPMOTECH.',
        ],
      },
      {
        id: 'performance',
        title: '3. Performance Cookies',
        bullets: [
          'Analytics identifiers — measure page performance and traffic — up to 24 months — analytics provider.',
        ],
      },
      {
        id: 'functional',
        title: '4. Functional Cookies',
        bullets: [
          'Session preference cookies — remember UI choices such as saved filters — up to 12 months — STEPMOTECH.',
        ],
      },
      {
        id: 'marketing',
        title: '5. Marketing Cookies',
        bullets: [
          'Campaign attribution cookies — set only with consent — up to 12 months — marketing provider.',
        ],
      },
      {
        id: 'manage',
        title: '6. Managing Your Consent',
        paragraphs: [
          'You can reopen the consent manager at any time to change or withdraw your choices. Necessary cookies cannot be disabled because the storefront cannot function without them.',
        ],
      },
    ],
    versionHistory: [
      { version: 'v2.0', date: '2026-05-01', summary: 'Re-categorized cookies and added consent-manager reopen control.' },
      { version: 'v1.2', date: '2025-06-30', summary: 'Added analytics retention durations and providers.' },
    ],
  },
  {
    slug: 'ip',
    navLabel: 'IP Policy',
    title: 'Intellectual Property Policy',
    eyebrow: 'Legal',
    description:
      'How STEPMOTECH trademarks, copyrighted material, and product imagery may be used, and how to submit a DMCA takedown notice.',
    lastUpdated: '2026-05-01',
    effectiveDate: '2026-05-15',
    sections: [
      {
        id: 'trademarks',
        title: '1. Trademarks',
        paragraphs: [
          'STEPMOTECH and associated logos are trademarks of STEPMOTECH. You may not use them in a way that implies endorsement or affiliation without prior written permission.',
        ],
      },
      {
        id: 'copyright',
        title: '2. Copyright',
        paragraphs: [
          'All site content, including text, datasheets, drawings, and CAD models, is protected by copyright and may not be reproduced without authorization.',
        ],
      },
      {
        id: 'imagery',
        title: '3. Product Imagery Use',
        bullets: [
          'Approved resellers and affiliates may use unmodified product images solely to promote genuine STEPMOTECH products.',
          'Images must not be altered to misrepresent specifications or to brand non-STEPMOTECH goods.',
        ],
      },
      {
        id: 'dmca',
        title: '4. DMCA Takedown Notices',
        paragraphs: [
          'If you believe content on this site infringes your copyright, send a written notice to our Legal contact including identification of the work, the infringing URL, your contact details, and a good-faith statement.',
        ],
      },
    ],
    versionHistory: [
      { version: 'v1.1', date: '2026-05-01', summary: 'Added product-imagery usage rules for resellers and affiliates.' },
      { version: 'v1.0', date: '2025-03-10', summary: 'Initial IP policy with DMCA notice procedure.' },
    ],
  },
  {
    slug: 'export-compliance',
    navLabel: 'Export Compliance',
    title: 'Export Compliance Policy',
    eyebrow: 'Legal',
    description:
      'STEPMOTECH export-control classification, denied-party screening, restricted destinations, and the compliance obligations that apply to customers.',
    lastUpdated: '2026-05-01',
    effectiveDate: '2026-05-15',
    sections: [
      {
        id: 'classification',
        title: '1. Classification Scope',
        paragraphs: [
          'The majority of STEPMOTECH catalog products are classified as EAR99 or under a standard ECCN. Classification for a specific item is confirmed on request for regulated transactions.',
        ],
      },
      {
        id: 'screening',
        title: '2. Denied-Party Screening',
        paragraphs: [
          'Orders are screened against applicable denied-, restricted-, and sanctioned-party lists. STEPMOTECH may pause or cancel any transaction that fails screening.',
        ],
      },
      {
        id: 'restricted',
        title: '3. Restricted Destinations',
        paragraphs: [
          'STEPMOTECH does not ship to embargoed or sanctioned destinations. Orders to such destinations are rejected regardless of payment status.',
        ],
      },
      {
        id: 'end-use',
        title: '4. End-Use and End-User Limits',
        bullets: [
          'Products must not be used in prohibited end-uses, including unlawful military or weapons-related applications.',
          'Customers must provide accurate end-use and end-user information when requested.',
        ],
      },
      {
        id: 'customer-obligations',
        title: '5. Customer Compliance Obligations',
        bullets: [
          'Comply with all applicable export, re-export, and import laws of relevant jurisdictions.',
          'Do not re-export or divert products in violation of export-control regulations.',
          'Maintain records sufficient to demonstrate compliance.',
        ],
      },
      {
        id: 'reexport',
        title: '6. Re-Export Prohibition',
        paragraphs: [
          'Re-export or transfer of products in breach of applicable export-control laws is strictly prohibited and may void warranty and support entitlements.',
        ],
      },
      {
        id: 'reporting',
        title: '7. Reporting Channel',
        paragraphs: [
          'Suspected compliance violations may be reported confidentially to our Legal contact using the details in the footer.',
        ],
      },
    ],
    versionHistory: [
      { version: 'v2.0', date: '2026-05-01', summary: 'Expanded denied-party screening and re-export prohibition language.' },
      { version: 'v1.1', date: '2025-07-05', summary: 'Added end-use and end-user certification requirements.' },
    ],
  },
];

export function getLegalPageBySlug(slug: string) {
  return legalPages.find((page) => page.slug === slug) ?? null;
}
