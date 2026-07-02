import { NextRequest, NextResponse } from 'next/server';

import {
  getAdminProductBoardsDashboard,
  updateAdminProductBoardConfig,
} from '@/server/admin/product-boards';
import type { ProductBoardConfig } from '@/lib/product-boards';

function mapProductBoardError(error: unknown) {
  if (!(error instanceof Error)) return null;
  switch (error.message) {
    case 'BOARD_HAS_PRODUCTS':
      return { status: 409, code: 'BOARD_HAS_PRODUCTS', message: '该看板下已有产品，无法删除' };
    default:
      return null;
  }
}

export async function GET() {
  const dashboard = await getAdminProductBoardsDashboard();
  return NextResponse.json(dashboard);
}

export async function PUT(request: NextRequest) {
  const body = await request.json() as ProductBoardConfig;
  if (!body || !Array.isArray(body.coverageBoards)) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload' }, { status: 400 });
  }

  try {
    const dashboard = await updateAdminProductBoardConfig(body);
    return NextResponse.json(dashboard);
  } catch (error) {
    const mapped = mapProductBoardError(error);
    if (mapped) {
      return NextResponse.json({ code: mapped.code, message: mapped.message }, { status: mapped.status });
    }
    throw error;
  }
}
