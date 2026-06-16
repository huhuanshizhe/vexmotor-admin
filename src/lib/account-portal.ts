export const accountNavLinks = [
  { href: '/account', label: 'Overview' },
  { href: '/account/orders', label: 'Orders' },
  { href: '/account/quotes', label: 'Quotes' },
  { href: '/account/reorder', label: 'Reorder' },
  { href: '/account/lists', label: 'Lists' },
  { href: '/account/addresses', label: 'Addresses' },
  { href: '/account/company', label: 'Company' },
  { href: '/account/invoices', label: 'Invoices' },
  { href: '/account/downloads', label: 'Downloads' },
  { href: '/account/company#team', label: 'Team' },
  { href: '/account/settings', label: 'Settings' },
  { href: '/account/wishlist', label: 'Wishlist' },
  { href: '/account/inquiries', label: 'Inquiries' },
] as const;

export type AccountQuoteStatus = 'Submitted' | 'Quoted' | 'Negotiating' | 'Won' | 'Expired';
export type AccountInvoiceStatus = 'Paid' | 'Due' | 'Overdue';
export type AccountVerificationStatus = 'Pending' | 'Verified' | 'Rejected';

export type AccountQuoteRecord = {
  quoteNumber: string;
  projectName: string;
  status: AccountQuoteStatus;
  createdAt: string;
  expiresAt: string;
  lineCount: number;
  valueLabel: string;
  projectSummary: string;
  contactOwner: string;
  lines: Array<{
    sku: string;
    description: string;
    quantity: number;
    unitLabel: string;
    leadTime: string;
    note: string;
  }>;
  attachments: Array<{
    name: string;
    type: string;
    href: string;
  }>;
  messages: Array<{
    from: string;
    role: string;
    timestamp: string;
    body: string;
    tone?: 'internal';
  }>;
  linkedOrderNumber?: string;
};

export type AccountDownloadRecord = {
  id: string;
  fileName: string;
  type: string;
  version: string;
  language: string;
  sizeLabel: string;
  updatedAt: string;
  updated: boolean;
  productLabel: string;
  productSlug: string;
  href: string;
};

export type AccountSavedList = {
  id: string;
  name: string;
  description: string;
  itemCount: number;
  updatedAt: string;
  scope: 'Private' | 'Team' | 'Public link readonly';
  sharedWith: string[];
  items: Array<{
    productSlug: string;
    sku: string;
    quantity: number;
    note: string;
    stockLabel: string;
    priceLabel: string;
  }>;
};

export type AccountInvoiceRecord = {
  invoiceNumber: string;
  date: string;
  orderNumber: string;
  amountLabel: string;
  currency: string;
  status: AccountInvoiceStatus;
  dueDate: string;
};

