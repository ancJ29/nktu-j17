

export const LOGIN_TOKEN_TTL_MS = 15 * 60 * 1000;
export const LOGIN_TOKEN_TTL_MIN = LOGIN_TOKEN_TTL_MS / 60_000;

export function wrapLoginToken(token: string): string {
  return `${Date.now().toString(36)}.${token}`;
}

export type UnwrappedLoginToken = {
  
  token: string;
  
  expired: boolean;
  
  issuedAt: number;
};

export function unwrapLoginToken(wrapped: string): UnwrappedLoginToken | null {
  const dotIdx = wrapped.indexOf('.');
  if (dotIdx <= 0) return null;
  const prefix = wrapped.slice(0, dotIdx);
  const token = wrapped.slice(dotIdx + 1);
  if (!token) return null;

  const issuedAt = parseInt(prefix, 36);
  if (!Number.isFinite(issuedAt) || issuedAt <= 0) return null;
  
  
  if (issuedAt > Date.now() + 60_000) return null;

  return {
    token,
    issuedAt,
    expired: Date.now() - issuedAt > LOGIN_TOKEN_TTL_MS,
  };
}
