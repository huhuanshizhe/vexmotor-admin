import { config } from 'dotenv';

config({ path: '.env.local' });
config();

function trimUrl(value: string | undefined) {
  return value?.trim().replace(/\/$/, '') || null;
}

const DEV_ADMIN_URL = 'http://localhost:5100';
const DEV_SITE_URL = 'http://localhost:5000';

const adminUrl =
  trimUrl(process.env.ADMIN_URL)
  ?? trimUrl(process.env.AUTH_URL)
  ?? trimUrl(process.env.NEXTAUTH_URL)
  ?? (process.env.NODE_ENV !== 'production' ? DEV_ADMIN_URL : null)
  ?? DEV_ADMIN_URL;

const siteUrl =
  trimUrl(process.env.SITE_URL)
  ?? trimUrl(process.env.CORS_ALLOWED_ORIGINS?.split(',')[0])
  ?? trimUrl(process.env.APP_URL)
  ?? trimUrl(process.env.NEXT_PUBLIC_SITE_URL)
  ?? trimUrl(process.env.FRONT_SITE_URL)
  ?? (process.env.NODE_ENV !== 'production' ? DEV_SITE_URL : null)
  ?? DEV_SITE_URL;

process.env.ADMIN_URL ??= adminUrl;
process.env.SITE_URL ??= siteUrl;
process.env.AUTH_URL ??= adminUrl;
process.env.NEXTAUTH_URL ??= adminUrl;

if (!process.env.CORS_ALLOWED_ORIGINS?.trim()) {
  process.env.CORS_ALLOWED_ORIGINS = siteUrl;
}
