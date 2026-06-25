import { NextResponse } from 'next/server';

import {
  createAdminProductFeatureValue,
  listAdminProductFeatureValues,
} from '@/server/admin/product-features';

export async function GET(_: Request, { params }: { params: Promise<{ id: string; assignmentId: string }> }) {
  const { assignmentId } = await params;
  const result = await listAdminProductFeatureValues(assignmentId);
  if (!result) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Assignment not found' }, { status: 404 });
  }
  return NextResponse.json(result);
}

export async function POST(_: Request, { params }: { params: Promise<{ id: string; assignmentId: string }> }) {
  const { assignmentId } = await params;
  const created = await createAdminProductFeatureValue(assignmentId);
  if (!created) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Assignment not found' }, { status: 404 });
  }
  return NextResponse.json(created, { status: 201 });
}
