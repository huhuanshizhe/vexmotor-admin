'use client';

import { Button, Form, Input, Modal, Select, Space, Typography } from 'antd';
import { useEffect, useRef, useState } from 'react';

import { userRoleOptions } from '@/lib/admin-display';
import { generateRandomPassword } from '@/lib/random-password';

export type CreateCustomerFormValues = {
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  phone: string;
  password: string;
  role: 'customer' | 'staff' | 'admin';
};

const initialValues: CreateCustomerFormValues = {
  email: '',
  firstName: '',
  lastName: '',
  company: '',
  phone: '',
  password: '',
  role: 'customer',
};

type CustomerCreateModalProps = {
  open: boolean;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (values: CreateCustomerFormValues) => void;
};

export function CustomerCreateModal({
  open,
  loading = false,
  onClose,
  onSubmit,
}: CustomerCreateModalProps) {
  const [form] = Form.useForm<CreateCustomerFormValues>();
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
      title="新建账户"
      onCancel={handleClose}
      onOk={() => form.submit()}
      confirmLoading={loading}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" initialValues={initialValues} onFinish={onSubmit}>
        <Form.Item
          name="email"
          label="邮箱"
          rules={[{ required: true, message: '请输入邮箱' }, { type: 'email', message: '邮箱格式不正确' }]}
        >
          <Input />
        </Form.Item>
        <Space style={{ width: '100%' }}>
          <Form.Item name="firstName" label="名" rules={[{ required: true, message: '请输入名' }]} style={{ flex: 1 }}>
            <Input />
          </Form.Item>
          <Form.Item name="lastName" label="姓" rules={[{ required: true, message: '请输入姓' }]} style={{ flex: 1 }}>
            <Input />
          </Form.Item>
        </Space>
        <Form.Item name="company" label="公司名称">
          <Input />
        </Form.Item>
        <Form.Item name="phone" label="联系电话">
          <Input />
        </Form.Item>
        <Form.Item label="密码" required>
          <Space.Compact style={{ width: '100%' }}>
            <Form.Item
              name="password"
              noStyle
              rules={[{ required: true, message: '请输入密码' }, { min: 8, message: '密码至少 8 位' }]}
            >
              <Input.Password
                visibilityToggle={{
                  visible: passwordVisible,
                  onVisibleChange: setPasswordVisible,
                }}
                style={{ width: 'calc(100% - 128px)' }}
              />
            </Form.Item>
            <Button onClick={handleGeneratePassword}>生成随机密码</Button>
          </Space.Compact>
        </Form.Item>
        <Form.Item name="role" label="角色" rules={[{ required: true }]}>
          <Select options={userRoleOptions} />
        </Form.Item>
        <Typography.Text type="secondary">
          新建账户默认状态为待审核，工业字段由客户注册后补齐。
        </Typography.Text>
      </Form>
    </Modal>
  );
}
