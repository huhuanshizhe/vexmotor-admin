import 'server-only';

import { count, eq } from 'drizzle-orm';

import { normalizeEntityKeyForSave } from '@/lib/admin-entity-key';
import {
  type AdminProductBoardsDashboard,
  type ProductBoardConfig,
  type ProductCoverageBoard,
  type ProductCoverageMetric,
  defaultProductBoardConfig,
  isSystemProductBoardKey,
  sortProductCoverageBoards,
} from '@/lib/product-boards';
import { db } from '@/server/db';
import { productBoardAssignments, productSettings } from '@/server/db/schema';

const PRODUCT_SETTINGS_ROW_ID = 'default';

function sanitizeText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : '';
}

function sanitizeCoverageBoard(board: ProductCoverageBoard): ProductCoverageBoard {
  const key = normalizeEntityKeyForSave(board.key) ?? board.key.trim();
  return {
    key,
    title: sanitizeText(board.title),
    note: sanitizeText(board.note),
    sourceMode: board.sourceMode === 'code-seeded' ? 'code-seeded' : 'admin-managed',
    enabled: board.enabled !== false,
    createdAt: board.createdAt ?? new Date().toISOString(),
  };
}

function sanitizeProductBoardConfig(config: ProductBoardConfig): ProductBoardConfig {
  const base = defaultProductBoardConfig;
  const boards = config.coverageBoards?.length ? config.coverageBoards : base.coverageBoards;
  return {
    coverageBoards: sortProductCoverageBoards(boards.map(sanitizeCoverageBoard)),
  };
}

function cloneProductBoardConfig(config: ProductBoardConfig): ProductBoardConfig {
  return JSON.parse(JSON.stringify(config)) as ProductBoardConfig;
}

async function countProductsByBoardKey() {
  const rows = await db
    .select({
      boardKey: productBoardAssignments.boardKey,
      value: count(),
    })
    .from(productBoardAssignments)
    .groupBy(productBoardAssignments.boardKey);

  return new Map(rows.map((row) => [row.boardKey, Number(row.value ?? 0)]));
}

async function buildDashboard(config: ProductBoardConfig): Promise<AdminProductBoardsDashboard> {
  const normalized = sanitizeProductBoardConfig(config);
  const productCounts = await countProductsByBoardKey();
  const coverage = sortProductCoverageBoards(normalized.coverageBoards.map((board) => ({
    ...board,
    count: productCounts.get(board.key) ?? 0,
    enabled: board.enabled !== false,
    custom: !isSystemProductBoardKey(board.key),
  }))) satisfies ProductCoverageMetric[];

  const assignedProductIds = await db
    .selectDistinct({ productId: productBoardAssignments.productId })
    .from(productBoardAssignments);

  return {
    coverage,
    summary: {
      boardCount: coverage.length,
      customBoardCount: coverage.filter((item) => item.custom).length,
      assignedProductCount: assignedProductIds.length,
    },
    config: normalized,
  };
}

export async function ensureProductBoardConfig() {
  const [row] = await db
    .select()
    .from(productSettings)
    .where(eq(productSettings.id, PRODUCT_SETTINGS_ROW_ID))
    .limit(1);

  if (row) {
    const config = sanitizeProductBoardConfig({ coverageBoards: row.coverageBoards ?? [] });
    if (!row.coverageBoards?.length) {
      await db
        .update(productSettings)
        .set({ coverageBoards: config.coverageBoards, updatedAt: new Date() })
        .where(eq(productSettings.id, PRODUCT_SETTINGS_ROW_ID));
    }
    return config;
  }

  const seeded = sanitizeProductBoardConfig(cloneProductBoardConfig(defaultProductBoardConfig));
  await db.insert(productSettings).values({
    id: PRODUCT_SETTINGS_ROW_ID,
    coverageBoards: seeded.coverageBoards,
    updatedAt: new Date(),
  });
  return seeded;
}

export async function getAdminProductBoardsDashboard(): Promise<AdminProductBoardsDashboard> {
  const config = await ensureProductBoardConfig();
  return buildDashboard(cloneProductBoardConfig(config));
}

export async function getEnabledProductBoardOptions() {
  const dashboard = await getAdminProductBoardsDashboard();
  return dashboard.coverage
    .filter((board) => board.enabled)
    .map((board) => ({ key: board.key, title: board.title || board.key }));
}

export async function updateAdminProductBoardConfig(input: ProductBoardConfig): Promise<AdminProductBoardsDashboard> {
  const current = await ensureProductBoardConfig();
  const normalized = sanitizeProductBoardConfig(input);
  const removedKeys = current.coverageBoards
    .map((board) => board.key)
    .filter((key) => !normalized.coverageBoards.some((board) => board.key === key));

  if (removedKeys.length) {
    const productCounts = await countProductsByBoardKey();
    const blocked = removedKeys.find((key) => (productCounts.get(key) ?? 0) > 0);
    if (blocked) {
      throw new Error('BOARD_HAS_PRODUCTS');
    }
  }

  const now = new Date();
  await db
    .insert(productSettings)
    .values({
      id: PRODUCT_SETTINGS_ROW_ID,
      coverageBoards: normalized.coverageBoards,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: productSettings.id,
      set: {
        coverageBoards: normalized.coverageBoards,
        updatedAt: now,
      },
    });

  return buildDashboard(normalized);
}

export async function validateProductBoardKeys(boardKeys: string[]) {
  const config = await ensureProductBoardConfig();
  const enabledKeys = new Set(
    config.coverageBoards.filter((board) => board.enabled !== false).map((board) => board.key),
  );
  const normalized = [...new Set(boardKeys.map((key) => normalizeEntityKeyForSave(key) ?? '').filter(Boolean))];
  const invalid = normalized.find((key) => !enabledKeys.has(key));
  if (invalid) {
    throw new Error('INVALID_BOARD_KEY');
  }
  return normalized;
}
