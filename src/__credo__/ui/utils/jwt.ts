import { logger } from './logger';

export type JWTPayload = {
  exp?: number; 
  iat?: number; 
  [key: string]: unknown;
};

export function decodeJWT(token: string): JWTPayload | null {
  try {
    
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    
    const payload = parts[1];

    
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );

    return JSON.parse(jsonPayload) as JWTPayload;
  } catch (error) {
    logger.error('Failed to decode JWT:', error);
    return null;
  }
}

export function isTokenExpired(token: string, bufferSeconds = 300): boolean {
  const payload = decodeJWT(token);

  if (!payload || !payload.exp) {
    return true; // Consider invalid tokens as expired
  }

  logger.debug('payload.exp', payload.exp, new Date(payload.exp * 1000).toLocaleString());

  
  const currentTime = Math.floor(Date.now() / 1000);

  
  return payload.exp < currentTime + bufferSeconds;
}

export function getTokenExpiration(token: string): Date | null {
  const payload = decodeJWT(token);

  if (!payload || !payload.exp) {
    return null;
  }

  return new Date(payload.exp * 1000);
}

export function getTokenTimeRemaining(token: string): number {
  const payload = decodeJWT(token);

  if (!payload || !payload.exp) {
    return 0;
  }

  const currentTime = Math.floor(Date.now() / 1000);
  const remaining = payload.exp - currentTime;

  return Math.max(0, remaining);
}
