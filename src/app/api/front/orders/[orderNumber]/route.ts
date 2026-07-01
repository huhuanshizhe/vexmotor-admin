import { NextRequest, NextResponse } from 'next/server';

import { LOCALE_REQUEST_HEADER, normalizeLocale } from '@/lib/i18n';
import { getCurrentUserId } from '@/server/auth/session';
import { getStorefrontOrderDetail } from '@/server/storefront/orders';

import { frontCorsHeaders } from '@/lib/front-cors';

function serializeOrderDetail(order: NonNullable<Awaited<ReturnType<typeof getStorefrontOrderDetail>>>) {
  return {
    ...order,
    placedAt: order.placedAt?.toISOString() ?? null,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    terminatedAt: order.terminatedAt?.toISOString() ?? null,
    shipments: order.shipments.map((shipment) => ({
      ...shipment,
      shippedAt: shipment.shippedAt.toISOString(),
      createdAt: shipment.createdAt.toISOString(),
    })),
    refundRequest: order.refundRequest
      ? {
          ...order.refundRequest,
          processedAt: order.refundRequest.processedAt?.toISOString() ?? null,
          createdAt: order.refundRequest.createdAt.toISOString(),
        }
      : null,
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ orderNumber: string }> }) {
  const userId = await getCurrentUserId(request);
  if (!userId) {
    return NextResponse.json({ code: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401, headers: frontCorsHeaders() });
  }

  const { orderNumber } = await params;
  const locale = normalizeLocale(request.headers.get(LOCALE_REQUEST_HEADER));
  const order = await getStorefrontOrderDetail(userId, orderNumber, locale);
  if (!order) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'Order not found' }, { status: 404, headers: frontCorsHeaders() });
  }

  return NextResponse.json(serializeOrderDetail(order), { headers: frontCorsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: frontCorsHeaders() });
}
