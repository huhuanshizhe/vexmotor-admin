'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';

import { InquiryDetailBack } from '@/components/inquiries/inquiry-detail-back';
import {
  formatAdminDate,
  getInquiryResolutionLabel,
  inquiryQueueKindLabels,
  inquiryStatusLabels,
  inquiryStatusOptions,
} from '@/lib/admin-display';
import { parseInquiryMessage } from '@/lib/inquiry-message';

type InquiryMessageItem = {
  id: string;
  inquiryId: string;
  senderType: 'customer' | 'admin';
  adminId: string | null;
  adminName: string | null;
  body: string;
  createdAt: string;
};

type InquiryDetail = {
  id: string;
  status: 'new' | 'contacted' | 'quoted' | 'closed';
  awaitingAdmin: boolean;
  queueKind: 'new_inquiry' | 'customer_replied' | null;
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
  lastMessageAt: string | null;
  resolvedAt: string | null;
  terminatedAt: string | null;
  productName: string;
  productSlug: string;
  productSpu: string;
  handledByEmail: string | null;
  messages: InquiryMessageItem[];
};

type InquiryStatusFieldProps = {
  label: string;
  value: string;
  muted?: boolean;
};

function InquiryStatusField({ label, value, muted }: InquiryStatusFieldProps) {
  return (
    <div className="inquiry-status-card__item">
      <span className="inquiry-status-card__label">{label}</span>
      <span className={`inquiry-status-card__value${muted ? ' inquiry-status-card__value--muted' : ''}`}>{value}</span>
    </div>
  );
}

