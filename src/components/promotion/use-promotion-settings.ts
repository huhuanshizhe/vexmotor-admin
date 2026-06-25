'use client';

import { useCallback, useState, useTransition } from 'react';

import type { PromotionSettings } from '@/lib/promotion-settings';

async function savePromotionSettings(snapshot: PromotionSettings) {
  const response = await fetch('/api/admin/promotion/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(snapshot),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    return {
      ok: false as const,
      message: payload?.error ?? '保存失败，请检查配置后重试。',
    };
  }

  const saved = (await response.json()) as PromotionSettings;
  return { ok: true as const, settings: saved };
}

export function usePromotionSettings(initialSettings: PromotionSettings) {
  const [settings, setSettings] = useState<PromotionSettings>(initialSettings);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const updateSettings = useCallback((updater: (current: PromotionSettings) => PromotionSettings) => {
    setSettings((current) => updater(current));
    setStatusMessage('配置已修改，待保存');
  }, []);

  const persistSettings = useCallback((snapshot?: PromotionSettings) => {
    const payload = snapshot ?? settings;

    return new Promise<boolean>((resolve) => {
      startTransition(async () => {
        setStatusMessage(null);
        const result = await savePromotionSettings(payload);

        if (!result.ok) {
          setStatusMessage(result.message);
          resolve(false);
          return;
        }

        setSettings(result.settings);
        setStatusMessage('配置已保存');
        resolve(true);
      });
    });
  }, [settings]);

  return {
    settings,
    statusMessage,
    isPending,
    updateSettings,
    persistSettings,
  };
}
