const STORAGE_KEY = 'credo-connector-trusted-key';
const ONE_HOUR_MS = 60 * 60 * 1000;

const isBrowserContext = (): boolean => typeof window !== 'undefined';

export function clearCredoConnectorTrustedKey(): void {
  if (!isBrowserContext()) return;
  sessionStorage.removeItem(STORAGE_KEY);
}

export function getCredoConnectorTrustedKey(): string {
  if (!isBrowserContext()) {
    return process.env['CREDO_TRUSTED_SERVICE_KEY'] ?? '';
  }
  
  const stored = sessionStorage.getItem(STORAGE_KEY) ?? '';
  if (!stored) return '';

  const parts = stored.split('.');
  if (parts.length !== 2) return '';

  const ts = Number.parseInt(parts[1] ?? '0', 36);
  if (Number.isNaN(ts)) return '';

  const now = Date.now();
  if (ts < now || ts > now + ONE_HOUR_MS) return '';

  return parts[0] ?? '';
}
