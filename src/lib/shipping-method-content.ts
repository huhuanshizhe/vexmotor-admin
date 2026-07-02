export type AdminShippingMethodListItem = {
  id: string;
  code: string;
  name: string;
  etaLabel: string;
  note: string;
  enabled: boolean;
  sortOrder: number;
  primaryLocale: string;
  localeCount: number;
  locales: string[];
  createdAt: string;
  updatedAt: string;
};

export type AdminShippingMethodTranslation = {
  id: string;
  shippingMethodId: string;
  locale: string;
  name: string;
  etaLabel: string;
  note: string | null;
  code: string;
  enabled: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export function resolveShippingMethodId(item: Pick<AdminShippingMethodTranslation, 'shippingMethodId'>) {
  return item.shippingMethodId;
}
