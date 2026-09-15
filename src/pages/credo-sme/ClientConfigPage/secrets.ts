import { isLocalhost } from '@/config/env';

export const ADMIN_KEY_STORAGE = '__credo_sme_admin_key__';
export const SSO_ADMIN_KEY_STORAGE = '__credo_sme_sso_admin_key__';

export function readSecret(key: string): string {
  if (isLocalhost) {
    if (key === ADMIN_KEY_STORAGE) {
      const secret = import.meta.env.VITE_APP_CREDO_SME_ADMIN_ACCESS_KEY;
      if (secret) return secret.trim();
    } else if (key === SSO_ADMIN_KEY_STORAGE) {
      const secret = import.meta.env.VITE_APP_CREDO_SSO_ADMIN_ACCESS_KEY;
      if (secret) return secret.trim();
    }
  }

  try {
    return sessionStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

export function writeSecret(key: string, value: string): void {
  const trimmed = value.trim();
  if (trimmed) sessionStorage.setItem(key, trimmed);
  else sessionStorage.removeItem(key);
}
