'use client';

import { Input, Space, Typography } from 'antd';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';

import { OrderPendingCard } from '@/components/orders/order-pending-card';
import { OrderViewSwitch } from '@/components/orders/order-view-switch';
import {
  buildOrderPendingListUrl,
  type OrderPendingListQuery,
  parseOrderPendingListQuery,
} from '@/lib/order-list-query';
import type { AdminOrderListItem } from '@/server/admin/orders';

type OrderPendingListClientProps = {
  initialItems: AdminOrderListItem[];
  initialQuery: OrderPendingListQuery;
};

async function fetchPendingOrders(query: OrderPendingListQuery) {
  const params = new URLSearchParams();
  if (query.keyword) params.set('keyword', query.keyword);

  const response = await fetch(`/api/admin/orders/pending?${params.toString()}`, { cache: 'no-store' });
  if (!response.ok) throw new Error('加载待处理订单失败');
  const payload = (await response.json()) as { items: AdminOrderListItem[] };
  return payload.items;
}

export function OrderPendingListClient({ initialItems, initialQuery }: OrderPendingListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMountRef = useRef(true);

  const [items, setItems] = useState(initialItems);
  const [query, setQuery] = useState(initialQuery);
  const [searchInput, setSearchInput] = useState(initialQuery.keyword);
  const [isPending, startTransition] = useTransition();

  const replaceUrl = useCallback((nextQuery: OrderPendingListQuery) => {
    router.replace(buildOrderPendingListUrl('/admin/orders', nextQuery), { scroll: false });
  }, [router]);

  const reload = useCallback((nextQuery: OrderPendingListQuery) => {
    startTransition(async () => {
      const nextItems = await fetchPendingOrders(nextQuery);
      setItems(nextItems);
      setQuery(nextQuery);
    });
  }, []);

  useEffect(() => {
    if (initialMountRef.current) {
      initialMountRef.current = false;
      return;
    }
    const urlQuery = parseOrderPendingListQuery(Object.fromEntries(searchParams.entries()));
    setSearchInput(urlQuery.keyword);
    reload(urlQuery);
  }, [searchParams, reload]);

  function applyQueryChange(patch: Partial<OrderPendingListQuery>) {
    const nextQuery: OrderPendingListQuery = {
      keyword: patch.keyword ?? query.keyword,
    };
    setSearchInput(nextQuery.keyword);
    replaceUrl(nextQuery);
  }

  return (
    <main style={{ display: 'grid', gap: 20 }}>
      <div>
        <h1 style={{ margin: 0 }}>订单管理</h1>
        <p style={{ margin: '8px 0 0', color: '#677489' }}>查看已付款待处理订单，跟进发货与履约。</p>
      </div>

      <OrderViewSwitch current="pending" pendingCount={items.length} />

      <Space wrap style={{ width: '100%' }}>
        <Input.Search
          allowClear
          placeholder="搜索订单号 / 客户邮箱"
          style={{ width: 280 }}
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          onSearch={(value) => applyQueryChange({ keyword: value.trim() })}
        />
      </Space>

      {isPending ? <Typography.Text type="secondary">加载中…</Typography.Text> : null}

      {!items.length && !isPending ? (
        <article className="info-card">
          <h2>暂无待处理订单</h2>
          <p className="section-description">客户完成付款后，订单将出现在这里。</p>
        </article>
      ) : (
        <div className="info-grid">
          {items.map((order) => (
            <OrderPendingCard key={order.id} order={order} listQuery={query} />
          ))}
        </div>
      )}
    </main>
  );
}
