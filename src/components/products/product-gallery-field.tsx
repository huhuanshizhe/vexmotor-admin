'use client';

import { DeleteOutlined, LoadingOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Image, Input, Space, Typography, Upload, message } from 'antd';
import type { UploadProps } from 'antd';
import { useState } from 'react';

import type { ProductGalleryImage } from '@/lib/product-content';
import { IMAGE_UPLOAD_MIME_TYPES, MAX_IMAGE_UPLOAD_BYTES, uploadMediaFile } from '@/lib/media-upload';

type ProductGalleryFieldProps = {
  value?: ProductGalleryImage[];
  onChange?: (value: ProductGalleryImage[]) => void;
  folder?: string;
};

export function ProductGalleryField({ value = [], onChange, folder = 'products/gallery' }: ProductGalleryFieldProps) {
  const items = value ?? [];
  const [uploading, setUploading] = useState(false);

  function updateItem(index: number, patch: Partial<ProductGalleryImage>) {
    const next = items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item));
    onChange?.(next);
  }

  function removeItem(index: number) {
    onChange?.(items.filter((_, itemIndex) => itemIndex !== index));
  }

  const uploadProps: UploadProps = {
    accept: IMAGE_UPLOAD_MIME_TYPES.join(','),
    showUploadList: false,
    disabled: uploading,
    beforeUpload: (file) => {
      if (!IMAGE_UPLOAD_MIME_TYPES.includes(file.type as typeof IMAGE_UPLOAD_MIME_TYPES[number])) {
        void message.error('仅支持 JPG、PNG、GIF、WebP、SVG 图片');
        return Upload.LIST_IGNORE;
      }
      if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
        void message.error('图片大小不能超过 10MB');
        return Upload.LIST_IGNORE;
      }
      return true;
    },
    customRequest: async ({ file, onError, onSuccess }) => {
      try {
        setUploading(true);
        const result = await uploadMediaFile(file as File, { kind: 'image', folder });
        onChange?.([...items, { url: result.url, alt: '', width: null, height: null }]);
        onSuccess?.(result);
      } catch (error) {
        const err = error instanceof Error ? error : new Error('上传失败');
        onError?.(err);
        void message.error(err.message);
      } finally {
        setUploading(false);
      }
    },
  };

  return (
    <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
      {items.map((item, index) => (
        <div key={`${item.url}-${index}`} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <Image src={item.url} alt={item.alt || 'gallery'} width={72} height={72} style={{ objectFit: 'cover', borderRadius: 8 }} preview={{ mask: '预览' }} />
          <div style={{ flex: 1 }}>
            <Typography.Text style={{ display: 'block', marginBottom: 4 }}>图片 Alt</Typography.Text>
            <Input
              placeholder="图片描述文本"
              value={item.alt}
              onChange={(event) => updateItem(index, { alt: event.target.value })}
            />
          </div>
          <Button danger icon={<DeleteOutlined />} onClick={() => removeItem(index)} />
        </div>
      ))}
      <Upload {...uploadProps}>
        <Button icon={uploading ? <LoadingOutlined /> : <PlusOutlined />}>添加轮播图</Button>
      </Upload>
    </Space>
  );
}
