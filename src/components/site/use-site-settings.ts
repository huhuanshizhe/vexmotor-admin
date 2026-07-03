'use client';

import { message } from 'antd';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';

import type { AdminSiteSettingsResponse } from '@/lib/site-settings';

async function saveSiteSettings(snapshot: AdminSiteSettingsResponse) {
  if (!snapshot || typeof snapshot !== 'object' || !('defaultCurrencyCode' in snapshot)) {
    return {
      ok: false as const,
      message: '配置数据无效，请刷新页面后重试。',
    };
  }

  const { paymentDiagnostics: _ignored, ...payload } = snapshot;

  const response = await fetch('/api/admin/site-settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    return {
      ok: false as const,
      message: payload?.message ?? '保存失败，请检查配置后重试。',
    };
  }

  const saved = (await response.json()) as AdminSiteSettingsResponse;
  return { ok: true as const, settings: saved };
}

export function useSiteSettings(initialSettings: AdminSiteSettingsResponse) {
  const [settings, setSettings] = useState<AdminSiteSettingsResponse>(initialSettings);
  const settingsRef = useRef(initialSettings);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    settingsRef.current = initialSettings;
    setSettings(initialSettings);
  }, [initialSettings]);

  const applySettings = useCallback((next: AdminSiteSettingsResponse) => {
    settingsRef.current = next;
    setSettings(next);
  }, []);

  const updateSettings = useCallback((updater: (current: AdminSiteSettingsResponse) => AdminSiteSettingsResponse) => {
    applySettings(updater(settingsRef.current));
  }, [applySettings]);

  const persistSettings = useCallback((snapshot?: AdminSiteSettingsResponse) => {
    const payload = snapshot && typeof snapshot === 'object' && 'defaultCurrencyCode' in snapshot
      ? snapshot
      : settingsRef.current;

    return new Promise<boolean>((resolve) => {
      startTransition(async () => {
        const result = await saveSiteSettings(payload);

        if (!result.ok) {
          void message.error(result.message);
          resolve(false);
          return;
        }

        applySettings(result.settings);
        void message.success('保存成功');
        resolve(true);
      });
    });
  }, [applySettings]);

  return {
    settings,
    isPending,
    updateSettings,
    persistSettings,
  };
}
