'use client';

import { Button, Form, Input, Modal, Typography } from 'antd';
import { useEffect, useRef, useState } from 'react';

import { generateRandomPassword } from '@/lib/random-password';

type AdminResetPasswordModalProps = {
  open: boolean;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (password: string) => void;
};

type ResetPasswordFormValues = {
  password: string;
};

export function AdminResetPasswordModal({
  open,
  loading = false,
  onClose,
  onSubmit,
}: AdminResetPasswordModalProps) {
  const [form] = Form.useForm<ResetPasswordFormValues>();
  const [passwordVisible, setPasswordVisible] = useState(true);
  const maskTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearMaskTimer() {
    if (maskTimerRef.current) {
      clearTimeout(maskTimerRef.current);
      maskTimerRef.current = null;
    }
  }

  function resetPasswordState() {
    clearMaskTimer();
    setPasswordVisible(true);
  }

  useEffect(() => {
    if (!open) {
      form.resetFields();
      resetPasswordState();
    }
  }, [open, form]);

  useEffect(() => () => clearMaskTimer(), []);

  function handleGeneratePassword() {
    const nextPassword = generateRandomPassword();
    form.setFieldValue('password', nextPassword);
    setPasswordVisible(true);
    clearMaskTimer();
    maskTimerRef.current = setTimeout(() => {
      setPasswordVisible(false);
      maskTimerRef.current = null;
    }, 5000);
  }

  function handleClose() {
    resetPasswordState();
    form.resetFields();
    onClose();
  }

  return (
    <Modal
      open={open}
      title="重置密码"
      onCancel={handleClose}
      onOk={() => form.submit()}
      confirmLoading={loading}
      okText="确认重置"
      cancelText="取消"
      destroyOnHidden
      width={480}
    >
      <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
        可手动输入新密码，或生成随机密码。重置成功后将立即退出登录，请使用新密码重新登录。
      </Typography.Paragraph>
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) => onSubmit(values.password)}
      >
        <Form.Item label="新密码" required>
          <div style={{ display: 'flex', gap: 8 }}>
            <Form.Item
              name="password"
              noStyle
              rules={[
                { required: true, message: '请输入新密码' },
                { min: 6, message: '密码至少 6 位' },
              ]}
            >
              <Input.Password
                visibilityToggle={{
                  visible: passwordVisible,
                  onVisibleChange: setPasswordVisible,
                }}
                style={{ flex: 1, fontFamily: 'monospace' }}
                placeholder="请输入或生成新密码"
              />
            </Form.Item>
            <Button onClick={handleGeneratePassword}>生成随机密码</Button>
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
}
