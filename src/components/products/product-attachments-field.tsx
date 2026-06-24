'use client';

import { DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import { Button, Input, Space, Upload, message } from 'antd';

import type { ProductAttachment } from '@/lib/product-content';
import { uploadMediaFile } from '@/lib/media-upload';

type ProductAttachmentsFieldProps = {
  value?: ProductAttachment[];
  onChange?: (value: ProductAttachment[]) => void;
  folder?: string;
};

export function ProductAttachmentsField({ value = [], onChange, folder = 'products/attachments' }: ProductAttachmentsFieldProps) {
  const items = value ?? [];

  function updateItem(index: number, patch: Partial<ProductAttachment>) {
    const next = items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item));
    onChange?.(next);
  }

  function removeItem(index: number) {
    onChange?.(items.filter((_, itemIndex) => itemIndex !== index));
  }

  return (
    <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
      {items.map((item, index) => (
        <div key={`${item.url}-${index}`} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Input
            style={{ flex: 1 }}
            placeholder="附件名称"
            value={item.name}
            onChange={(event) => updateItem(index, { name: event.target.value })}
          />
          <a href={item.url} target="_blank" rel="noreferrer">查看</a>
          <Button danger icon={<DeleteOutlined />} onClick={() => removeItem(index)} />
        </div>
      ))}
      <Upload
        showUploadList={false}
        customRequest={async ({ file, onError, onSuccess }) => {
          try {
            const uploaded = await uploadMediaFile(file as File, { folder, kind: 'document' });
            onChange?.([...items, {
              name: (file as File).name,
              url: uploaded.url,
              mimeType: uploaded.contentType ?? (file as File).type ?? 'application/octet-stream',
            }]);
            onSuccess?.(uploaded);
          } catch (error) {
            void message.error(error instanceof Error ? error.message : '附件上传失败');
            onError?.(error as Error);
          }
        }}
      >
        <Button icon={<UploadOutlined />}>上传附件</Button>
      </Upload>
    </Space>
  );
}
