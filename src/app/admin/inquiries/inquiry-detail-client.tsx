'use client';

import { Image, message } from 'antd';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';

import { InquiryDetailBack } from '@/components/inquiries/inquiry-detail-back';
import { InquiryRfqPayloadPanel, type InquiryQuotedLine } from '@/components/inquiries/inquiry-rfq-payload-panel';
import {
  formatAdminDate,
  getInquiryResolutionLabel,
  inquiryQueueKindLabels,
  inquiryStatusLabels,
} from '@/lib/admin-display';
import { formatInquirySalesStatus, INQUIRY_SALES_STATUS_OPTIONS, type InquirySalesStatus } from '@/lib/inquiry-sales-status';
import type { InquiryRfqPayload } from '@/lib/inquiry-rfq';

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
  quoteNumber: string | null;
  status: 'new' | 'contacted' | 'quoted' | 'closed';
  salesStatus: InquirySalesStatus;
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
  expiresAt: string | null;
  productName: string;
  productSlug: string;
  productSpu: string;
  productId?: string;
  handledByEmail: string | null;
  rfqPayload: InquiryRfqPayload | null;
  quotedLines: InquiryQuotedLine[] | null;
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
  const [salesStatus, setSalesStatus] = useState<InquirySalesStatus>(initialInquiry.salesStatus ?? 'unset');
  const [internalNote, setInternalNote] = useState(initialInquiry.internalNote ?? '');
  const [quotedLines, setQuotedLines] = useState<InquiryQuotedLine[]>(initialInquiry.quotedLines ?? []);
  const [expiresAt, setExpiresAt] = useState(initialInquiry.expiresAt?.slice(0, 10) ?? '');
  const [replyDraft, setReplyDraft] = useState('');
  const [isPending, startTransition] = useTransition();

  function scrollMessagesToBottom() {
    requestAnimationFrame(() => {
      const container = scrollRef.current;
      if (!container) {
        return;
      }
      container.scrollTop = container.scrollHeight;
    });
  }

  const messageScrollKey = inquiry.messages.map((item) => item.id).join(',');

  useEffect(() => {
    scrollMessagesToBottom();
  }, [messageScrollKey]);

  const resolutionLabel = getInquiryResolutionLabel({
    resolvedAt: inquiry.resolvedAt,
    terminatedAt: inquiry.terminatedAt,
    status: inquiry.status,
  });

  function saveQuote() {
    startTransition(async () => {
      const response = await fetch(`/api/admin/inquiries/${inquiry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quotedLines: quotedLines.length ? quotedLines : null,
          expiresAt: expiresAt ? new Date(`${expiresAt}T23:59:59.000Z`).toISOString() : null,
        }),
      });

      if (!response.ok) {
        void message.error('报价单保存失败');
        return;
      }

      const nextInquiry = (await response.json()) as InquiryDetail;
      setInquiry(nextInquiry);
      setQuotedLines(nextInquiry.quotedLines ?? []);
      setExpiresAt(nextInquiry.expiresAt?.slice(0, 10) ?? '');
      void message.success('报价单已保存');
    });
  }

  function saveSalesFollowUp() {
    startTransition(async () => {
      const response = await fetch(`/api/admin/inquiries/${inquiry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salesStatus,
          internalNote,
        }),
      });

      if (!response.ok) {
        void message.error('销售跟进保存失败');
        return;
      }

      const nextInquiry = (await response.json()) as InquiryDetail;
      setInquiry(nextInquiry);
      setSalesStatus(nextInquiry.salesStatus ?? 'unset');
      setInternalNote(nextInquiry.internalNote ?? '');
      void message.success('销售跟进已保存');
    });
  }

  function updateQuotedLine(index: number, patch: Partial<InquiryQuotedLine>) {
    setQuotedLines((current) => current.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)));
  }

  function sendReply() {
    if (!replyDraft.trim()) return;
    startTransition(async () => {
      const response = await fetch(`/api/admin/inquiries/${inquiry.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: replyDraft.trim() }),
      });

      if (!response.ok) {
        void message.error('回复发送失败');
        return;
      }

      const nextInquiry = (await response.json()) as InquiryDetail;
      setInquiry(nextInquiry);
      setReplyDraft('');
      void message.success('回复已发送，询盘已移出待处理队列');
    });
  }

  function terminateInquiry() {
    if (!window.confirm('确定将该询盘标记为已终止吗？终止后将不再出现在待处理列表。')) return;

    startTransition(async () => {
      const response = await fetch(`/api/admin/inquiries/${inquiry.id}/terminate`, { method: 'POST' });
      if (!response.ok) {
        void message.error('标记已终止失败');
        return;
      }
      router.push(backTarget.href);
      router.refresh();
    });
  }

  return (
    <main style={{ display: 'grid', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'grid', gap: 12 }}>
          <InquiryDetailBack href={backTarget.href} label={backTarget.label} />
          <h1 style={{ margin: 0 }}>询盘详情{inquiry.quoteNumber ? ` · ${inquiry.quoteNumber}` : ''}</h1>
        </div>
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

      <article className="info-card inquiry-status-card">
        <div className="inquiry-status-card__header">
          <h2>处理状态</h2>
        </div>
        <div className="inquiry-status-card__grid">
          <InquiryStatusField label="询盘阶段" value={inquiryStatusLabels[inquiry.status]} />
          <InquiryStatusField
            label="待办原因"
            value={inquiry.queueKind ? inquiryQueueKindLabels[inquiry.queueKind] : '—'}
            muted={!inquiry.queueKind}
          />
          <InquiryStatusField label="待处理" value={inquiry.awaitingAdmin ? '是' : '否'} />
          <InquiryStatusField label="销售状态" value={formatInquirySalesStatus(inquiry.salesStatus)} />
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

      <section className="inquiry-detail-body">
        <div>
          <h2 className="inquiry-detail-workspace__heading">客户 RFQ</h2>
          <InquiryRfqPayloadPanel rfqPayload={inquiry.rfqPayload} fallbackMessage={inquiry.message} />
        </div>

        <article className="info-card inquiry-detail-quote-card">
          <div className="inquiry-detail-section-head">
            <h2 className="inquiry-detail-section-title">报价单</h2>
            <span className="inquiry-detail-section-meta">{quotedLines.length} 行</span>
          </div>
          <p className="inquiry-detail-quote-card__desc">基于客户询盘行项填写报价；保存后前台可见，并自动将询盘阶段更新为已报价。</p>

          <div className="inquiry-quote-editor-list">
            {quotedLines.map((line, index) => {
              const rfqLine = inquiry.rfqPayload?.lines.find(
                (item) => (item.productId && item.productId === line.productId) || item.spu === line.spu,
              ) ?? inquiry.rfqPayload?.lines[index];

              return (
                <div key={`${line.productId}-${index}`} className="inquiry-quote-editor">
                  <div className="inquiry-quote-editor__layout">
                    <div className="inquiry-quote-editor__thumb">
                      {rfqLine?.coverImage?.url ? (
                        <Image
                          src={rfqLine.coverImage.url}
                          alt={rfqLine.coverImage.alt || line.name}
                          width={72}
                          height={72}
                          style={{ objectFit: 'cover', borderRadius: 8 }}
                          preview={{ mask: '预览' }}
                        />
                      ) : (
                        <span className="inquiry-quote-editor__thumb-fallback">{line.spu.slice(0, 2)}</span>
                      )}
                    </div>

                    <div className="inquiry-quote-editor__main">
                      <div className="inquiry-quote-editor__head">
                        <div className="inquiry-quote-editor__product">
                          {line.slug ? (
                            <Link href={`/products/${line.slug}`} className="inquiry-quote-editor__name nav-link">
                              {line.name}
                            </Link>
                          ) : (
                            <span className="inquiry-quote-editor__name">{line.name}</span>
                          )}
                          <strong className="inquiry-quote-editor__spu">{line.spu}</strong>
                        </div>
                        {rfqLine?.requiredBy ? (
                          <span className="inquiry-quote-editor__rfq-hint">客户需求日期：{rfqLine.requiredBy}</span>
                        ) : null}
                      </div>
                      <div className="inquiry-quote-editor__fields">
                        <label className="inquiry-quote-editor__field">
                          <span>数量</span>
                          <input
                            type="number"
                            className="inquiry-input--readonly"
                            readOnly
                            value={line.quantity}
                            tabIndex={-1}
                          />
                        </label>
                        <label className="inquiry-quote-editor__field">
                          <span>单价</span>
                          <div className="inquiry-input-append">
                            <input
                              type="number"
                              className="inquiry-input-append__price"
                              min={0}
                              step="0.01"
                              value={line.unitPrice}
                              onChange={(event) => updateQuotedLine(index, { unitPrice: Number(event.target.value) || 0 })}
                            />
                            <input
                              type="text"
                              className="inquiry-input-append__suffix"
                              value={line.currency}
                              maxLength={3}
                              aria-label="币种"
                              onChange={(event) => updateQuotedLine(index, { currency: event.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) })}
                            />
                          </div>
                        </label>
                        <label className="inquiry-quote-editor__field inquiry-quote-editor__field--wide">
                          <span>交期</span>
                          <input
                            value={line.leadTime}
                            onChange={(event) => updateQuotedLine(index, { leadTime: event.target.value })}
                            placeholder="例如 4-6 weeks"
                          />
                        </label>
                        <label className="inquiry-quote-editor__field inquiry-quote-editor__field--full">
                          <span>备注</span>
                          <input
                            value={line.note}
                            onChange={(event) => updateQuotedLine(index, { note: event.target.value })}
                            placeholder={rfqLine?.notes || undefined}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {!quotedLines.length ? (
            <p className="inquiry-detail-quote-card__empty">暂无行项，请确认询盘包含有效产品行。</p>
          ) : null}

          <label className="inquiry-quote-editor__expires">
            <span>报价有效期</span>
            <input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} />
          </label>
          <div className="inquiry-detail-quote-card__actions">
            <button type="button" className="button-primary" disabled={isPending || !quotedLines.length} onClick={saveQuote}>
              {isPending ? '保存中...' : '保存报价单'}
            </button>
          </div>
        </article>
      </section>

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
          <span>销售状态</span>
          <select
            value={salesStatus}
            onChange={(event) => setSalesStatus(event.target.value as InquirySalesStatus)}
            style={{ minHeight: 44, borderRadius: 12, border: '1px solid var(--color-border)', padding: '0 12px' }}
          >
            {INQUIRY_SALES_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label style={{ display: 'grid', gap: 8 }}>
          <span>内部备注</span>
          <textarea rows={5} value={internalNote} onChange={(event) => setInternalNote(event.target.value)} style={{ borderRadius: 16, border: '1px solid var(--color-border)', padding: 14, font: 'inherit' }} />
        </label>
        <div>
          <button type="button" className="button-primary" disabled={isPending} onClick={saveSalesFollowUp}>
            {isPending ? '保存中...' : '保存跟进信息'}
          </button>
        </div>
      </article>
    </main>
  );
}
