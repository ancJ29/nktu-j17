import { hashString } from '@credo/kits/crypt';

const MAX_ATTEMPTS = 30_000;

export function generateNonce(
  timestamp: string,
  token: string,
  method: string,
  path: string,
): string {
  const key = hashString(`${timestamp}.${token}.${method}.${path}`) ?? '';
  const mark = key.slice(9, 11);

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const candidate = Math.random().toString(36).substring(2, 15);
    const hashed = hashString(`${candidate}:${key}:${timestamp}`);
    if (hashed?.endsWith(mark)) return candidate;
  }
  return '';
}
