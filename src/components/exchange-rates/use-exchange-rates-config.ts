'use client';

import { message } from 'antd';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';

import type { ExchangeRateConfig } from '@/lib/exchange-rate-config';

async function saveExchangeRateConfig(snapshot: ExchangeRateConfig) {
  const response = await fetch('/api/admin/exchange-rates', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(snapshot),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    return {
      ok: false as const,
      message: payload?.message ?? '保存失败，请检查汇率配置后重试。',
    };
  }

  const saved = (await response.json()) as ExchangeRateConfig;
  return { ok: true as const, config: saved };
}

export function useExchangeRateConfig(initialConfig: ExchangeRateConfig) {
  const [config, setConfig] = useState<ExchangeRateConfig>(initialConfig);
  const configRef = useRef(initialConfig);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    configRef.current = initialConfig;
    setConfig(initialConfig);
  }, [initialConfig]);

  const applyConfig = useCallback((next: ExchangeRateConfig) => {
    configRef.current = next;
    setConfig(next);
  }, []);

  const updateConfig = useCallback((updater: (current: ExchangeRateConfig) => ExchangeRateConfig) => {
    const next = updater(configRef.current);
    applyConfig(next);
  }, [applyConfig]);

  const persistConfig = useCallback((snapshot?: ExchangeRateConfig) => {
    const payload = snapshot ?? configRef.current;

    return new Promise<boolean>((resolve) => {
      startTransition(async () => {
        const result = await saveExchangeRateConfig(payload);

        if (!result.ok) {
          void message.error(result.message);
          resolve(false);
          return;
        }

        applyConfig(result.config);
        void message.success('保存成功');
        resolve(true);
      });
    });
  }, [applyConfig]);

  return {
    config,
    isPending,
    updateConfig,
    persistConfig,
  };
}