export const accountQuoteRecords: AccountQuoteRecord[] = [
  {
    quoteNumber: 'QT-240182',
    projectName: 'Robotics palletizer refresh',
    status: 'Quoted',
    createdAt: '2026-05-12',
    expiresAt: '2026-06-06',
    lineCount: 3,
    valueLabel: '$4,820',
    projectSummary: 'Matched motors, drivers, and power stage for a three-axis palletizer retrofit with panel re-use constraints.',
    contactOwner: 'Lina Zhou',
    lines: [
      { sku: 'VXM-23-240NCM', description: '23 Stepper Motor, 240N·cm Torque, 82mm Body', quantity: 12, unitLabel: '$68.50 / ea', leadTime: '5 working days', note: 'Primary axis motor for Z and pusher stations.' },
      { sku: 'VXM-DM542D', description: 'Digital Stepper Driver, 18-50VDC, 1.0-4.5A', quantity: 12, unitLabel: '$24.50 / ea', leadTime: '5 working days', note: 'Quoted with 1600 pulse/rev default profile.' },
      { sku: 'VXM-PS-480-48', description: 'Switching Power Supply, 48V 10A, 480W', quantity: 4, unitLabel: '$58.00 / ea', leadTime: '7 working days', note: 'Shared bus sizing assumes three axes per cabinet block.' },
    ],
    attachments: [
      { name: 'Motor datasheet pack', type: 'PDF', href: '/resources/download/vxm-23-240ncm-datasheet-en' },
      { name: 'Commissioning checklist pack', type: 'ZIP', href: '/resources/download/commissioning-checklist-pack' },
      { name: 'Compliance playbook', type: 'PDF', href: '/resources/download/export-compliance-playbook' },
    ],
    messages: [
      { from: 'North Ridge Automation', role: 'Buyer', timestamp: '2026-05-12 09:14', body: 'Need the quoted stack to stay inside the existing 48V cabinet and preserve connector spacing for field service.' },
      { from: 'Lina Zhou', role: 'Sales engineer', timestamp: '2026-05-13 14:22', body: 'Quoted with 48V cabinet reuse in mind. The driver recommendation keeps the requested pulse-dir interface and leaves thermal margin for summer ambient.' },
      { from: 'Motion applications desk', role: 'Engineering', timestamp: '2026-05-14 10:05', body: 'Please confirm whether the pusher station requires brake hold on power loss. That changes the preferred motor family.', tone: 'internal' },
    ],
  },
  {
    quoteNumber: 'QT-240155',
    projectName: 'Packaging line torque review',
    status: 'Negotiating',
    createdAt: '2026-05-04',
    expiresAt: '2026-05-31',
    lineCount: 2,
    valueLabel: '$2,960',
    projectSummary: 'Feeder and indexing axis review for a film-feed line with gearbox torque multiplication.',
    contactOwner: 'Marco Hsu',
    lines: [
      { sku: 'VXM-PG57-10', description: 'Planetary Gearbox, 10:1 Ratio for 57mm Motor Frame', quantity: 8, unitLabel: '$72.00 / ea', leadTime: '8 working days', note: 'Backlash target stays below 20 arc-min for short indexing moves.' },
      { sku: 'VXM-CL57-2NM-KIT', description: 'Closed Loop Stepper Motor Kit, 2.0N·m with Driver and Encoder', quantity: 8, unitLabel: '$129.00 / ea', leadTime: '6 working days', note: 'Quoted to reduce restart losses during jam recovery.' },
    ],
    attachments: [
      { name: 'Driver tuning brief', type: 'PDF', href: '/resources/download/driver-tuning-video-brief' },
      { name: 'Robotics motion stack webinar deck', type: 'PDF', href: '/resources/download/robotics-motion-stack-webinar' },
    ],
    messages: [
      { from: 'North Ridge Automation', role: 'Buyer', timestamp: '2026-05-04 11:43', body: 'Need an alternative if the gearbox line slips beyond the current ship window.' },
      { from: 'Marco Hsu', role: 'Channel manager', timestamp: '2026-05-06 16:09', body: 'We can split the release into motors plus drivers first and ship gearboxes on the follow-up lane if the program allows staged FAT.' },
    ],
  },
  {
    quoteNumber: 'QT-240102',
    projectName: 'Medical tray transport',
    status: 'Submitted',
    createdAt: '2026-04-21',
    expiresAt: '2026-05-28',
    lineCount: 2,
    valueLabel: 'Pending quote',
    projectSummary: 'Quiet indexing transport and enclosure-limited actuator selection for a diagnostic tray mover.',
    contactOwner: 'Lina Zhou',
    lines: [
      { sku: 'VXM-LA-100-24', description: 'Electric Linear Actuator, 100mm Stroke, 24VDC', quantity: 6, unitLabel: 'Pending', leadTime: 'Pending review', note: 'Evaluate against tray stroke and mounting envelope.' },
      { sku: 'VXM-OEM-ASM', description: 'Integrated Motion Assembly for OEM Projects', quantity: 2, unitLabel: 'Pending', leadTime: 'Pending review', note: 'Only if the integrated frame concept clears medical enclosure review.' },
    ],
    attachments: [
      { name: 'NDA request template', type: 'TXT', href: '/resources/download/nda-request-template' },
    ],
    messages: [
      { from: 'North Ridge Automation', role: 'Buyer', timestamp: '2026-04-21 08:36', body: 'Initial scope shared. Waiting on quiet-operation target and enclosure cross section from our mechanical lead.' },
    ],
  },
  {
    quoteNumber: 'QT-239981',
    projectName: 'CNC clamp axis retrofit',
    status: 'Expired',
    createdAt: '2026-03-10',
    expiresAt: '2026-04-02',
    lineCount: 1,
    valueLabel: '$910',
    projectSummary: 'Spare clamp axis refresh with a narrow panel footprint and limited cable bend radius.',
    contactOwner: 'Marco Hsu',
    lines: [
      { sku: 'VXM-DM542D', description: 'Digital Stepper Driver, 18-50VDC, 1.0-4.5A', quantity: 10, unitLabel: '$24.50 / ea', leadTime: 'Expired', note: 'Expired during internal budget hold.' },
    ],
    attachments: [
      { name: 'Export compliance playbook', type: 'PDF', href: '/resources/download/export-compliance-playbook' },
    ],
    messages: [
      { from: 'Marco Hsu', role: 'Channel manager', timestamp: '2026-03-28 09:55', body: 'Quote expired during buyer-side budget hold. Re-open with revised quantities when the line restart date is confirmed.' },
    ],
    linkedOrderNumber: 'SO-24044',
  },
];

