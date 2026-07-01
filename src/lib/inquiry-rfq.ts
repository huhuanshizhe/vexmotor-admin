import { formatCustomerIndustryLabel, normalizeCustomerIndustry } from '@/lib/customer-industries';
import { getGeoCountryName, resolveGeoCountryIso } from '@/server/geo/divisions';

export type InquiryAttachment = {
  url: string;
  key: string;
  filename: string;
  contentType: string;
};

export type InquiryRfqProject = {
  projectName: string;
  industry: string;
  targetStartDate: string;
  annualVolumeEstimate: string;
};

export type InquiryRfqContact = {
  fullName: string;
  email: string;
  company: string;
  country: string;
  phone: string;
  vat: string;
  createAccount: boolean;
};

export type InquiryRfqCompliance = {
  unrestrictedUseConfirmed: boolean;
  complianceAccepted: boolean;
};

export type InquiryRfqLine = {
  productId: string | null;
  spu: string;
  name: string;
  slug: string;
  quantity: number | string;
  requiredBy: string;
  notes: string;
  coverImage?: { url: string; alt: string } | null;
  lineAttachments?: InquiryAttachment[];
};

export type InquiryRfqPayload = {
  project: InquiryRfqProject;
  contact: InquiryRfqContact;
  compliance: InquiryRfqCompliance;
  lines: InquiryRfqLine[];
  projectAttachments: InquiryAttachment[];
};

export type InquiryQuotedLine = {
  productId: string;
  spu: string;
  name: string;
  slug: string;
  quantity: number;
  unitPrice: number;
  currency: string;
  leadTime: string;
  note: string;
};

export function normalizeInquiryQuotedLines(
  quotedLines: InquiryQuotedLine[] | Array<Record<string, unknown>> | null | undefined,
): InquiryQuotedLine[] {
  if (!quotedLines?.length) {
    return [];
  }

  return quotedLines
    .map((raw) => {
      const line = raw as InquiryQuotedLine & {
        unit_price?: number | string;
        product_id?: string;
        sku?: string;
      };
      const productId = String(line.productId ?? line.product_id ?? '').trim();
      const spu = String(line.spu ?? line.sku ?? '').trim();
      if (!productId && !spu) {
        return null;
      }

      return {
        productId,
        spu,
        name: String(line.name ?? ''),
        slug: String(line.slug ?? ''),
        quantity: Math.max(1, Number(line.quantity) || 1),
        unitPrice: Number(line.unitPrice ?? line.unit_price ?? 0) || 0,
        currency: String(line.currency ?? 'USD').toUpperCase().slice(0, 3),
        leadTime: String(line.leadTime ?? ''),
        note: String(line.note ?? ''),
      } satisfies InquiryQuotedLine;
    })
    .filter((line): line is InquiryQuotedLine => line !== null);
}

export function hasUnsetQuotedUnitPrice(line: Pick<InquiryQuotedLine, 'unitPrice'>) {
  const unitPrice = Number(line.unitPrice);
  return !Number.isFinite(unitPrice) || unitPrice <= 0;
}

export async function normalizeRfqPayloadAsync(payload: InquiryRfqPayload): Promise<InquiryRfqPayload> {
  const industry = normalizeCustomerIndustry(payload.project.industry) ?? payload.project.industry.trim();
  const countryIso = await resolveGeoCountryIso(payload.contact.country);

  return {
    ...payload,
    project: {
      ...payload.project,
      industry,
    },
    contact: {
      ...payload.contact,
      country: countryIso ?? payload.contact.country.trim(),
    },
  };
}

/** @deprecated Use normalizeRfqPayloadAsync */
export function normalizeRfqPayloadIndustry(payload: InquiryRfqPayload): InquiryRfqPayload {
  const industry = normalizeCustomerIndustry(payload.project.industry) ?? payload.project.industry.trim();

  return {
    ...payload,
    project: {
      ...payload.project,
      industry,
    },
  };
}