export function InquiryDetailClient({
  initialInquiry,
  backTarget,
}: {
  initialInquiry: InquiryDetail;
  backTarget: { href: string; label: string };
}) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [inquiry, setInquiry] = useState(initialInquiry);
  const [status, setStatus] = useState(initialInquiry.status);
  const [internalNote, setInternalNote] = useState(initialInquiry.internalNote ?? '');
  const [replyDraft, setReplyDraft] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const firstCustomerMessage = inquiry.messages.find((item) => item.senderType === 'customer')?.body ?? inquiry.message;
  const parsedMessage = parseInquiryMessage(firstCustomerMessage);
  const resolutionLabel = getInquiryResolutionLabel({
    resolvedAt: inquiry.resolvedAt,
    terminatedAt: inquiry.terminatedAt,
    status: inquiry.status,
  });

  function saveMeta() {
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

  function sendReply() {
    if (!replyDraft.trim()) return;
    startTransition(async () => {
      setMessage(null);
      const response = await fetch(`/api/admin/inquiries/${inquiry.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: replyDraft.trim() }),
      });

      if (!response.ok) {
        setMessage('回复发送失败。');
        return;
      }

      const nextInquiry = (await response.json()) as InquiryDetail;
      setInquiry(nextInquiry);
      setReplyDraft('');
      setMessage('回复已发送，询盘已移出待处理队列。');
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  }

  function terminateInquiry() {
    if (!window.confirm('确定将该询盘标记为已终止吗？终止后将不再出现在待处理列表。')) return;

    startTransition(async () => {
      setMessage(null);
      const response = await fetch(`/api/admin/inquiries/${inquiry.id}/terminate`, { method: 'POST' });
      if (!response.ok) {
        setMessage('标记已终止失败。');
        return;
      }
      router.push(backTarget.href);
      router.refresh();
    });
  }

  return (
    <main style={{ display: 'grid', gap: 20 }}>
      <InquiryDetailBack href={backTarget.href} label={backTarget.label} />

      <h1 style={{ margin: 0 }}>询盘详情</h1>

      <div className="info-grid">
        <article className="info-card">
          <h2 style={{ marginTop: 0 }}>客户信息</h2>
          <p>客户姓名：{inquiry.fullName}</p>
          <p>联系邮箱：{inquiry.email}</p>
          <p>公司名称：{inquiry.company ?? '未填写'}</p>
          <p>联系电话：{inquiry.phone ?? '未填写'}</p>
          <p style={{ marginBottom: 0 }}>国家地区：{inquiry.country ?? '未填写'}</p>
        </article>
        <article className="info-card">
          <h2 style={{ marginTop: 0 }}>产品信息</h2>
          <p>{inquiry.productName}</p>
          <p>{inquiry.productSpu}</p>
          <Link href={`/products/${inquiry.productSlug}`} className="nav-link">查看前台产品页</Link>
          {inquiry.sourcePageUrl ? <p style={{ wordBreak: 'break-all', marginBottom: 0 }}>来源页面：{inquiry.sourcePageUrl}</p> : null}
        </article>
      </div>

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

      <article className="info-card inquiry-status-card">
        <div className="inquiry-status-card__header">
          <h2>处理状态</h2>
          {!inquiry.terminatedAt ? (
            <button
              type="button"
              className="button-outline-danger"
              disabled={isPending}
              onClick={terminateInquiry}
            >
              标记已终止
            </button>
          ) : null}
        </div>
        <div className="inquiry-status-card__grid">
          <InquiryStatusField label="销售状态" value={inquiryStatusLabels[inquiry.status]} />
          <InquiryStatusField
            label="队列类型"
            value={inquiry.queueKind ? inquiryQueueKindLabels[inquiry.queueKind] : '—'}
            muted={!inquiry.queueKind}
          />
          <InquiryStatusField label="待处理" value={inquiry.awaitingAdmin ? '是' : '否'} />
          <InquiryStatusField label="结束原因" value={resolutionLabel} muted={resolutionLabel === '—'} />
          <InquiryStatusField label="提交时间" value={formatAdminDate(inquiry.createdAt)} />
          <InquiryStatusField
            label="处理时间"
            value={inquiry.handledAt ? formatAdminDate(inquiry.handledAt) : '尚未处理'}
            muted={!inquiry.handledAt}
          />
          <InquiryStatusField
            label="处理人"
            value={inquiry.handledByEmail ?? '未分配'}
            muted={!inquiry.handledByEmail}
          />
          <InquiryStatusField
            label="最后消息"
            value={formatAdminDate(inquiry.lastMessageAt ?? inquiry.createdAt)}
          />
        </div>
      </article>

      <article className="info-card" style={{ display: 'grid', gap: 12 }}>
        <h2 style={{ marginTop: 0 }}>对话记录</h2>
        <div
          ref={scrollRef}
          style={{
            maxHeight: 420,
            overflowY: 'auto',
            border: '1px solid var(--color-border)',
            borderRadius: 12,
            padding: 12,
            background: '#fafafa',
            display: 'grid',
            gap: 12,
          }}
        >
          {!inquiry.messages.length ? (
            <p style={{ margin: 0, color: '#677489' }}>暂无对话记录。</p>
          ) : (
            inquiry.messages.map((item) => {
              const isAdmin = item.senderType === 'admin';
              return (
                <div key={item.id} style={{ display: 'flex', justifyContent: isAdmin ? 'flex-start' : 'flex-end' }}>
                  <div
                    style={{
                      maxWidth: '78%',
                      background: isAdmin ? '#fff' : '#e6f4ff',
                      border: '1px solid #f0f0f0',
                      borderRadius: 8,
                      padding: '8px 12px',
                    }}
                  >
                    <p style={{ margin: '0 0 4px', color: '#677489', fontSize: 12 }}>
                      {isAdmin ? (item.adminName ?? '管理员') : inquiry.fullName} · {formatAdminDate(item.createdAt)}
                    </p>
                    <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{item.body}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <label style={{ display: 'grid', gap: 8 }}>
          <span>发送回复</span>
          <textarea
            rows={4}
            value={replyDraft}
            onChange={(event) => setReplyDraft(event.target.value)}
            style={{ borderRadius: 16, border: '1px solid var(--color-border)', padding: 14, font: 'inherit' }}
            placeholder="输入回复内容，发送后询盘将移出待处理队列"
          />
        </label>
        <div>
          <button type="button" className="button-primary" disabled={isPending || !replyDraft.trim()} onClick={sendReply}>
            {isPending ? '发送中...' : '发送回复'}
          </button>
        </div>
      </article>

      <article className="info-card" style={{ display: 'grid', gap: 12 }}>
        <h2 style={{ marginTop: 0 }}>销售跟进</h2>
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
          <textarea rows={5} value={internalNote} onChange={(event) => setInternalNote(event.target.value)} style={{ borderRadius: 16, border: '1px solid var(--color-border)', padding: 14, font: 'inherit' }} />
        </label>
        <div>
          <button type="button" className="button-primary" disabled={isPending} onClick={saveMeta}>
            {isPending ? '保存中...' : '保存跟进信息'}
          </button>
        </div>
        {message ? <p style={{ margin: 0, color: '#677489' }}>{message}</p> : null}
      </article>
    </main>
  );
}
