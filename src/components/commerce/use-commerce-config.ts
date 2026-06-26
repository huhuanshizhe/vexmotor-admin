'use client';

import { message } from 'antd';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';

import type { CommerceConfig } from '@/lib/commerce-config';

async function saveCommerceConfig(snapshot: CommerceConfig) {
  if (!snapshot || typeof snapshot !== 'object') {
    return {
      ok: false as const,
      message: '配置数据无效，请刷新页面后重试。',
    };
  }

  const response = await fetch('/api/admin/commerce', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(snapshot),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string; details?: unknown } | null;
    const validationHint = payload?.details && typeof payload.details === 'object'
      ? '请检查阶梯规则、物流方式与运费配置是否完整。'
      : null;
    return {
      ok: false as const,
      message: payload?.message ?? validationHint ?? '保存失败，请检查配置后重试。',
    };
  }

  const saved = (await response.json()) as CommerceConfig;
  return { ok: true as const, config: saved };
}

export function useCommerceConfig(initialConfig: CommerceConfig) {
  const [config, setConfig] = useState<CommerceConfig>(initialConfig);
  const configRef = useRef(initialConfig);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    configRef.current = initialConfig;
    setConfig(initialConfig);
  }, [initialConfig]);

  const applyConfig = useCallback((next: CommerceConfig) => {
    configRef.current = next;
    setConfig(next);
  }, []);

  const updateConfig = useCallback((updater: (current: CommerceConfig) => CommerceConfig) => {
    const next = updater(configRef.current);
    applyConfig(next);
    setStatusMessage(null);
  }, [applyConfig]);

  const persistConfig = useCallback((snapshot?: CommerceConfig) => {
    const payload = snapshot ?? configRef.current;

    return new Promise<boolean>((resolve) => {
      startTransition(async () => {
        setStatusMessage(null);
        const result = await saveCommerceConfig(payload);

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

  const updateAndPersist = useCallback((updater: (current: CommerceConfig) => CommerceConfig) => {
    const nextConfig = updater(configRef.current);
    applyConfig(nextConfig);

    return new Promise<boolean>((resolve) => {
      startTransition(async () => {
        setStatusMessage(null);
        const result = await saveCommerceConfig(nextConfig);

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
    setConfig: applyConfig,
    statusMessage,
    isPending,
    updateConfig,
    persistConfig,
    updateAndPersist,
  };
}
