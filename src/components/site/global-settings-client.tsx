'use client';

import { Space } from 'antd';

import { CommercePageHeader } from '@/components/commerce/commerce-page-header';
import { GlobalSettingsForm } from '@/components/site/global-settings-form';
import { useSiteSettings } from '@/components/site/use-site-settings';
import type { AdminSiteSettingsResponse } from '@/lib/site-settings';

type GlobalSettingsClientProps = {
  initialSettings: AdminSiteSettingsResponse;
};

export function GlobalSettingsClient({ initialSettings }: GlobalSettingsClientProps) {
  const { settings, isPending, updateSettings, persistSettings } = useSiteSettings(initialSettings);

  function handleChange(changedValues: Partial<AdminSiteSettingsResponse>) {
    updateSettings((current) => ({
      ...current,
      defaultCurrencyCode: changedValues.defaultCurrencyCode ?? current.defaultCurrencyCode,
      defaultCountryCode: changedValues.defaultCountryCode ?? current.defaultCountryCode,
      paymentSandboxMode: changedValues.paymentSandboxMode ?? current.paymentSandboxMode,
      paymentDiagnostics: {
        ...current.paymentDiagnostics,
        activeMode: (changedValues.paymentSandboxMode ?? current.paymentSandboxMode) ? 'sandbox' : 'live',
      },
    }));
  }

  return (
    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
      <CommercePageHeader
        title="全局配置"
        description="管理站点默认区域、货币与支付运行环境。"
        statusMessage={null}
        isPending={isPending}
        onSave={persistSettings}
      />
      <GlobalSettingsForm settings={settings} onChange={handleChange} />
    </Space>
  );
}
