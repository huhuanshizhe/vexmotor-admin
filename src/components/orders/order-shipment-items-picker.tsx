'use client';

import { Checkbox, InputNumber } from 'antd';

import type { AdminOrderItem } from '@/server/admin/orders';

export type DraftShipmentItem = {
  orderItemId: string;
  selected: boolean;
  quantity: number | null;
};

type OrderShipmentItemsPickerProps = {
  orderItems: AdminOrderItem[];
  value?: DraftShipmentItem[];
  onChange?: (next: DraftShipmentItem[]) => void;
  disabled?: boolean;
};

export function createDraftShipmentItems(orderItems: AdminOrderItem[]): DraftShipmentItem[] {
  return orderItems.map((item) => ({
    orderItemId: item.id,
    selected: false,
    quantity: item.quantity,
  }));
}

export function serializeDraftShipmentItems(items: DraftShipmentItem[]) {
  return items
    .filter((item) => item.selected)
    .map((item) => ({
      orderItemId: item.orderItemId,
      quantity: item.quantity ?? null,
    }));
}

export function OrderShipmentItemsPicker({ orderItems, value, onChange, disabled }: OrderShipmentItemsPickerProps) {
  const rows = value?.length === orderItems.length ? value : createDraftShipmentItems(orderItems);

  return (
    <div className="order-shipment-items-picker">
      <span className="order-shipment-items-picker__title">发货商品（选填）</span>
      <div className="order-shipment-items-picker__list">
        {orderItems.map((item, index) => {
          const draft = rows[index];
          if (!draft) return null;

          return (
            <div key={item.id} className="order-shipment-items-picker__row">
              <Checkbox
                checked={draft.selected}
                disabled={disabled}
                onChange={(event) => {
                  const next = [...rows];
                  next[index] = { ...draft, selected: event.target.checked };
                  onChange?.(next);
                }}
              >
                {item.productName} · {item.spu} · 订购 {item.quantity}
              </Checkbox>
              <label className="order-shipment-items-picker__quantity">
                <span>本次发货数量</span>
                <InputNumber
                  min={1}
                  max={item.quantity}
                  disabled={disabled || !draft.selected}
                  value={draft.quantity ?? undefined}
                  placeholder="选填"
                  style={{ width: 120 }}
                  onChange={(nextQuantity) => {
                    const next = [...rows];
                    next[index] = { ...draft, quantity: nextQuantity ?? null };
                    onChange?.(next);
                  }}
                />
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}
