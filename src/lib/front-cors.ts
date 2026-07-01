import { getSiteCorsOrigin } from '@/lib/app-urls';
import { LOCALE_REQUEST_HEADER } from '@/lib/i18n';

export function frontCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': getSiteCorsOrigin(),
    'Access-Control-Allow-Headers': `Content-Type, Authorization, X-Cart-Token, X-Guest-Order-Token, ${LOCALE_REQUEST_HEADER}`,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
  };
}
