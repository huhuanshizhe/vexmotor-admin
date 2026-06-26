import { ArrowLeftOutlined } from '@ant-design/icons';
import Link from 'next/link';

type OrderDetailBackProps = {
  href: string;
  label: string;
};

export function OrderDetailBack({ href, label }: OrderDetailBackProps) {
  return (
    <Link href={href} className="inquiry-detail-back">
      <ArrowLeftOutlined />
      <span>{label}</span>
    </Link>
  );
}
