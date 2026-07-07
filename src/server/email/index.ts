import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

import { getSiteUrl } from '@/lib/app-urls';

type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
};

type SendResult = { ok: true; id?: string } | { ok: false; error: string };

const PASSWORD_RESET_EXPIRY_MINUTES = 60;
const EMAIL_VERIFICATION_EXPIRY_HOURS = 24;

function emailFooter(year: number): string {
  return `<tr>
            <td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.6;">
                This is an automated message. Please do not reply directly.<br>
                &copy; ${year} STEPMOTECH. All rights reserved.
              </p>
            </td>
          </tr>`;
}

function emailHeader(subtitle: string): string {
  return `<tr>
            <td style="background:linear-gradient(135deg,#2563EB 0%,#38BDF8 100%);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">STEPMOTECH</h1>
              <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.85);">${subtitle}</p>
            </td>
          </tr>`;
}

function getFromAddress(): string {
  return process.env.EMAIL_FROM ?? 'STEPMOTECH <noreply@stepmotech.online>';
}

function isEmailMockMode(): boolean {
  if (process.env.EMAIL_MOCK === 'true') {
    return true;
  }

  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  return !user || !pass;
}

function createSmtpTransporter(): Transporter {
  const port = Number(process.env.SMTP_PORT ?? '465');
  const secure = process.env.SMTP_SECURE !== 'false';

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'smtp.exmail.qq.com',
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendEmail(input: SendEmailInput): Promise<SendResult> {
  const recipients = Array.isArray(input.to) ? input.to.join(', ') : input.to;

  if (isEmailMockMode()) {
    console.log('[email:mock] Outbound email skipped (mock mode)');
    console.log(`[email:mock] From: ${getFromAddress()}`);
    console.log(`[email:mock] To: ${recipients}`);
    console.log(`[email:mock] Subject: ${input.subject}`);
    return { ok: true, id: `mock-${Date.now()}` };
  }

  try {
    const transporter = createSmtpTransporter();
    const info = await transporter.sendMail({
      from: getFromAddress(),
      to: recipients,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });

    return { ok: true, id: info.messageId };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown email error';
    console.error('[email] Send failed:', message);
    return { ok: false, error: message };
  }
}

function buildPasswordResetEmailHtml(resetUrl: string): string {
  const safeUrl = escapeHtml(resetUrl);
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your password</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
          ${emailHeader('Account Security · Password Reset')}
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 16px;font-size:15px;color:#1e293b;line-height:1.7;">Hello,</p>
              <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.7;">
                We received a request to reset your STEPMOTECH account password. Click the button below to choose a new password. This link expires in <strong style="color:#2563EB;">${PASSWORD_RESET_EXPIRY_MINUTES} minutes</strong>.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
                <tr>
                  <td align="center">
                    <a href="${safeUrl}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#2563EB 0%,#38BDF8 100%);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 48px;border-radius:8px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;text-align:center;">If the button does not work, copy and paste this URL into your browser:</p>
              <p style="margin:0 0 24px;font-size:12px;color:#64748b;text-align:center;word-break:break-all;">${safeUrl}</p>
              <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:14px 16px;">
                <p style="margin:0;font-size:13px;color:#9a3412;line-height:1.6;">
                  If you did not request a password reset, you can safely ignore this email. Your password will not change, and this link will expire automatically.
                </p>
              </div>
            </td>
          </tr>
          ${emailFooter(year)}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildWelcomeEmailHtml(input: {
  firstName: string;
  companyName?: string | null;
  accountStatus: string;
}): string {
  const year = new Date().getFullYear();
  const isPending = input.accountStatus === 'pending';
  const loginUrl = escapeHtml(`${getSiteUrl()}/login`);
  const settingsUrl = escapeHtml(`${getSiteUrl()}/account/settings`);
  const safeFirstName = escapeHtml(input.firstName);
  const companyLine = input.companyName
    ? `<p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.7;">Company: <strong style="color:#1e293b;">${escapeHtml(input.companyName)}</strong></p>`
    : '';

  const statusBlock = isPending
    ? `<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:14px 16px;margin:0 0 20px;">
              <p style="margin:0;font-size:14px;font-weight:600;color:#9a3412;">Account Under Review</p>
              <p style="margin:8px 0 0;font-size:13px;color:#9a3412;line-height:1.6;">
                Your business account is being reviewed. You will receive a confirmation email once approved. In the meantime you can browse products and submit inquiries.
              </p>
            </div>`
    : `<p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.7;">
                Your account is active. You can sign in to access pricing, order history, saved addresses, and account settings.
              </p>
              <p style="margin:0 0 20px;font-size:14px;color:#64748b;line-height:1.7;">
                We recommend verifying your email in <a href="${settingsUrl}" style="color:#2563EB;text-decoration:none;font-weight:600;">Account Settings</a> to secure your account and receive order updates.
              </p>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to STEPMOTECH</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
          ${emailHeader(isPending ? 'Welcome · Account Under Review' : 'Welcome · Account Active')}
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1e293b;">Welcome, ${safeFirstName}!</p>
              ${companyLine}
              ${statusBlock}
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 0;">
                <tr>
                  <td align="center">
                    <a href="${loginUrl}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#2563EB 0%,#38BDF8 100%);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 48px;border-radius:8px;">
                      Sign In to Your Account
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${emailFooter(year)}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildEmailVerificationEmailHtml(input: { email: string; verifyUrl: string }): string {
  const safeUrl = escapeHtml(input.verifyUrl);
  const safeEmail = escapeHtml(input.email);
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your email</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
          ${emailHeader('Account Security · Email Verification')}
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 16px;font-size:15px;color:#1e293b;line-height:1.7;">Hello,</p>
              <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.7;">
                Please confirm that <strong style="color:#1e293b;">${safeEmail}</strong> is the correct email for your STEPMOTECH account. This link expires in <strong style="color:#2563EB;">${EMAIL_VERIFICATION_EXPIRY_HOURS} hours</strong>.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
                <tr>
                  <td align="center">
                    <a href="${safeUrl}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#2563EB 0%,#38BDF8 100%);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 48px;border-radius:8px;">
                      Verify Email
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;text-align:center;">If the button does not work, copy and paste this URL into your browser:</p>
              <p style="margin:0 0 24px;font-size:12px;color:#64748b;text-align:center;word-break:break-all;">${safeUrl}</p>
              <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:14px 16px;">
                <p style="margin:0;font-size:13px;color:#9a3412;line-height:1.6;">
                  If you did not request this verification, you can safely ignore this email. Your account will remain unchanged.
                </p>
              </div>
            </td>
          </tr>
          ${emailFooter(year)}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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
    html: buildWelcomeEmailHtml(input),
    text: isPending
      ? `Welcome to STEPMOTECH, ${input.firstName}. Your account is under review. Sign in at ${getSiteUrl()}/login`
      : `Welcome to STEPMOTECH, ${input.firstName}. Your account is active. Sign in at ${getSiteUrl()}/login and verify your email in Account Settings.`,
  });
}

export async function sendEmailVerificationEmail(input: {
  to: string;
  verifyUrl: string;
}) {
  return sendEmail({
    to: input.to,
    subject: 'Verify your STEPMOTECH email address',
    html: buildEmailVerificationEmailHtml({ email: input.to, verifyUrl: input.verifyUrl }),
    text: `Verify your STEPMOTECH email address (${input.to}) using this link (expires in ${EMAIL_VERIFICATION_EXPIRY_HOURS} hours): ${input.verifyUrl}`,
  });
}

export async function sendPasswordResetEmail(input: {
  to: string;
  resetUrl: string;
}) {
  return sendEmail({
    to: input.to,
    subject: 'Reset your STEPMOTECH password',
    html: buildPasswordResetEmailHtml(input.resetUrl),
    text: `Reset your STEPMOTECH password using this link (expires in ${PASSWORD_RESET_EXPIRY_MINUTES} minutes): ${input.resetUrl}`,
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
          <a href="${getSiteUrl()}/account/orders/${input.orderNumber}"
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
