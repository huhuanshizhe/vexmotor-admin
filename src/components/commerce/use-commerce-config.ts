'use client';

import { useCallback, useState, useTransition } from 'react';

import type { CommerceConfig } from '@/lib/commerce-config';

export function useCommerceConfig(initialConfig: CommerceConfig) {
  const [config, setConfig] = useState<CommerceConfig>(initialConfig);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const updateConfig = useCallback((updater: (current: CommerceConfig) => CommerceConfig) => {
    setConfig((current) => updater(current));
    setStatusMessage('配置已修改，待保存');
  }, []);

  const persistConfig = useCallback(() => {
    startTransition(async () => {
      setStatusMessage(null);
      const response = await fetch('/api/admin/commerce', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setStatusMessage(payload?.message ?? '保存失败，请检查配置后重试。');
        return;
      }

      const saved = (await response.json()) as CommerceConfig;
      setConfig(saved);
      setStatusMessage('配置已保存');
    });
  }, [config]);

  return {
    config,
    setConfig,
    statusMessage,
    isPending,
    updateConfig,
    persistConfig,
  };
}
