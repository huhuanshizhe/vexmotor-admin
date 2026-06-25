'use client';

import { Input, Select, Space, Typography } from 'antd';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';

import { InquiryActiveCard } from '@/components/inquiries/inquiry-active-card';
import { InquiryViewSwitch } from '@/components/inquiries/inquiry-view-switch';
import { inquiryQueueKindOptions, inquiryStatusOptions } from '@/lib/admin-display';
import {
  buildInquiryActiveListUrl,
  type InquiryActiveListQuery,
  parseInquiryActiveListQuery,
} from '@/lib/inquiry-list-query';
import type { AdminInquiryListItem } from '@/server/admin/inquiries';

type InquiryActiveListClientProps = {
  initialItems: AdminInquiryListItem[];
  initialQuery: InquiryActiveListQuery;
};

async function fetchActiveInquiries(query: InquiryActiveListQuery) {
  const params = new URLSearchParams();
  if (query.keyword) params.set('keyword', query.keyword);
  if (query.queueKind) params.set('queue_kind', query.queueKind);
  if (query.status) params.set('status', query.status);

  const response = await fetch(`/api/admin/inquiries/active?${params.toString()}`, { cache: 'no-store' });
  if (!response.ok) throw new Error('加载待处理询盘失败');
  const payload = (await response.json()) as { items: AdminInquiryListItem[] };
  return payload.items;
}

export function InquiryActiveListClient({ initialItems, initialQuery }: InquiryActiveListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMountRef = useRef(true);

  const [items, setItems] = useState(initialItems);
  const [query, setQuery] = useState(initialQuery);
  const [searchInput, setSearchInput] = useState(initialQuery.keyword);
  const [isPending, startTransition] = useTransition();

  const replaceUrl = useCallback((nextQuery: InquiryActiveListQuery) => {
    router.replace(buildInquiryActiveListUrl('/admin/inquiries', nextQuery), { scroll: false });
  }, [router]);

  const reload = useCallback((nextQuery: InquiryActiveListQuery) => {
    startTransition(async () => {
      const nextItems = await fetchActiveInquiries(nextQuery);
      setItems(nextItems);
      setQuery(nextQuery);
    });
  }, []);

  useEffect(() => {
    if (initialMountRef.current) {
      initialMountRef.current = false;
      return;
    }
    const urlQuery = parseInquiryActiveListQuery(Object.fromEntries(searchParams.entries()));
    setSearchInput(urlQuery.keyword);
    reload(urlQuery);
  }, [searchParams, reload]);

  function applyQueryChange(patch: Partial<InquiryActiveListQuery>) {
    const nextQuery: InquiryActiveListQuery = {
      keyword: patch.keyword ?? query.keyword,
      queueKind: patch.queueKind ?? query.queueKind,
      status: patch.status ?? query.status,
    };
    setSearchInput(nextQuery.keyword);
    replaceUrl(nextQuery);
  }

  return (
    <main style={{ display: 'grid', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ margin: 0 }}>询盘管理</h1>
        </div>
      </div>

      <InquiryViewSwitch current="active" activeCount={items.length} />

      <Space wrap style={{ width: '100%' }}>
        <Input.Search
          allowClear
          placeholder="搜索姓名 / 邮箱 / 公司 / 国家"
          style={{ width: 280 }}
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          onSearch={(value) => applyQueryChange({ keyword: value.trim() })}
        />
        <Select
          allowClear
          placeholder="队列类型"
          style={{ width: 140 }}
          value={query.queueKind || undefined}
          options={inquiryQueueKindOptions}
          onChange={(value) => applyQueryChange({ queueKind: value ?? '' })}
        />
        <Select
          allowClear
          placeholder="销售状态"
          style={{ width: 140 }}
          value={query.status || undefined}
          options={inquiryStatusOptions}
          onChange={(value) => applyQueryChange({ status: value ?? '' })}
        />
        <Typography.Text type="secondary">共 {items.length} 条待处理</Typography.Text>
      </Space>

      {!items.length ? (
        <article className="info-card">
          <h2>暂无待处理询盘</h2>
          <p className="section-description">新询盘或用户新回复会出现在这里；已回复、已终止或已解决的询盘请查看历史询盘。</p>
        </article>
      ) : (
        <div className="info-grid" style={{ opacity: isPending ? 0.7 : 1 }}>
          {items.map((inquiry) => (
            <InquiryActiveCard key={inquiry.id} inquiry={inquiry} listQuery={query} />
          ))}
        </div>
      )}
    </main>
  );
}
