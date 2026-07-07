import 'server-only';

import { formatCustomerIndustryLabel, normalizeCustomerIndustry } from '@/lib/customer-industries';
import type { InquiryRfqPayload } from '@/lib/inquiry-rfq';
import { isContactInquiry } from '@/lib/inquiry-rfq';
import { getGeoCountryName, resolveGeoCountryIso } from '@/server/geo/divisions';

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

export async function buildRfqMessageTextAsync(payload: InquiryRfqPayload): Promise<string> {
  const industryLabel = formatCustomerIndustryLabel(payload.project.industry, 'en') || 'Not specified';
  const countryLabel = (await getGeoCountryName(payload.contact.country)) || payload.contact.country || 'Not specified';
  const isContact = isContactInquiry(payload);
  const lines = [
    isContact ? 'CONTACT INQUIRY' : 'RFQ PROJECT',
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
  ];

  if (isContact) {
    lines.push(
      'PROCUREMENT DETAILS',
      payload.procurementDetails?.trim() || 'Not specified',
      '',
    );
  } else {
    lines.push(
      'LINE ITEMS',
      ...payload.lines.map((line, index) => [
        `${index + 1}. ${line.name}`,
        `   SPU: ${line.spu}`,
        `   Quantity: ${line.quantity}`,
        `   Required by: ${line.requiredBy || 'Not specified'}`,
        `   Notes: ${line.notes || 'Not specified'}`,
      ].join('\n')),
      '',
    );
  }

  lines.push(
    'PROJECT ATTACHMENTS',
    payload.projectAttachments.length
      ? payload.projectAttachments.map((file) => file.filename).join(', ')
      : 'None',
    '',
    'COMPLIANCE',
    `Confirmed unrestricted use: ${payload.compliance.unrestrictedUseConfirmed ? 'yes' : 'no'}`,
    `Confirmed documentation/compliance: ${payload.compliance.complianceAccepted ? 'yes' : 'no'}`,
  );

  return lines.join('\n');
}