export async function buildRfqMessageTextAsync(payload: InquiryRfqPayload): Promise<string> {
  const industryLabel = formatCustomerIndustryLabel(payload.project.industry, 'en') || 'Not specified';
  const countryLabel = (await getGeoCountryName(payload.contact.country)) || payload.contact.country || 'Not specified';
  const lines = [
    'RFQ PROJECT',
    `Project name: ${payload.project.projectName || 'Not specified'}`,
    `Industry: ${industryLabel}`,
    `Target start date: ${payload.project.targetStartDate || 'Not specified'}`,
    `Annual volume estimate: ${payload.project.annualVolumeEstimate || 'Not specified'}`,
    '',
    'CONTACT',
    `Full name: ${payload.contact.fullName || 'Not specified'}`,
    `Email: ${payload.contact.email || 'Not specified'}`,
    `Company: ${payload.contact.company || 'Not specified'}`,
    `Country: ${countryLabel}`,
    `Phone: ${payload.contact.phone || 'Not specified'}`,
    `VAT / Tax ID: ${payload.contact.vat || 'Not specified'}`,
    '',
    'LINE ITEMS',
    ...payload.lines.map((line, index) => [
      `${index + 1}. ${line.name}`,
      `   SPU: ${line.spu}`,
      `   Quantity: ${line.quantity}`,
      `   Required by: ${line.requiredBy || 'Not specified'}`,
      `   Notes: ${line.notes || 'Not specified'}`,
    ].join('\n')),
    '',
    'PROJECT ATTACHMENTS',
    payload.projectAttachments.length
      ? payload.projectAttachments.map((file) => file.filename).join(', ')
      : 'None',
    '',
    'COMPLIANCE',
    `Confirmed unrestricted use: ${payload.compliance.unrestrictedUseConfirmed ? 'yes' : 'no'}`,
    `Confirmed documentation/compliance: ${payload.compliance.complianceAccepted ? 'yes' : 'no'}`,
  ];

  return lines.join('\n');
}

/** @deprecated Use buildRfqMessageTextAsync */
export function buildRfqMessageText(payload: InquiryRfqPayload): string {
  const industryLabel = formatCustomerIndustryLabel(payload.project.industry, 'en') || 'Not specified';
  const lines = [
    'RFQ PROJECT',
    `Project name: ${payload.project.projectName || 'Not specified'}`,
    `Industry: ${industryLabel}`,
    `Target start date: ${payload.project.targetStartDate || 'Not specified'}`,
    `Annual volume estimate: ${payload.project.annualVolumeEstimate || 'Not specified'}`,
    '',
    'CONTACT',
    `Full name: ${payload.contact.fullName || 'Not specified'}`,
    `Email: ${payload.contact.email || 'Not specified'}`,
    `Company: ${payload.contact.company || 'Not specified'}`,
    `Country: ${payload.contact.country || 'Not specified'}`,
    `Phone: ${payload.contact.phone || 'Not specified'}`,
    `VAT / Tax ID: ${payload.contact.vat || 'Not specified'}`,
    '',
    'LINE ITEMS',
    ...payload.lines.map((line, index) => [
      `${index + 1}. ${line.name}`,
      `   SPU: ${line.spu}`,
      `   Quantity: ${line.quantity}`,
      `   Required by: ${line.requiredBy || 'Not specified'}`,
      `   Notes: ${line.notes || 'Not specified'}`,
    ].join('\n')),
    '',
    'PROJECT ATTACHMENTS',
    payload.projectAttachments.length
      ? payload.projectAttachments.map((file) => file.filename).join(', ')
      : 'None',
    '',
    'COMPLIANCE',
    `Confirmed unrestricted use: ${payload.compliance.unrestrictedUseConfirmed ? 'yes' : 'no'}`,
    `Confirmed documentation/compliance: ${payload.compliance.complianceAccepted ? 'yes' : 'no'}`,
  ];

  return lines.join('\n');
}

export function normalizeRfqLine(line: InquiryRfqLine): InquiryRfqLine {
  const legacy = line as InquiryRfqLine & { sku?: string };
  return {
    ...line,
    spu: line.spu || legacy.sku || '',
    quantity: typeof line.quantity === 'number' ? line.quantity : Number(line.quantity) || 1,
  };
}

export function summarizeQuotedValue(quotedLines: InquiryQuotedLine[] | null | undefined, locale = 'en') {
  if (!quotedLines?.length) {
    return 'Pending quote';
  }
  const total = quotedLines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const currency = quotedLines[0]?.currency ?? 'USD';
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(total);
}