export const accountDownloadRecords: AccountDownloadRecord[] = [
  {
    id: 'dl-1',
    fileName: 'VXM-17-45NCM Datasheet',
    type: 'Datasheet',
    version: 'v2.4',
    language: 'English',
    sizeLabel: '312 KB',
    updatedAt: '2026-05-20',
    updated: true,
    productLabel: '17 Single Shaft Bipolar Stepper Motor, 45N·cm Torque',
    productSlug: '17-single-shaft-bipolar-stepper-motor-45ncm',
    href: '/resources/download/vxm-17-45ncm-datasheet-en',
  },
  {
    id: 'dl-2',
    fileName: 'VXM-17-45NCM CAD Pack',
    type: 'CAD',
    version: 'v1.8',
    language: 'English',
    sizeLabel: '1.6 MB',
    updatedAt: '2026-05-18',
    updated: true,
    productLabel: '17 Single Shaft Bipolar Stepper Motor, 45N·cm Torque',
    productSlug: '17-single-shaft-bipolar-stepper-motor-45ncm',
    href: '/resources/download/vxm-17-45ncm-cad-pack',
  },
  {
    id: 'dl-3',
    fileName: 'VXM-23-240NCM Datasheet',
    type: 'Datasheet',
    version: 'v3.0',
    language: 'English',
    sizeLabel: '404 KB',
    updatedAt: '2026-04-29',
    updated: false,
    productLabel: '23 Stepper Motor, 240N·cm Torque, 82mm Body',
    productSlug: '23-stepper-motor-240ncm',
    href: '/resources/download/vxm-23-240ncm-datasheet-en',
  },
  {
    id: 'dl-4',
    fileName: 'VXM-23-240NCM Datasheet CN',
    type: 'Datasheet',
    version: 'v3.0',
    language: 'Chinese',
    sizeLabel: '406 KB',
    updatedAt: '2026-04-29',
    updated: false,
    productLabel: '23 Stepper Motor, 240N·cm Torque, 82mm Body',
    productSlug: '23-stepper-motor-240ncm',
    href: '/resources/download/vxm-23-240ncm-datasheet-zh',
  },
  {
    id: 'dl-5',
    fileName: 'Commissioning Checklist Pack',
    type: 'Checklist pack',
    version: '2026.1',
    language: 'English',
    sizeLabel: '118 KB',
    updatedAt: '2026-05-10',
    updated: true,
    productLabel: 'Shared motion cabinet toolkit',
    productSlug: 'digital-stepper-driver-18-50vdc',
    href: '/resources/download/commissioning-checklist-pack',
  },
  {
    id: 'dl-6',
    fileName: 'Export Compliance Playbook',
    type: 'Compliance',
    version: '2026.2',
    language: 'English',
    sizeLabel: '244 KB',
    updatedAt: '2026-05-05',
    updated: false,
    productLabel: 'Cross-platform documentation pack',
    productSlug: 'integrated-motion-assembly-oem',
    href: '/resources/download/export-compliance-playbook',
  },
];

