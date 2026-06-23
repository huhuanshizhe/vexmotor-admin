'use client';

import { DeleteOutlined, LoadingOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Image, Space, Typography, Upload, message } from 'antd';
import type { UploadProps } from 'antd';
import { useState } from 'react';

import { IMAGE_UPLOAD_MIME_TYPES, MAX_IMAGE_UPLOAD_BYTES, uploadMediaFile } from '@/lib/media-upload';

type CoverImageFieldProps = {
  value?: string | null;
  onChange?: (value: string | null) => void;
  disabled?: boolean;
};

export function CoverImageField({ value, onChange, disabled = false }: CoverImageFieldProps) {
  const [uploading, setUploading] = useState(false);

  const uploadProps: UploadProps = {
    accept: IMAGE_UPLOAD_MIME_TYPES.join(','),
    showUploadList: false,
    disabled: disabled || uploading,
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
        const result = await uploadMediaFile(file as File, { kind: 'image', folder: 'editorial/images' });
        onChange?.(result.url);
        onSuccess?.(result);
        void message.success('封面上传成功');
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
    <Space orientation="vertical" size="small" style={{ width: '100%' }}>
      {value ? (
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <Image
            src={value}
            alt="封面预览"
            style={{ maxWidth: 320, borderRadius: 8 }}
          />
          {!disabled ? (
            <Button
              danger
              size="small"
              icon={<DeleteOutlined />}
              style={{ marginTop: 8 }}
              onClick={() => onChange?.(null)}
            >
              移除封面
            </Button>
          ) : null}
        </div>
      ) : (
        <Upload {...uploadProps}>
          <Button icon={uploading ? <LoadingOutlined /> : <PlusOutlined />} disabled={disabled || uploading}>
            上传封面图
          </Button>
        </Upload>
      )}
      <Typography.Text type="secondary">支持 JPG / PNG / GIF / WebP / SVG，最大 10MB，上传至阿里云 OSS。</Typography.Text>
    </Space>
  );
}
