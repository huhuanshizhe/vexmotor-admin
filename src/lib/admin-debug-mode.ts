export const ADMIN_DEBUG_MODE_STORAGE_KEY = 'vexmotor-admin-debug-mode';

export const ADMIN_DEBUG_MODE_HEADER = 'X-Admin-Debug-Mode';

export function readAdminDebugModeEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(ADMIN_DEBUG_MODE_STORAGE_KEY) === '1';
}

export function writeAdminDebugModeEnabled(enabled: boolean) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ADMIN_DEBUG_MODE_STORAGE_KEY, enabled ? '1' : '0');
}

export function adminDebugModeHeaders(): HeadersInit {
  if (!readAdminDebugModeEnabled()) return {};
  return { [ADMIN_DEBUG_MODE_HEADER]: '1' };
}
