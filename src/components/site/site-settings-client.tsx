'use client';

import { Space } from 'antd';

import { CommercePageHeader } from '@/components/commerce/commerce-page-header';
import { SiteSettingsForm } from '@/components/site/site-settings-form';
import { useSiteSettings } from '@/components/site/use-site-settings';
import type { SiteSettings } from '@/lib/site-settings';

type SiteSettingsClientProps = {
  initialSettings: SiteSettings;
};

export function SiteSettingsClient({ initialSettings }: SiteSettingsClientProps) {
  const { settings, isPending, updateSettings, persistSettings } = useSiteSettings(initialSettings);

  function handleChange(changedValues: Partial<SiteSettings>) {
    updateSettings((current) => ({
      ...current,
      defaultCurrencyCode: changedValues.defaultCurrencyCode ?? current.defaultCurrencyCode,
      defaultCountryCode: changedValues.defaultCountryCode ?? current.defaultCountryCode,
    }));
  }

  return (
    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
      <CommercePageHeader
        title="站点配置"
        description="设置站点级默认币种与国家，用于访客地址默认值、购物车运费估算等场景。"
        statusMessage={null}
        isPending={isPending}
        onSave={persistSettings}
      />
      <SiteSettingsForm settings={settings} onChange={handleChange} />
    </Space>
  );
}
