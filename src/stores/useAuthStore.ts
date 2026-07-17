

import { appConfig } from '@/config';
import { resolveServiceCode } from '@/config/client-code';
import { cacheGet, cacheSet } from '@/utils/appCache';
import {
  compositeUserStorage,
  sharedUserStorage,
  pcUserStorage,
  mobileUserStorage,
} from '@/utils/storage';
import { fn } from '@credo/kits';
import type { AuthStorage, PersistStorage } from '@credo/base-ui/lib';
import type { BaseProfile } from '@credo/base-ui/lib';
import { createCredoAuthStore } from '@credo/base-ui/lib';
import { logger, ONE_DAY, ONE_MINUTE } from '@credo/base-ui/utils';

export type Profile = BaseProfile & {
  
  isRoot?: boolean;
};

const encodedAuthStorage: AuthStorage = {
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

const encodedPersistStorage: PersistStorage = {
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

export const useAuthStore = createCredoAuthStore<Profile>({
  serviceCode: resolveServiceCode(),
  deviceIdPrefix: 'C-MNGT',
  isDev: appConfig.env?.IS_DEV ?? false,
  devProfile: { name: 'Dev User' },
  userStorage: compositeUserStorage,
  storage: encodedAuthStorage,
  persistStorage: encodedPersistStorage,
  
  tokenDuration: 15 * ONE_MINUTE,
  rememberRefreshDuration: 180 * ONE_DAY,
  sessionRefreshDuration: ONE_DAY,
});

const debouncedSaveProfile = fn.debounce(() => {
  const state = useAuthStore.getState();

  if (state.token) {
    state.saveProfile().catch((error) => {
      logger.error('Failed to auto-save profile settings:', error);
    });
  }
}, appConfig.userSettings.syncDebounceDelay);

sharedUserStorage.onChange(debouncedSaveProfile);
pcUserStorage.onChange(debouncedSaveProfile);
mobileUserStorage.onChange(debouncedSaveProfile);

export const SESSION_EXPIRED_NOTICE_KEY = 'sessionExpiredNotice';

let lastAuthToken = useAuthStore.getState().token;
useAuthStore.subscribe((state) => {
  const next = state.token;
  if (next === lastAuthToken) return;
  if (lastAuthToken && !next) {
    sessionStorage.setItem(SESSION_EXPIRED_NOTICE_KEY, '1');
  }
  lastAuthToken = next;
});
