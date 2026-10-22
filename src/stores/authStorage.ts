import { cacheGet, cacheSet } from '@/utils/appCache';
import type { AuthStorage, AuthStorageKeys, PersistStorage } from '@credo/base-ui/lib';

export const AUTH_STORAGE_KEYS: AuthStorageKeys = {
  AUTH: '__AUTH__',
  LOGIN_USER_ID: '__LOGIN_USER_ID__',
  TOKEN: '__TOKEN__',
  REFRESH_TOKEN: '__REFRESH_TOKEN__',
  DEVICE_ID: '__DEVICE_ID__',
};

export type StoredAuth = {
  userUuid: string | null;
  token: string | null;
  refreshToken: string | null;
};

export const encodedAuthStorage: AuthStorage = {
  get: <T>(key: string): T | null => {
    const auth = cacheGet('auth') ?? {};
    return (auth[key] as T) ?? null;
  },
  set: <T>(key: string, value: T): void => {
    const auth = cacheGet('auth') ?? {};
    auth[key] = value;
    cacheSet('auth', auth);
  },
  remove: (key: string): void => {
    const auth = cacheGet('auth') ?? {};
    delete auth[key];
    cacheSet('auth', auth);
  },
};

export const encodedPersistStorage: PersistStorage = {
  getItem: (_name: string): string | null => {
    const data = cacheGet('zap');
    return data != null ? JSON.stringify(data) : null;
  },
  setItem: (_name: string, value: string): void => {
    try {
      cacheSet('zap', JSON.parse(value));
    } catch {
      // ignore
    }
  },
  removeItem: (_name: string): void => {
    cacheSet('zap', undefined);
  },
};

export function readStoredAuth(): StoredAuth {
  return (
    encodedAuthStorage.get<StoredAuth>(AUTH_STORAGE_KEYS.AUTH) ?? {
      userUuid: null,
      token: null,
      refreshToken: null,
    }
  );
}

export function readLegacyRefreshToken(): string | null {
  return readStoredAuth().refreshToken;
}
