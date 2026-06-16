import type { StorefrontAttachment, StorefrontProductDetail } from '@/server/storefront';
import type { DetailSpecGroup, DetailSpecRow } from './product-specs';

export type DocumentCard = {
  title: string;
  meta: string;
  description: string;
  href: string;
  external?: boolean;
};

export type FaqItem = {
  question: string;
  answer: string;
};

export type ApplicationCard = {
  title: string;
  description: string;
};

export function matchesAttachmentAsset(attachment: { name: string; url: string }, pattern: RegExp) {
  return pattern.test(`${attachment.name} ${attachment.url}`);
}

export function buildDocumentCards(
  attachments: StorefrontAttachment[],
  quoteHref: string,
): DocumentCard[] {
  const documentCards: DocumentCard[] = attachments.map((attachment) => ({
    title: attachment.name,
    meta: attachment.mimeType.toUpperCase(),
    description: 'Factory-managed file prepared for engineering handoff, sourcing review, or compliance checks.',
    href: attachment.url,
    external: true,
  }));

  if (!documentCards.some((item) => /datasheet/i.test(item.title))) {
    documentCards.push({
      title: 'Datasheet (PDF)',
      meta: 'Request',
      description: 'Ask the engineering team for the latest datasheet export when the file is not yet attached to the SKU.',
      href: quoteHref,
    });
  }

  if (!documentCards.some((item) => /(step|iges|cad|dxf|dwg|3d)/i.test(item.title))) {
    documentCards.push({
      title: '3D / CAD package',
      meta: 'STEP / IGES',
      description: 'Request a CAD package for system integration, mounting checks, and enclosure validation.',
      href: quoteHref,
    });
  }

  if (!documentCards.some((item) => /(manual|wiring|report|certificate|cert)/i.test(item.title))) {
    documentCards.push({
      title: 'Wiring / certification pack',
      meta: 'Support',
      description: 'Manuals, wiring notes, and certificates can be bundled through the pre-sales support workflow.',
      href: quoteHref,
    });
  }

  return documentCards;
}

export function buildFaqItems(
  product: StorefrontProductDetail,
  topSpecs: DetailSpecRow[],
): FaqItem[] {
  return [
    {
      question: `How do I validate ${product.name} quickly?`,
      answer: topSpecs.length
        ? `Start with ${topSpecs.slice(0, 3).map((item) => `${item.label} ${item.value}`).join(', ')} and confirm the purchase mode before finalizing the bill of materials.`
        : `Start with the SKU, purchase mode, and attached documents, then confirm the remaining mechanical and electrical details with the engineering team.`,
    },
    {
      question: `Can I order ${product.sku} directly online?`,
      answer: product.purchaseMode === 'buy' ? 'Yes. This SKU is configured for direct checkout, quantity changes, and tier-price review from the PDP.' : 'This SKU currently follows an RFQ workflow so the engineering team can confirm spec, lead time, and commercial terms.',
    },
    {
      question: 'What documents are available for this product?',
      answer: product.attachments.length
        ? `${product.attachments.length} document${product.attachments.length === 1 ? '' : 's'} are attached now, and additional CAD or compliance files can be requested from support.`
        : 'Datasheets, CAD, manuals, and compliance files can be requested through the quote and contact workflow when they are not attached directly to the SKU.',
    },
    {
      question: 'How is stock fulfilled across warehouses?',
      answer: product.inStock ? 'Standard orders are planned against current stock coverage and routed to the nearest viable warehouse program.' : 'When stock is not available, the team confirms production scheduling, warehouse assignment, and ETA during the RFQ review.',
    },
  ];
}

export function buildApplicationCards(
  product: StorefrontProductDetail,
  industries: Array<{ title: string; description: string }>,
  topSpecs: DetailSpecRow[],
): ApplicationCard[] {
  return industries.slice(0, 3).map((industry, index) => {
    const highlightedSpec = topSpecs[index] ?? topSpecs[0];
    const specLine = highlightedSpec ? `${highlightedSpec.label.toLowerCase()} ${highlightedSpec.value}` : 'repeatable motion performance';

    return {
      title: industry.title,
      description: `${industry.description} ${product.name} fits projects that need ${specLine} plus ${product.purchaseMode === 'buy' ? 'catalog fulfillment' : 'engineering RFQ support'}.`,
    };
  });
}

export function buildTrustItems(product: StorefrontProductDetail): string[] {
  return [
    'Warranty 18 months',
    '30-day return support',
    'CE / RoHS documentation support',
    product.attachments.length ? 'CAD / STEP available' : 'CAD / STEP on request',
  ];
}

export function buildOverviewBullets(product: StorefrontProductDetail, topSpecs: DetailSpecRow[]): string[] {
  return [
    `${product.purchaseMode === 'buy' ? 'Direct-buy ready' : 'RFQ-led'} procurement flow for ${product.name}.`,
    topSpecs[0] ? `${topSpecs[0].label}: ${topSpecs[0].value}.` : 'Built for repeatable motion programs.',
    product.attachments.length ? `${product.attachments.length} supporting documents are already attached for engineering review.` : 'Supporting documents can be requested from the engineering team.',
    product.inStock ? 'Standard stock is available for fast dispatch from planned regional warehouses.' : 'Production scheduling and warehouse assignment are confirmed during quotation.',
  ];
}
