/**
 * Multilingual email service using Resend
 * Supports template-based emails with locale-specific content
 */

import { Resend } from 'resend';
import { type Locale, DEFAULT_LOCALE } from '@/lib/i18n';
import { t } from '@/lib/i18n-formatter';

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

type EmailParams = {
  to: string;
  locale?: Locale;
  params?: Record<string, string | number>;
};

type WelcomeEmailParams = EmailParams & {
  name: string;
};

type OrderEmailParams = EmailParams & {
  name: string;
  orderNumber: string;
  orderDate: string;
  subtotal: number;
  shipping: number;
  total: number;
  currency: string;
};

type ShippingEmailParams = EmailParams & {
  name: string;
  orderNumber: string;
  trackingNumber: string;
  carrier: string;
  estimatedDelivery: string;
};

type PasswordResetEmailParams = EmailParams & {
  name: string;
  resetUrl: string;
};

type QuoteEmailParams = EmailParams & {
  name: string;
  quoteNumber: string;
  itemCount: number;
};

/**
 * Send welcome email
 */
export async function sendWelcomeEmail(params: WelcomeEmailParams) {
  const { to, locale = DEFAULT_LOCALE, name } = params;
  
  const subject = t('welcome.subject', { locale, params: { name } });
  const heading = t('welcome.heading', { locale });
  const greeting = t('welcome.greeting', { locale, params: { name } });
  const body = t('welcome.body', { locale });
  const cta = t('welcome.cta', { locale });
  const support = t('welcome.support', { locale });
  const footer = t('welcome.footer', { locale });
  
  return resend.emails.send({
    from: 'STEPMOTECH <noreply@stepmotech.online>',
    to,
    subject,
    html: renderEmailTemplate({
      heading,
      greeting,
      body,
      ctaText: cta,
      ctaUrl: 'https://stepmotech.online/products',
      support,
      footer,
    }),
  });
}

/**
 * Send order confirmation email
 */
export async function sendOrderConfirmationEmail(params: OrderEmailParams) {
  const { to, locale = DEFAULT_LOCALE, name, orderNumber, orderDate, subtotal, shipping, total, currency } = params;
  
  const subject = t('orderConfirmation.subject', { locale, params: { orderNumber } });
  const greeting = t('orderConfirmation.greeting', { locale, params: { name } });
  const body = t('orderConfirmation.body', { locale, params: { orderNumber } });
  const orderSummary = t('orderConfirmation.orderSummary', { locale });
  const orderNumberLabel = t('orderConfirmation.orderNumber', { locale });
  const orderDateLabel = t('orderConfirmation.orderDate', { locale });
  const subtotalLabel = t('orderConfirmation.subtotal', { locale });
  const shippingLabel = t('orderConfirmation.shipping', { locale });
  const totalLabel = t('orderConfirmation.total', { locale });
  const cta = t('orderConfirmation.cta', { locale });
  const support = t('orderConfirmation.support', { locale });
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale === 'en' ? 'en-US' : locale, {
      style: 'currency',
      currency,
    }).format(amount);
  };
  
  return resend.emails.send({
    from: 'STEPMOTECH <noreply@stepmotech.online>',
    to,
    subject,
    html: renderEmailTemplate({
      heading: t('orderConfirmation.heading', { locale }),
      greeting,
      body,
      customContent: `
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #0f172a;">${orderSummary}</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #64748b;">${orderNumberLabel}</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 600;">${orderNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">${orderDateLabel}</td>
              <td style="padding: 8px 0; text-align: right;">${orderDate}</td>
            </tr>
            <tr style="border-top: 1px solid #e2e8f0;">
              <td style="padding: 8px 0; color: #64748b;">${subtotalLabel}</td>
              <td style="padding: 8px 0; text-align: right;">${formatCurrency(subtotal)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">${shippingLabel}</td>
              <td style="padding: 8px 0; text-align: right;">${formatCurrency(shipping)}</td>
            </tr>
            <tr style="border-top: 2px solid #0f172a;">
              <td style="padding: 12px 0 0 0; font-weight: 700; font-size: 16px;">${totalLabel}</td>
              <td style="padding: 12px 0 0 0; text-align: right; font-weight: 700; font-size: 16px;">${formatCurrency(total)}</td>
            </tr>
          </table>
        </div>
      `,
      ctaText: cta,
      ctaUrl: `https://stepmotech.online/account/orders/${orderNumber}`,
      support,
    }),
  });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(params: PasswordResetEmailParams) {
  const { to, locale = DEFAULT_LOCALE, name, resetUrl } = params;
  
  const subject = t('passwordReset.subject', { locale });
  const heading = t('passwordReset.heading', { locale });
  const greeting = t('passwordReset.greeting', { locale, params: { name } });
  const body = t('passwordReset.body', { locale });
  const cta = t('passwordReset.cta', { locale });
  const ignore = t('passwordReset.ignore', { locale });
  const support = t('passwordReset.support', { locale });
  
  return resend.emails.send({
    from: 'STEPMOTECH <noreply@stepmotech.online>',
    to,
    subject,
    html: renderEmailTemplate({
      heading,
      greeting,
      body,
      ctaText: cta,
      ctaUrl: resetUrl,
      footer: ignore,
      support,
    }),
  });
}

/**
 * Render email HTML template
 */
function renderEmailTemplate(options: {
  heading: string;
  greeting: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
  customContent?: string;
  support?: string;
  footer?: string;
}) {
  const { heading, greeting, body, ctaText, ctaUrl, customContent, support, footer } = options;
  
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${heading}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background: #ffffff; margin-top: 40px; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(90deg, #0a1929 0%, #0f2847 52%, #0a1929 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">${heading}</h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">${greeting}</p>
              <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">${body}</p>
              
              ${customContent || ''}
              
              ${ctaText && ctaUrl ? `
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                  <tr>
                    <td style="text-align: center;">
                      <a href="${ctaUrl}" style="display: inline-block; background: #e67e22; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600;">${ctaText}</a>
                    </td>
                  </tr>
                </table>
              ` : ''}
              
              ${support ? `
                <p style="margin: 30px 0 0 0; color: #64748b; font-size: 14px; line-height: 1.6; border-top: 1px solid #e2e8f0; padding-top: 20px;">
                  ${support}
                </p>
              ` : ''}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #94a3b8; font-size: 14px;">
                ${footer || '© 2026 STEPMOTECH. All rights reserved.'}
              </p>
              <p style="margin: 10px 0 0 0; color: #94a3b8; font-size: 12px;">
                STEPMOTECH | Factory Direct Motion Components
              </p>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}
