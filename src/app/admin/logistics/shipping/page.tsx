import { getAdminSiteLanguages } from '@/server/admin/languages';
import { getDefaultSiteLanguageCode } from '@/server/admin/site-locale';
import { getAdminShippingMethods } from '@/server/admin/shipping-methods';
import { getAdminCommerceConfig } from '@/server/commerce/config';

import { ShippingMethodsClient } from '@/components/commerce/shipping-methods-client';

export default async function AdminShippingMethodsPage() {
  const [initialConfig, initialMethods, activeLanguages, defaultLocale] = await Promise.all([
    getAdminCommerceConfig(),
    getAdminShippingMethods(),
    getAdminSiteLanguages(),
    getDefaultSiteLanguageCode(),
  ]);

  return (
    <ShippingMethodsClient
      initialConfig={initialConfig}
      initialMethods={initialMethods}
      activeLanguages={activeLanguages.filter((item) => item.status === 'active')}
      defaultLocale={defaultLocale}
    />
  );
}
