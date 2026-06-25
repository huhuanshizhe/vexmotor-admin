'use client';

import { Input, Modal, Typography } from 'antd';

type CustomerResetPasswordModalProps = {
  open: boolean;
  temporaryPassword: string | null;
  customerEmail?: string;
  onClose: () => void;
};

export function CustomerResetPasswordModal({
  open,
  temporaryPassword,
  customerEmail,
  onClose,
}: CustomerResetPasswordModalProps) {
  return (
    <Modal
      open={open}
      title="临时密码已生成"
      onCancel={onClose}
      onOk={onClose}
      okText="我已记录"
      cancelButtonProps={{ style: { display: 'none' } }}
      destroyOnHidden
    >
      <Typography.Paragraph type="secondary">
        {customerEmail ? `账户 ${customerEmail} 的临时密码如下，请一次性告知客户：` : '临时密码如下，请一次性告知客户：'}
      </Typography.Paragraph>
      <Input.Password
        readOnly
        value={temporaryPassword ?? ''}
        visibilityToggle
        style={{ fontFamily: 'monospace' }}
      />
      <Typography.Paragraph type="warning" style={{ marginTop: 12, marginBottom: 0 }}>
        关闭后将无法再次查看此密码，请妥善保存。
      </Typography.Paragraph>
    </Modal>
  );
}
