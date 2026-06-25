import { ArrowLeftOutlined } from '@ant-design/icons';
import Link from 'next/link';

type InquiryDetailBackProps = {
  href: string;
  label: string;
};

export function InquiryDetailBack({ href, label }: InquiryDetailBackProps) {
  return (
    <Link href={href} className="inquiry-detail-back">
      <ArrowLeftOutlined />
      <span>{label}</span>
    </Link>
  );
}
