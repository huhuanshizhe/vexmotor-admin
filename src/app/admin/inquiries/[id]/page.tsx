import { notFound } from 'next/navigation';

import { resolveInquiryDetailBack } from '@/lib/inquiry-list-query';
import { getAdminInquiryDetail } from '@/server/admin/inquiries';

import { InquiryDetailClient } from '../inquiry-detail-client';

export default async function AdminInquiryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const urlSearchParams = await searchParams;
  const inquiry = await getAdminInquiryDetail(id);

  if (!inquiry) {
    notFound();
  }

  const backTarget = resolveInquiryDetailBack(urlSearchParams, {
    awaitingAdmin: inquiry.awaitingAdmin,
  });

  return (
    <InquiryDetailClient
      backTarget={backTarget}
      initialInquiry={{
        ...inquiry,
        createdAt: inquiry.createdAt.toISOString(),
        handledAt: inquiry.handledAt?.toISOString() ?? null,
        lastMessageAt: inquiry.lastMessageAt?.toISOString() ?? null,
        resolvedAt: inquiry.resolvedAt?.toISOString() ?? null,
        terminatedAt: inquiry.terminatedAt?.toISOString() ?? null,
        messages: inquiry.messages.map((item) => ({
          ...item,
          createdAt: item.createdAt.toISOString(),
        })),
      }}
    />
  );
}
