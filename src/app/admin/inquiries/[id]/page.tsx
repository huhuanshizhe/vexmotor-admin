import { notFound } from 'next/navigation';

import { getAdminInquiryDetail } from '@/server/admin/inquiries';

import { InquiryDetailClient } from '../inquiry-detail-client';

export default async function AdminInquiryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const inquiry = await getAdminInquiryDetail(id);

  if (!inquiry) {
    notFound();
  }

  return <InquiryDetailClient initialInquiry={{ ...inquiry, createdAt: inquiry.createdAt.toISOString(), handledAt: inquiry.handledAt?.toISOString() ?? null }} />;
}
