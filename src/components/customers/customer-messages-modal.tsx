'use client';

import { Button, Input, Modal, Space, Typography, message } from 'antd';
import { useEffect, useRef, useState, useTransition } from 'react';

import { formatAdminDate } from '@/lib/admin-display';
import type { AdminCustomerMessage } from '@/server/admin/customers';

type CustomerMessagesModalProps = {
  open: boolean;
  customerId: string | null;
  customerName?: string;
  onClose: () => void;
  onSent?: () => void;
};

export function CustomerMessagesModal({
  open,
  customerId,
  customerName,
  onClose,
  onSent,
}: CustomerMessagesModalProps) {
  const [messages, setMessages] = useState<AdminCustomerMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [isPending, startTransition] = useTransition();
  const [messageApi, contextHolder] = message.useMessage();
  const scrollRef = useRef<HTMLDivElement | null>(null);

  async function loadMessages(targetId: string) {
    const response = await fetch(`/api/admin/customers/${targetId}/messages`, { cache: 'no-store' });
    if (!response.ok) {
      messageApi.error('加载站内信失败');
      return;
    }
    const payload = (await response.json()) as { items: AdminCustomerMessage[] };
    setMessages(payload.items ?? []);
  }

  useEffect(() => {
    if (!open || !customerId) {
      setMessages([]);
      setDraft('');
      return;
    }

    startTransition(async () => {
      await loadMessages(customerId);
    });
  }, [open, customerId]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open]);

  function sendMessage() {
    if (!customerId || !draft.trim()) return;

    startTransition(async () => {
      const response = await fetch(`/api/admin/customers/${customerId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: draft.trim() }),
      });
      if (!response.ok) {
        messageApi.error('发送失败');
        return;
      }
      setDraft('');
      await loadMessages(customerId);
      onSent?.();
      messageApi.success('消息已发送');
    });
  }

  return (
    <>
      {contextHolder}
      <Modal
        open={open}
        title={customerName ? `${customerName} · 站内信` : '站内信'}
        onCancel={onClose}
        footer={null}
        width={720}
        destroyOnHidden
      >
        <div
          ref={scrollRef}
          style={{
            maxHeight: 360,
            overflowY: 'auto',
            border: '1px solid #f0f0f0',
            borderRadius: 8,
            padding: 12,
            marginBottom: 12,
            background: '#fafafa',
          }}
        >
          {!messages.length ? (
            <Typography.Text type="secondary">暂无消息，发送第一条站内信吧。</Typography.Text>
          ) : (
            <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
              {messages.map((item) => {
                const isAdmin = item.senderType === 'admin';
                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      justifyContent: isAdmin ? 'flex-start' : 'flex-end',
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '78%',
                        background: isAdmin ? '#fff' : '#e6f4ff',
                        border: '1px solid #f0f0f0',
                        borderRadius: 8,
                        padding: '8px 12px',
                      }}
                    >
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {isAdmin ? (item.adminName ?? '管理员') : '客户'} · {formatAdminDate(item.createdAt)}
                      </Typography.Text>
                      <Typography.Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                        {item.body}
                      </Typography.Paragraph>
                    </div>
                  </div>
                );
              })}
            </Space>
          )}
        </div>

        <Space.Compact style={{ width: '100%' }}>
          <Input.TextArea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="输入要发送的站内信内容"
            autoSize={{ minRows: 2, maxRows: 4 }}
            disabled={isPending}
          />
        </Space.Compact>
        <div style={{ marginTop: 12, textAlign: 'right' }}>
          <Button type="primary" loading={isPending} disabled={!draft.trim()} onClick={sendMessage}>
            发送
          </Button>
        </div>
      </Modal>
    </>
  );
}
