/**
 * Mock email sender — logs payloads instead of sending.
 * Wire a real provider here when outbound email is needed.
 */

type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
};

type SendResult = { ok: true; id?: string } | { ok: false; error: string };

function getFromAddress(): string {
  return process.env.EMAIL_FROM ?? 'STEPMOTECH <support@stepmotech.online>';
}

export async function sendEmail(input: SendEmailInput): Promise<SendResult> {
  const recipients = Array.isArray(input.to) ? input.to.join(', ') : input.to;

  console.log('[email:mock] Outbound email skipped (mock mode)');
  console.log(`[email:mock] From: ${getFromAddress()}`);
  console.log(`[email:mock] To: ${recipients}`);
  console.log(`[email:mock] Subject: ${input.subject}`);

  return { ok: true, id: `mock-${Date.now()}` };
}

/* ─── Templated emails ─────────────────────────────────────── */

export async function sendWelcomeEmail(input: {
  to: string;
  firstName: string;
  companyName?: string | null;
  accountStatus: string;
}) {
  const isPending = input.accountStatus === 'pending';

  return sendEmail({
    to: input.to,
    subject: `Welcome to STEPMOTECH${isPending ? ' — Account Under Review' : ''}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a">
        <div style="background:#0a0a0a;color:#fff;padding:24px 32px">
          <h1 style="margin:0;font-size:20px;letter-spacing:0.5px">STEPMOTECH</h1>
        </div>
        <div style="padding:32px;background:#f9f9f9">
          <h2 style="margin:0 0 16px">Welcome, ${escapeHtml(input.firstName)}!</h2>
          ${input.companyName ? `<p style="margin:0 0 12px">Company: <strong>${escapeHtml(input.companyName)}</strong></p>` : ''}
          ${isPending ? `
            <div style="background:#fff3cd;border-left:4px solid #ffc107;padding:16px;margin:16px 0">
              <strong>Account Under Review</strong>
              <p style="margin:8px 0 0">Your business account is being reviewed. You will receive a confirmation email once approved. In the meantime you can browse products and submit inquiries.</p>
            </div>
          ` : `
            <p style="margin:0 0 12px">Your account is active. You can now sign in to access pricing, order history, and saved addresses.</p>
          `}
          <a href="${process.env.APP_URL ?? 'http://localhost:4000'}/login"
             style="display:inline-block;background:#0a0a0a;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;margin-top:16px">
            Sign In to Your Account
          </a>
          <hr style="border:none;border-top:1px solid #ddd;margin:24px 0" />
          <p style="font-size:13px;color:#666;margin:0">
            Questions? Reply to this email or call +1-518-722-7315.
          </p>
        </div>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(input: {
  to: string;
  resetUrl: string;
}) {
  return sendEmail({
    to: input.to,
    subject: 'Reset your STEPMOTECH password',
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a">
        <div style="background:#0a0a0a;color:#fff;padding:24px 32px">
          <h1 style="margin:0;font-size:20px;letter-spacing:0.5px">STEPMOTECH</h1>
        </div>
        <div style="padding:32px;background:#f9f9f9">
          <h2 style="margin:0 0 16px">Password Reset Request</h2>
          <p style="margin:0 0 16px">We received a request to reset your password. Click the button below to set a new password. This link expires in 1 hour.</p>
          <a href="${input.resetUrl}"
             style="display:inline-block;background:#0a0a0a;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px">
            Reset Password
          </a>
          <p style="margin:16px 0 0;font-size:13px;color:#666">
            If you did not request this, you can safely ignore this email.
          </p>
          <hr style="border:none;border-top:1px solid #ddd;margin:24px 0" />
          <p style="font-size:13px;color:#666;margin:0">
            Questions? Reply to this email or call +1-518-722-7315.
          </p>
        </div>
      </div>
    `,
  });
}

export async function sendOrderConfirmationEmail(input: {
  to: string;
  orderNumber: string;
  totalAmount: number;
  currency: string;
}) {
  const formatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: input.currency }).format(input.totalAmount);

  return sendEmail({
    to: input.to,
    subject: `Order ${input.orderNumber} Confirmed — STEPMOTECH`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a">
        <div style="background:#0a0a0a;color:#fff;padding:24px 32px">
          <h1 style="margin:0;font-size:20px;letter-spacing:0.5px">STEPMOTECH</h1>
        </div>
        <div style="padding:32px;background:#f9f9f9">
          <h2 style="margin:0 0 16px">Order Confirmed</h2>
          <div style="background:#fff;border:1px solid #ddd;padding:16px;margin:16px 0">
            <p style="margin:0"><strong>Order Number:</strong> ${escapeHtml(input.orderNumber)}</p>
            <p style="margin:8px 0 0"><strong>Total:</strong> ${formatted}</p>
          </div>
          <p style="margin:0 0 12px">Your order has been received. You will receive updates as it moves through processing and shipping.</p>
          <a href="${process.env.APP_URL ?? 'http://localhost:4000'}/account/orders/${input.orderNumber}"
             style="display:inline-block;background:#0a0a0a;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;margin-top:8px">
            View Order Details
          </a>
          <hr style="border:none;border-top:1px solid #ddd;margin:24px 0" />
          <p style="font-size:13px;color:#666;margin:0">
            Questions? Reply to this email or call +1-518-722-7315.
          </p>
        </div>
      </div>
    `,
  });
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
