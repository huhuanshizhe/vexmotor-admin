'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';

import { formatAdminDate, inquiryStatusLabels, inquiryStatusOptions } from '@/lib/admin-display';

type InquiryDetail = {
  id: string;
  status: 'new' | 'contacted' | 'quoted' | 'closed';
  fullName: string;
  email: string;
  phone: string | null;
  company: string | null;
  country: string | null;
  message: string;
  sourcePageUrl: string | null;
  internalNote: string | null;
  createdAt: string;
  handledAt: string | null;
  productName: string;
  productSlug: string;
  productSku: string;
  handledByEmail: string | null;
};

function parseInquiryMessage(message: string) {
  const lines = message.split('\n').map((line) => line.trim()).filter(Boolean);
  return {
    estimatedQuantity:
      lines.find((line) => line.startsWith('Estimated Quantity:') || line.startsWith('预计数量：'))?.replace('Estimated Quantity:', '').replace('预计数量：', '').trim() ?? null,
    targetLeadTime:
      lines.find((line) => line.startsWith('Target Lead Time:') || line.startsWith('目标交期：'))?.replace('Target Lead Time:', '').replace('目标交期：', '').trim() ?? null,
    narrative:
      lines
        .filter(
          (line) => !line.startsWith('Estimated Quantity:') && !line.startsWith('Target Lead Time:') && !line.startsWith('预计数量：') && !line.startsWith('目标交期：'),
        )
        .join('\n') || message,
  };
}

export function InquiryDetailClient({ initialInquiry }: { initialInquiry: InquiryDetail }) {
  const [inquiry, setInquiry] = useState(initialInquiry);
  const [status, setStatus] = useState(initialInquiry.status);
  const [internalNote, setInternalNote] = useState(initialInquiry.internalNote ?? '');
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const parsedMessage = parseInquiryMessage(inquiry.message);

  function save() {
    startTransition(async () => {
      setMessage(null);
      const response = await fetch(`/api/admin/inquiries/${inquiry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, internalNote }),
      });

      if (!response.ok) {
        setMessage('询盘状态更新失败。');
        return;
      }

      const nextInquiry = (await response.json()) as InquiryDetail;
      setInquiry(nextInquiry);
      setStatus(nextInquiry.status);
      setInternalNote(nextInquiry.internalNote ?? '');
      setMessage('询盘已更新。');
    });
  }

  return (
    <main style={{ display: 'grid', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0 }}>询盘详情</h1>
          <p style={{ margin: '8px 0 0', color: '#677489' }}>{inquiry.fullName} · {inquiry.email}</p>
        </div>
        <Link href="/admin/inquiries">返回询盘列表</Link>
      </div>
      <div className="info-grid">
        <article className="info-card">
          <h2 style={{ marginTop: 0 }}>客户信息</h2>
          <p>公司名称：{inquiry.company ?? '未填写'}</p>
          <p>联系电话：{inquiry.phone ?? '未填写'}</p>
          <p>国家地区：{inquiry.country ?? '未填写'}</p>
          <p>提交时间：{formatAdminDate(inquiry.createdAt)}</p>
          <p>处理时间：{inquiry.handledAt ? formatAdminDate(inquiry.handledAt) : '尚未处理'}</p>
          <p>处理人：{inquiry.handledByEmail ?? '未分配'}</p>
        </article>
        <article className="info-card">
          <h2 style={{ marginTop: 0 }}>产品信息</h2>
          <p>{inquiry.productName}</p>
          <p>{inquiry.productSku}</p>
          <Link href={`/products/${inquiry.productSlug}`} className="nav-link">查看前台产品页</Link>
          {inquiry.sourcePageUrl ? <p style={{ wordBreak: 'break-all' }}>来源页面：{inquiry.sourcePageUrl}</p> : null}
        </article>
      </div>
      <article className="info-card">
        <h2 style={{ marginTop: 0 }}>客户留言</h2>
        <p style={{ whiteSpace: 'pre-wrap' }}>{parsedMessage.narrative}</p>
      </article>
      {parsedMessage.estimatedQuantity || parsedMessage.targetLeadTime ? (
        <div className="info-grid">
          {parsedMessage.estimatedQuantity ? (
            <article className="info-card">
              <h2 style={{ marginTop: 0 }}>预计数量</h2>
              <p style={{ marginBottom: 0 }}>{parsedMessage.estimatedQuantity}</p>
            </article>
          ) : null}
          {parsedMessage.targetLeadTime ? (
            <article className="info-card">
              <h2 style={{ marginTop: 0 }}>目标交期</h2>
              <p style={{ marginBottom: 0 }}>{parsedMessage.targetLeadTime}</p>
            </article>
          ) : null}
        </div>
      ) : null}
      <article className="info-card">
        <h2 style={{ marginTop: 0 }}>处理信息</h2>
        <p>当前状态：{inquiryStatusLabels[inquiry.status]}</p>
        <p>处理时间：{inquiry.handledAt ? formatAdminDate(inquiry.handledAt) : '尚未处理'}</p>
        <p style={{ marginBottom: 0 }}>处理人：{inquiry.handledByEmail ?? '未分配'}</p>
      </article>
      <article className="info-card" style={{ display: 'grid', gap: 12 }}>
        <h2 style={{ marginTop: 0 }}>流程更新</h2>
        <label style={{ display: 'grid', gap: 8 }}>
          <span>询盘状态</span>
          <select value={status} onChange={(event) => setStatus(event.target.value as InquiryDetail['status'])} style={{ minHeight: 44, borderRadius: 12, border: '1px solid var(--color-border)', padding: '0 12px' }}>
            {inquiryStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label style={{ display: 'grid', gap: 8 }}>
          <span>内部备注</span>
          <textarea rows={6} value={internalNote} onChange={(event) => setInternalNote(event.target.value)} style={{ borderRadius: 16, border: '1px solid var(--color-border)', padding: 14, font: 'inherit' }} />
        </label>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button type="button" className="button-primary" disabled={isPending} onClick={save}>{isPending ? '保存中...' : '保存更新'}</button>
        </div>
        {message ? <p style={{ margin: 0, color: '#677489' }}>{message}</p> : null}
      </article>
    </main>
  );
}
