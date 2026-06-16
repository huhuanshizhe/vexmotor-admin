import type { StorefrontProductDetail } from '@/server/storefront';

export type DetailSpecRow = {
  label: string;
  value: string;
};

export type DetailSpecGroup = {
  title: string;
  description: string;
  rows: DetailSpecRow[];
};

export function formatSpecValue(value: string, unit?: string | null) {
  return unit ? `${value} ${unit}` : value;
}

export function buildSpecGroups(product: StorefrontProductDetail): DetailSpecGroup[] {
  const categoryMap: Record<'product_type' | 'electrical' | 'mechanical' | 'performance' | 'environmental' | 'general', DetailSpecRow[]> = {
    product_type: [],
    electrical: [],
    mechanical: [],
    performance: [],
    environmental: [],
    general: [],
  };
  const categoryAliases: Record<string, keyof typeof categoryMap> = {
    product: 'product_type',
    product_type: 'product_type',
    electrical: 'electrical',
    mechanical: 'mechanical',
    physical: 'mechanical',
    performance: 'performance',
    environmental: 'environmental',
    general: 'general',
  };

  product.features.forEach((feature) => {
    const normalizedCategory = categoryAliases[feature.category?.toLowerCase() ?? 'general'] ?? 'general';
    const row = {
      label: feature.key,
      value: formatSpecValue(feature.value, feature.unit),
    };

    categoryMap[normalizedCategory].push(row);
  });

  const attributeRows = product.attributes.map((attribute) => ({
    label: attribute.group,
    value: attribute.value,
  }));

  const commercialRows = [
    { label: 'SKU', value: product.sku },
    { label: 'Purchase mode', value: product.purchaseMode === 'buy' ? 'Direct buy' : 'Engineering RFQ' },
    {
      label: 'Stock status',
      value: product.inStock ? `${Math.max(product.stockQuantity, 0)} units ready for standard orders` : 'Lead time confirmed during quote review',
    },
    { label: 'Brand', value: product.brand?.name ?? '' },
  ];

  const groups: DetailSpecGroup[] = [];

  if (categoryMap.product_type.length) {
    groups.push({
      title: 'Product Type',
      description: 'Catalog family, construction type and frame-level classification.',
      rows: categoryMap.product_type,
    });
  }

  if (categoryMap.electrical.length) {
    groups.push({
      title: 'Electrical Specification',
      description: 'Electrical ratings, winding data and driver-facing values.',
      rows: categoryMap.electrical,
    });
  }

  if (categoryMap.mechanical.length) {
    groups.push({
      title: 'Mechanical Specification',
      description: 'Frame dimensions, shaft details and mechanical construction values.',
      rows: categoryMap.mechanical,
    });
  }

  if (categoryMap.performance.length) {
    groups.push({
      title: 'Performance',
      description: 'Torque, speed and application-facing operating behavior.',
      rows: categoryMap.performance,
    });
  }

  if (categoryMap.environmental.length) {
    groups.push({
      title: 'Environmental Specification',
      description: 'Temperature, protection and environmental operating conditions.',
      rows: categoryMap.environmental,
    });
  }

  if (categoryMap.general.length) {
    groups.push({
      title: 'General',
      description: 'Additional catalog points that do not belong to a dedicated engineering bucket.',
      rows: categoryMap.general,
    });
  }

  if (attributeRows.length) {
    groups.push({
      title: 'Catalog attributes',
      description: 'Structured metadata carried with this SKU.',
      rows: attributeRows,
    });
  }

  groups.push({
    title: 'Commercial & support',
    description: 'Fulfillment and support information.',
    rows: commercialRows,
  });

  return groups;
}
