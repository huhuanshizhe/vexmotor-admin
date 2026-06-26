import { LOCALE_REQUEST_HEADER } from '@/lib/i18n';

export function frontCorsHeaders() {
  const origin = process.env.CORS_ALLOWED_ORIGINS?.split(',')[0]?.trim() ?? 'http://localhost:5000';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': `Content-Type, Authorization, X-Cart-Token, X-Guest-Order-Token, ${LOCALE_REQUEST_HEADER}`,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
  };
}
