import fs from 'node:fs';
import path from 'node:path';

import { createSwaggerSpec } from 'next-swagger-doc';
import { load } from 'js-yaml';

import { getAdminUrl } from '@/lib/app-urls';

type OpenApiSpec = Record<string, unknown>;

function loadYamlSpec(): OpenApiSpec {
  const specPath = path.join(process.cwd(), 'docs', 'openapi.front.yaml');
  const content = fs.readFileSync(specPath, 'utf8');
  return load(content) as OpenApiSpec;
}

function resolveServerUrl(): string {
  return getAdminUrl();
}

export function getSwaggerSpec(): OpenApiSpec {
  const baseSpec = loadYamlSpec();
  const serverUrl = resolveServerUrl();

  let scannedPaths: Record<string, unknown> = {};
  try {
    const scanned = createSwaggerSpec({
      apiFolder: 'src/app/api',
      definition: {
        openapi: '3.1.0',
        info: {
          title: 'VexMotor API',
          version: '0.1.0',
          description: 'Merged from docs/openapi.front.yaml and JSDoc on src/app/api routes.',
        },
        servers: [{ url: serverUrl, description: 'Current environment' }],
      },
    }) as OpenApiSpec;
    scannedPaths = (scanned.paths as Record<string, unknown> | undefined) ?? {};
  } catch {
    // swagger-jsdoc scan can fail if api tree contains folders named *.json, etc.
  }

  const yamlPaths = (baseSpec.paths as Record<string, unknown> | undefined) ?? {};
  const yamlServers = (baseSpec.servers as Array<{ url: string; description?: string }> | undefined) ?? [];

  return {
    ...baseSpec,
    servers: [{ url: serverUrl, description: 'Current environment' }, ...yamlServers.filter((s) => s.url !== serverUrl)],
    paths: {
      ...yamlPaths,
      ...scannedPaths,
    },
  };
}
