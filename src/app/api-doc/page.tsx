import ApiDocClient from './api-doc-client';

export const metadata = {
  title: 'API Docs — VexMotor Admin',
  robots: { index: false, follow: false },
};

export default function ApiDocPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#fafafa' }}>
      <ApiDocClient />
    </main>
  );
}
