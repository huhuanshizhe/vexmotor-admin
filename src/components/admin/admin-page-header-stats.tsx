import { Typography } from 'antd';

export type AdminPageHeaderStatItem = {
  label: string;
  value: number;
};

export function AdminPageHeaderStats({ items }: { items: AdminPageHeaderStatItem[] }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        flexShrink: 0,
        padding: '6px 4px',
        borderRadius: 10,
        background: 'rgba(0, 0, 0, 0.02)',
        border: '1px solid rgba(0, 0, 0, 0.06)',
      }}
    >
      {items.map((item, index) => (
        <div key={item.label} style={{ display: 'flex', alignItems: 'center' }}>
          {index > 0 ? (
            <div
              aria-hidden
              style={{
                width: 1,
                height: 32,
                margin: '0 16px',
                background: 'rgba(0, 0, 0, 0.08)',
              }}
            />
          ) : null}
          <div style={{ minWidth: 56, textAlign: 'center', padding: '0 8px' }}>
            <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12, lineHeight: 1.2 }}>
              {item.label}
            </Typography.Text>
            <Typography.Text
              strong
              style={{
                display: 'block',
                fontSize: 18,
                lineHeight: 1.3,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {item.value}
            </Typography.Text>
          </div>
        </div>
      ))}
    </div>
  );
}
