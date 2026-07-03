'use client';

import { message } from 'antd';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';

import type { SiteSettings } from '@/lib/site-settings';

async function saveSiteSettings(snapshot: SiteSettings) {
  const response = await fetch('/api/admin/site-settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(snapshot),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    return {
      ok: false as const,
      message: payload?.message ?? '保存失败，请检查配置后重试。',
    };
  }

  const saved = (await response.json()) as SiteSettings;
  return { ok: true as const, settings: saved };
}

export function useSiteSettings(initialSettings: SiteSettings) {
  const [settings, setSettings] = useState<SiteSettings>(initialSettings);
  const settingsRef = useRef(initialSettings);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    settingsRef.current = initialSettings;
    setSettings(initialSettings);
  }, [initialSettings]);

  const applySettings = useCallback((next: SiteSettings) => {
    settingsRef.current = next;
    setSettings(next);
  }, []);

  const updateSettings = useCallback((updater: (current: SiteSettings) => SiteSettings) => {
    applySettings(updater(settingsRef.current));
  }, [applySettings]);

  const persistSettings = useCallback((snapshot?: SiteSettings) => {
    const payload = snapshot ?? settingsRef.current;

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
