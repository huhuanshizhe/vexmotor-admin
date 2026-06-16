import Link from 'next/link';

import { formatAdminDate, inquiryStatusLabels } from '@/lib/admin-display';
import { getAdminInquiries } from '@/server/admin/inquiries';

export default async function AdminInquiriesPage() {
  const inquiries = await getAdminInquiries();

  return (
    <main style={{ display: 'grid', gap: 24 }}>
      <div>
        <h1 style={{ margin: 0 }}>询盘管理</h1>
        <p style={{ margin: '8px 0 0', color: '#677489' }}>统一处理前台 RFQ 询盘、报价跟进与销售线索流转。</p>
      </div>
      {!inquiries.length ? (
        <article className="info-card">
          <h2>暂无询盘</h2>
          <p className="section-description">客户提交询价后，询盘会自动进入这里，供销售团队分配和跟进。</p>
        </article>
      ) : (
        <div className="info-grid">
          {inquiries.map((inquiry) => (
            <article key={inquiry.id} className="info-card" style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0 }}>{inquiry.productName}</h2>
                <span className="product-badge">{inquiryStatusLabels[inquiry.status]}</span>
              </div>
              <p style={{ margin: 0, color: '#677489' }}>{inquiry.fullName} · {inquiry.email}</p>
              <p style={{ margin: 0, color: '#677489' }}>
                {[inquiry.company, inquiry.country].filter(Boolean).join(' · ') || '未填写公司信息的游客提交'}
              </p>
              <p style={{ margin: 0, color: '#677489' }}>提交时间：{formatAdminDate(inquiry.createdAt)}</p>
              <Link href={`/admin/inquiries/${inquiry.id}`}>查看询盘详情</Link>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
