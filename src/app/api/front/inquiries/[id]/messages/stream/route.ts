import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

import { frontCorsHeaders } from '@/lib/front-cors';
import { getCurrentUserId } from '@/server/auth/session';
import {
  getGuestInquiryAccessCookieName,
  getStorefrontInquiryDetailByIdOrQuoteNumber,
  getStorefrontInquiryMessageCursor,
  listStorefrontInquiryMessagesSince,
} from '@/server/storefront/inquiries';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function serializeMessage(message: {
  id: string;
  senderType: 'customer' | 'admin';
  body: string;
  createdAt: Date;
  adminName: string | null;
}) {
  return {
    id: message.id,
    senderType: message.senderType,
    body: message.body,
    createdAt: message.createdAt.toISOString(),
    adminName: message.adminName,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const userId = await getCurrentUserId(request);
  const cookieStore = await cookies();
  let guestAccessToken: string | null = null;
  if (!userId) {
    guestAccessToken = cookieStore.get(getGuestInquiryAccessCookieName(id))?.value ?? null;
    if (!guestAccessToken) {
      for (const cookie of cookieStore.getAll()) {
        if (cookie.name.startsWith('guest_inquiry_access_')) {
          guestAccessToken = cookie.value;
          break;
        }
      }
    }
  }

  const detail = await getStorefrontInquiryDetailByIdOrQuoteNumber({
    idOrQuoteNumber: id,
    userId,
    guestAccessToken,
  });

  if (!detail) {
    return new Response(JSON.stringify({ code: 'NOT_FOUND', message: 'Inquiry not found or access denied' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...frontCorsHeaders() },
    });
  }

  const afterId = request.nextUrl.searchParams.get('after')?.trim() || null;
  let cursor = afterId ? await getStorefrontInquiryMessageCursor(detail.id, afterId) : null;
  if (afterId && !cursor) {
    const lastMessage = detail.messages.at(-1);
    cursor = lastMessage ? new Date(lastMessage.createdAt) : null;
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      send('ready', { inquiryId: detail.id, quoteNumber: detail.quoteNumber });

      let closed = false;
      const abort = () => {
        closed = true;
      };
      request.signal.addEventListener('abort', abort);

      try {
        while (!closed) {
          const messages = await listStorefrontInquiryMessagesSince(detail.id, cursor);
          for (const message of messages) {
            send('message', serializeMessage(message));
            cursor = message.createdAt;
          }

          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      } catch {
        send('error', { message: 'Stream interrupted' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      ...frontCorsHeaders(),
    },
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: frontCorsHeaders(),
  });
}