export const accountSavedLists: AccountSavedList[] = [
  {
    id: 'packaging-line-refresh',
    name: 'Packaging line refresh BOM',
    description: 'Standard replacement kit used by the packaging service team for feeder and pusher stations.',
    itemCount: 4,
    updatedAt: '2026-05-22',
    scope: 'Team',
    sharedWith: ['EK', 'MH', 'RZ'],
    items: [
      { productSlug: '23-stepper-motor-240ncm', sku: 'VXM-23-240NCM', quantity: 4, note: 'Primary feeder axis spare.', stockLabel: 'In stock', priceLabel: '$68.50' },
      { productSlug: 'digital-stepper-driver-18-50vdc', sku: 'VXM-DM542D', quantity: 4, note: 'Driver pairing for same cabinet.', stockLabel: 'In stock', priceLabel: '$24.50' },
      { productSlug: 'switching-power-supply-48v-10a', sku: 'VXM-PS-480-48', quantity: 2, note: 'One spare block per cabinet pair.', stockLabel: 'In stock', priceLabel: '$58.00' },
      { productSlug: 'planetary-gearbox-10-1-57mm', sku: 'VXM-PG57-10', quantity: 2, note: 'Short indexing retrofit option.', stockLabel: 'Low stock', priceLabel: '$72.00' },
    ],
  },
  {
    id: 'medical-service-kit',
    name: 'Medical service kit',
    description: 'Field-service bundle for tray transport and quiet actuator validation.',
    itemCount: 2,
    updatedAt: '2026-05-15',
    scope: 'Private',
    sharedWith: ['EK'],
    items: [
      { productSlug: 'electric-linear-actuator-100mm-stroke', sku: 'VXM-LA-100-24', quantity: 3, note: 'Bench spares for enclosure fit check.', stockLabel: 'In stock', priceLabel: '$96.00' },
      { productSlug: 'integrated-motion-assembly-oem', sku: 'VXM-OEM-ASM', quantity: 1, note: 'Only if the integrated concept clears clinical review.', stockLabel: 'RFQ only', priceLabel: 'Request Quote' },
    ],
  },
  {
    id: 'corexy-gantry-spares',
    name: 'CoreXY gantry spares',
    description: 'Reference list for a print-farm gantry refresh with matched motor, driver, and power stage.',
    itemCount: 3,
    updatedAt: '2026-05-08',
    scope: 'Public link readonly',
    sharedWith: ['EK', 'QA'],
    items: [
      { productSlug: '17-single-shaft-bipolar-stepper-motor-45ncm', sku: 'VXM-17-45NCM', quantity: 6, note: 'X/Y gantry pair plus spares.', stockLabel: 'In stock', priceLabel: '$23.90' },
      { productSlug: 'digital-stepper-driver-18-50vdc', sku: 'VXM-DM542D', quantity: 3, note: 'Shared driver stack per machine block.', stockLabel: 'In stock', priceLabel: '$24.50' },
      { productSlug: 'switching-power-supply-48v-10a', sku: 'VXM-PS-480-48', quantity: 1, note: 'Dedicated 48V cabinet supply.', stockLabel: 'In stock', priceLabel: '$58.00' },
    ],
  },
];

export const accountInvoiceRecords: AccountInvoiceRecord[] = [
  { invoiceNumber: 'INV-240188', date: '2026-05-25', orderNumber: 'SO-24091', amountLabel: '$1,482.00', currency: 'USD', status: 'Due', dueDate: '2026-06-24' },
  { invoiceNumber: 'INV-240102', date: '2026-05-02', orderNumber: 'SO-24044', amountLabel: '$910.00', currency: 'USD', status: 'Paid', dueDate: '2026-05-16' },
  { invoiceNumber: 'INV-239978', date: '2026-04-18', orderNumber: 'SO-23987', amountLabel: '$2,146.00', currency: 'USD', status: 'Overdue', dueDate: '2026-05-02' },
  { invoiceNumber: 'INV-239941', date: '2026-04-04', orderNumber: 'SO-23955', amountLabel: '$684.00', currency: 'USD', status: 'Paid', dueDate: '2026-04-18' },
];

export const accountDashboardTodos = [
  { id: 'vat', title: 'Add VAT / trade ID', detail: 'Needed before the finance team reviews expanded Net30 coverage.', href: '/account/company' },
  { id: 'downloads', title: 'Review updated docs', detail: 'Three purchased document packs have newer versions available.', href: '/account/downloads?updated=1' },
  { id: 'team', title: 'Invite teammate', detail: 'Share lists and quote threads with the service lead before the next reorder.', href: '/account/company#team' },
  { id: 'quotes', title: 'Confirm unread quote', detail: 'One quoted program is inside its expiry window and still awaiting buyer feedback.', href: '/account/quotes' },
] as const;

export const accountRecommendedProductSlugs = [
  '17-single-shaft-bipolar-stepper-motor-45ncm',
  '23-stepper-motor-240ncm',
  'digital-stepper-driver-18-50vdc',
  'switching-power-supply-48v-10a',
] as const;

export const accountReorderCandidates = [
  {
    source: 'Past order',
    orderNumber: 'SO-24044',
    productSlug: '23-stepper-motor-240ncm',
    sku: 'VXM-23-240NCM',
    productName: '23 Stepper Motor, 240N·cm Torque, 82mm Body',
    lastQuantity: 8,
    cadence: 'every 42 days',
    availability: 'In stock',
    note: 'Last ordered with packaging line refresh kit.',
  },
  {
    source: 'Past order',
    orderNumber: 'SO-24044',
    productSlug: 'digital-stepper-driver-18-50vdc',
    sku: 'VXM-DM542D',
    productName: 'Digital Stepper Driver, 18-50VDC, 1.0-4.5A',
    lastQuantity: 8,
    cadence: 'every 42 days',
    availability: 'In stock',
    note: 'Shared with the same cabinet block as the motor reorder.',
  },
  {
    source: 'Saved list',
    orderNumber: 'packaging-line-refresh',
    productSlug: 'planetary-gearbox-10-1-57mm',
    sku: 'VXM-PG57-10',
    productName: 'Planetary Gearbox, 10:1 Ratio for 57mm Motor Frame',
    lastQuantity: 2,
    cadence: 'service spare only',
    availability: 'Low stock',
    note: 'Keep one spare pair on hand for reversal-heavy stations.',
  },
] as const;

