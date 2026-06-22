'use client';

import { useEffect, useState } from 'react';

import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

export default function ApiDocClient() {
  const [spec, setSpec] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch('/api/openapi.json')
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Failed to load OpenAPI spec (${res.status})`);
        }
        return res.json() as Promise<Record<string, unknown>>;
      })
      .then(setSpec)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load OpenAPI spec');
      });
  }, []);

  if (error) {
    return <p style={{ padding: 24, color: '#b91c1c' }}>{error}</p>;
  }

  if (!spec) {
    return <p style={{ padding: 24 }}>Loading API documentation…</p>;
  }

  return <SwaggerUI spec={spec} />;
}
