'use client';

import type { ReactNode } from 'react';

import { StoredCountryLabel } from '@/components/geo/stored-country-label';
import { formatCustomerIndustryLabel } from '@/lib/customer-industries';
import { isContactInquiry, type InquiryQuotedLine, type InquiryRfqPayload } from '@/lib/inquiry-rfq';

type InquiryRfqPayloadPanelProps = {
  rfqPayload: InquiryRfqPayload | null;
  fallbackMessage: string;
};

function FactRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="inquiry-detail-fact">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export function InquiryRfqPayloadPanel({
  rfqPayload,
  fallbackMessage,
}: InquiryRfqPayloadPanelProps) {
  if (!rfqPayload) {
    return (
      <article className="info-card inquiry-detail-rfq-fallback">
        <h3 className="inquiry-detail-section-title">原始询盘正文</h3>
        <pre className="inquiry-detail-fallback-text">{fallbackMessage}</pre>
      </article>
    );
  }

  return (
    <div className="inquiry-detail-rfq-stack">
      <div className="inquiry-detail-rfq-panels">
        <article className="info-card inquiry-detail-facts-card">
          <h3 className="inquiry-detail-section-title">联系与公司</h3>
          <dl className="inquiry-detail-facts">
            <FactRow label="姓名">{rfqPayload.contact.fullName}</FactRow>
            <FactRow label="邮箱">{rfqPayload.contact.email}</FactRow>
            <FactRow label="公司">{rfqPayload.contact.company || '未填写'}</FactRow>
            <FactRow label="国家"><StoredCountryLabel value={rfqPayload.contact.country} /></FactRow>
            <FactRow label="电话">{rfqPayload.contact.phone || '未填写'}</FactRow>
            <FactRow label="VAT">{rfqPayload.contact.vat || '未填写'}</FactRow>
          </dl>
        </article>

        <article className="info-card inquiry-detail-facts-card">
          <h3 className="inquiry-detail-section-title">项目信息</h3>
          <dl className="inquiry-detail-facts">
            <FactRow label="项目名称">{rfqPayload.project.projectName || '未填写'}</FactRow>
            <FactRow label="行业">{formatCustomerIndustryLabel(rfqPayload.project.industry, 'bilingual')}</FactRow>
            <FactRow label="目标启动">{rfqPayload.project.targetStartDate || '未填写'}</FactRow>
            <FactRow label="年度量">{rfqPayload.project.annualVolumeEstimate || '未填写'}</FactRow>
          </dl>
        </article>
      </div>

      {isContactInquiry(rfqPayload) && rfqPayload.procurementDetails ? (
        <article className="info-card inquiry-detail-facts-card">
          <h3 className="inquiry-detail-section-title">采购需求</h3>
          <pre className="inquiry-detail-fallback-text">{rfqPayload.procurementDetails}</pre>
        </article>
      ) : null}

      {rfqPayload.projectAttachments.length ? (
        <article className="info-card inquiry-detail-attachments-card">
          <h3 className="inquiry-detail-section-title">项目附件</h3>
          <ul className="inquiry-detail-attachments">
            {rfqPayload.projectAttachments.map((file) => (
              <li key={file.key}>
                <a href={file.url} className="nav-link" target="_blank" rel="noreferrer">
                  {file.filename}
                </a>
              </li>
            ))}
          </ul>
        </article>
      ) : null}
    </div>
  );
}

export type { InquiryQuotedLine };