export const accountCompanyProfile = {
  companyInfo: [
    { label: 'Legal entity', value: 'North Ridge Automation GmbH' },
    { label: 'Industry', value: 'Packaging & Robotics Integration' },
    { label: 'Company size', value: '51-200 employees' },
    { label: 'Website', value: 'www.northridge-automation.example' },
    { label: 'Registered address', value: 'Heinrich-Hertz-Str. 12, Stuttgart, Germany' },
    { label: 'Logo usage', value: 'Enabled for invoice and packing-list branding' },
  ],
  taxIds: [
    { label: 'VAT', value: 'DE318-440-212' },
    { label: 'EORI', value: 'DE124200551000123' },
    { label: 'DUNS', value: '31-844-0212' },
  ],
  verificationDocuments: [
    { name: 'Business license', status: 'Verified' as AccountVerificationStatus, note: 'Validated 2026-05-12' },
    { name: 'ISO 9001 customer copy', status: 'Verified' as AccountVerificationStatus, note: 'Accepted for vendor onboarding' },
    { name: 'Resale certificate', status: 'Pending' as AccountVerificationStatus, note: 'US state certificate pending finance review' },
  ],
  credit: {
    paymentTerms: 'Net30',
    creditLimit: '$25,000',
    availableCredit: '$18,400',
    note: 'Changing legal entity or tax ID resets manual credit review.',
  },
  shippingDefaults: [
    { label: 'Default incoterm', value: 'DAP' },
    { label: 'Courier account', value: 'FedEx import billing on file' },
    { label: 'Customs contact', value: 'trade@northridge-automation.example' },
  ],
  teamMembers: [
    { name: 'Elena Kovac', role: 'Admin', email: 'elena.kovac@northridge-automation.example' },
    { name: 'Matteo Haas', role: 'Buyer', email: 'matteo.haas@northridge-automation.example' },
    { name: 'Rina Zhao', role: 'Service lead', email: 'rina.zhao@northridge-automation.example' },
  ],
};

export const accountSettingsSections = [
  {
    id: 'profile',
    title: 'Profile',
    items: [
      { label: 'Name', value: 'Elena Kovac' },
      { label: 'Phone', value: '+49 711 555 0188' },
      { label: 'Time zone', value: 'Europe/Berlin' },
      { label: 'Language', value: 'English' },
      { label: 'Units', value: 'Metric' },
    ],
  },
  {
    id: 'security',
    title: 'Email, password, and 2FA',
    items: [
      { label: 'Primary email', value: 'elena.kovac@northridge-automation.example' },
      { label: 'Password', value: 'Last rotated 29 days ago' },
      { label: '2FA', value: 'TOTP enrollment recommended before enabling API keys' },
    ],
  },
  {
    id: 'sessions',
    title: 'Sessions',
    items: [
      { label: 'Current device', value: 'Windows · Stuttgart · Active now' },
      { label: 'Warehouse tablet', value: 'Android · 2 days ago' },
      { label: 'Old laptop', value: 'Revokable session · last seen 17 days ago' },
    ],
  },
  {
    id: 'notifications',
    title: 'Notifications',
    items: [
      { label: 'Orders', value: 'Email + webhook' },
      { label: 'Quotes', value: 'Email immediately' },
      { label: 'Engineering updates', value: 'Weekly digest' },
      { label: 'Promotions', value: 'Muted' },
    ],
  },
  {
    id: 'api-keys',
    title: 'API keys',
    items: [
      { label: 'ERP sync key', value: 'Active · created 2026-03-18' },
      { label: 'Warehouse webhook key', value: 'Rotate before 2026-06-15' },
    ],
  },
] as const;

export function getAccountQuoteByNumber(quoteNumber: string) {
  return accountQuoteRecords.find((quote) => quote.quoteNumber === quoteNumber) ?? null;
}

export function getAccountSavedListById(listId: string) {
  return accountSavedLists.find((list) => list.id === listId) ?? null;
}

export function getAccountInvoiceByNumber(invoiceNumber: string) {
  return accountInvoiceRecords.find((invoice) => invoice.invoiceNumber === invoiceNumber) ?? null;
}