'use client';

import { Button, Result } from 'antd';

export default function AdminCouponsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const message = error.message || '页面加载失败';
  const needsMigration = /coupon_locale_pricing|relation.*does not exist|column.*does not exist/i.test(message);

  return (
    <Result
      status="error"
      title="优惠券页面加载失败"
      subTitle={needsMigration
        ? '数据库结构可能未更新。请先停止开发服务器，执行 pnpm db:migrate 后重新启动 pnpm dev。'
        : message}
      extra={(
        <Button type="primary" onClick={reset}>
          重试
        </Button>
      )}
    />
  );
}
