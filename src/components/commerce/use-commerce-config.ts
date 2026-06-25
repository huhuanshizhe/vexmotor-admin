'use client';

import { useCallback, useState, useTransition } from 'react';

import type { CommerceConfig } from '@/lib/commerce-config';

async function saveCommerceConfig(snapshot: CommerceConfig) {
  const response = await fetch('/api/admin/commerce', {
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

  const saved = (await response.json()) as CommerceConfig;
  return { ok: true as const, config: saved };
}

export function useCommerceConfig(initialConfig: CommerceConfig) {
  const [config, setConfig] = useState<CommerceConfig>(initialConfig);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const updateConfig = useCallback((updater: (current: CommerceConfig) => CommerceConfig) => {
    setConfig((current) => updater(current));
    setStatusMessage('配置已修改，待保存');
  }, []);

  const persistConfig = useCallback((snapshot?: CommerceConfig) => {
    const payload = snapshot ?? config;

    return new Promise<boolean>((resolve) => {
      startTransition(async () => {
        setStatusMessage(null);
        const result = await saveCommerceConfig(payload);

        if (!result.ok) {
          setStatusMessage(result.message);
          resolve(false);
          return;
        }

        setConfig(result.config);
        setStatusMessage('配置已保存');
        resolve(true);
      });
    });
  }, [config]);

  const updateAndPersist = useCallback((updater: (current: CommerceConfig) => CommerceConfig) => {
    let nextConfig!: CommerceConfig;
    setConfig((current) => {
      nextConfig = updater(current);
      return nextConfig;
    });

    return new Promise<boolean>((resolve) => {
      startTransition(async () => {
        setStatusMessage(null);
        const result = await saveCommerceConfig(nextConfig);

        if (!result.ok) {
          setStatusMessage(result.message);
          resolve(false);
          return;
        }

        setConfig(result.config);
        setStatusMessage('已保存');
        resolve(true);
      });
    });
  }, []);

  return {
    config,
    setConfig,
    statusMessage,
    isPending,
    updateConfig,
    persistConfig,
    updateAndPersist,
  };
}
