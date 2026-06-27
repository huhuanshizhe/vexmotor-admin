import '@/lib/env';

import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import postgres from 'postgres';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5100';
const TEST_EMAIL = `regtest+${Date.now()}@example.com`;
const PASSWORD = 'TestPass123!';

type DbUser = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  company: string | null;
  job_title: string | null;
  status: string;
  created_at: Date;
};

async function queryUser(sql: ReturnType<typeof postgres>, email: string) {
  const rows = await sql<DbUser[]>`
    SELECT id, email, first_name, last_name, company, job_title, status, created_at
    FROM users
    WHERE email = ${email.toLowerCase()}
  `;
  return rows[0] ?? null;
}

async function logDb(label: string, sql: ReturnType<typeof postgres>, email: string) {
  const user = await queryUser(sql, email);
  console.log(`\n[DB] ${label}`);
  console.log(user ? JSON.stringify(user, null, 2) : '  (no user row)');
}

async function register(payload: Record<string, unknown>) {
  const response = await fetch(`${API_BASE}/api/front/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await response.text();
  return { status: response.status, body };
}

async function uploadDummyPdf() {
  const filePath = join(tmpdir(), `reg-test-${Date.now()}.pdf`);
  writeFileSync(filePath, '%PDF-1.4 test registration upload\n');

  const form = new FormData();
  const blob = new Blob([readFileSync(filePath)], { type: 'application/pdf' });
  form.append('file', blob, 'test-license.pdf');

  const response = await fetch(`${API_BASE}/api/front/upload/registration`, {
    method: 'POST',
    body: form,
  });
  const body = await response.text();
  return { status: response.status, body };
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  const sql = postgres(connectionString, { max: 1 });

  console.log('Test email:', TEST_EMAIL);
  console.log('API base:', API_BASE);

  try {
    await logDb('0. Before any action', sql, TEST_EMAIL);

    console.log('\n[STEP 1] Simulated Account step (client-only, no API)');
    await logDb('1. After step 1 (should still be empty)', sql, TEST_EMAIL);

    console.log('\n[STEP 2] Simulated Company step (client-only, no API)');
    await logDb('2. After step 2 (should still be empty)', sql, TEST_EMAIL);

    console.log('\n[STEP 3a] Upload registration document');
    const upload = await uploadDummyPdf();
    console.log('Upload status:', upload.status);
    console.log('Upload body:', upload.body.slice(0, 300));
    await logDb('3a. After upload only (should still be empty)', sql, TEST_EMAIL);

    let documents: unknown[] = [];
    if (upload.status === 200) {
      const parsed = JSON.parse(upload.body) as { url: string; key: string; filename: string; contentType: string };
      documents = [parsed];
    }

    const payload = {
      email: TEST_EMAIL,
      password: PASSWORD,
      firstName: 'Reg',
      lastName: 'Tester',
      jobTitle: 'Purchasing',
      companyName: 'Acme Test Co',
      country: 'United States',
      industry: 'Factory Automation',
      companySize: '11-50',
      website: 'https://acme.example.com',
      taxId: 'TAX-123',
      annualVolumeEstimate: '100 units/year',
      documents,
      termsAccepted: true,
      privacyAccepted: true,
      exportComplianceAccepted: true,
    };

    console.log('\n[STEP 3b] First register submit');
    const first = await register(payload);
    console.log('Register #1 status:', first.status);
    console.log('Register #1 body:', first.body.slice(0, 400));
    await logDb('3b. After first register submit', sql, TEST_EMAIL);

    console.log('\n[STEP 3c] Second register submit (simulate double-click)');
    const second = await register(payload);
    console.log('Register #2 status:', second.status);
    console.log('Register #2 body:', second.body.slice(0, 400));
    await logDb('3c. After second register submit', sql, TEST_EMAIL);
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
