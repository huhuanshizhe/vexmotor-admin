import { NextRequest, NextResponse } from 'next/server';

import {
  deleteAdminProductFeatureAssignment,
  productFeatureAssignmentPatchSchema,
  updateAdminProductFeatureAssignment,
} from '@/server/admin/product-features';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; assignmentId: string }> }) {
  const body = await request.json();
  const parsed = productFeatureAssignmentPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const { assignmentId } = await params;
  const updated = await updateAdminProductFeatureAssignment(assignmentId, parsed.data);
  if (!updated) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Assignment not found' }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; assignmentId: string }> }) {
  const { assignmentId } = await params;
  const deleted = await deleteAdminProductFeatureAssignment(assignmentId);
  if (!deleted) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Assignment not found' }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
