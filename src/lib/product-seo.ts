import type { StorefrontProductDetail } from '@/server/storefront';
import { SITE_NAME } from './site-config';
import type { DetailSpecGroup } from './product-specs';
import type { FaqItem } from './product-content';

export function buildProductJsonLd(
  product: StorefrontProductDetail,
  productUrl: string,
  galleryImageUrls: string[],
  specGroups: DetailSpecGroup[],
  bulkPrices: Array<{ minQuantity: number; unitPriceAmount: number }>,
  locale = 'en',
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    sku: product.sku,
    mpn: product.sku,
    url: productUrl,
    description: product.seoDescription ?? product.shortDescription ?? product.description,
    image: galleryImageUrls,
    inLanguage: locale,
    brand: {
      '@type': 'Brand',
      name: product.brand?.name ?? SITE_NAME,
    },
    category: product.categories.map((item) => item.name).join(', '),
    additionalProperty: specGroups.flatMap((group) => group.rows).slice(0, 24).map((row) => ({
      '@type': 'PropertyValue',
      name: row.label,
      value: row.value,
    })),
    offers:
      product.purchaseMode === 'buy'
        ? {
            '@type': 'Offer',
            url: productUrl,
            seller: { '@type': 'Organization', name: SITE_NAME },
            priceCurrency: product.price.currency,
            price: product.price.amount.toFixed(2),
            availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/PreOrder',
            priceSpecification: bulkPrices.map((item) => ({
              '@type': 'UnitPriceSpecification',
              priceCurrency: product.price.currency,
              price: item.unitPriceAmount.toFixed(2),
              referenceQuantity: {
                '@type': 'QuantitativeValue',
                value: item.minQuantity,
                unitCode: 'C62',
              },
            })),
          }
        : undefined,
  };
}

export function buildFaqJsonLd(faqItems: FaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}
