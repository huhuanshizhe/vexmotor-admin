'use client';

import { Button, Card, Form, Input, Typography } from 'antd';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/admin';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Card title="Admin Sign In" style={{ width: 420, margin: '80px auto' }}>
      <Form
        layout="vertical"
        onFinish={async (values: { email: string; password: string }) => {
          setLoading(true);
          setError(null);
          const result = await signIn('credentials', {
            email: values.email,
            password: values.password,
            redirect: false,
            callbackUrl,
          });
          setLoading(false);
          if (result?.error) {
            setError('Invalid email or password');
            return;
          }
          router.push(callbackUrl);
          router.refresh();
        }}
      >
        <Form.Item label="Email" name="email" rules={[{ required: true, type: 'email' }]}>
          <Input autoComplete="username" />
        </Form.Item>
        <Form.Item label="Password" name="password" rules={[{ required: true, min: 6 }]}>
          <Input.Password autoComplete="current-password" />
        </Form.Item>
        {error ? <Typography.Text type="danger">{error}</Typography.Text> : null}
        <Button type="primary" htmlType="submit" loading={loading} block style={{ marginTop: 16 }}>
          Sign In
        </Button>
      </Form>
    </Card>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div style={{ padding: 80, textAlign: 'center' }}>Loading...</div>}>
      <AdminLoginForm />
    </Suspense>
  );
}
