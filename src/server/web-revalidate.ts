import { getSiteUrl } from '@/lib/app-urls';

export async function revalidateWebUiStringsCache() {
  const secret = process.env.REVALIDATE_SECRET?.trim();
  if (!secret) {
    return;
  }

  const base = getSiteUrl().replace(/\/+$/, '');
  await fetch(`${base}/api/revalidate/ui-strings`, {
    method: 'POST',
    headers: { 'x-revalidate-secret': secret },
  }).catch(() => undefined);
}
