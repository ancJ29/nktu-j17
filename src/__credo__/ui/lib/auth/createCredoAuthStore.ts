import { hashString } from '@credo/kits/crypt';
import { cMngtConnector } from '@credo/connectors/connector';

import { credoSSOApi as credoSSOApiConnector } from '../../connectors';
import { ONE_DAY, ONE_HOUR, ONE_MINUTE } from '../../utils';

import { createAuthStore } from './createAuthStore';
import type { AuthApi, AuthStorage, AuthStorageKeys, BaseProfile, PersistStorage } from './types';

function settingsVersion(obj: Record<string, unknown>): string {
  return hashString(JSON.stringify(obj));
}

type UserStorage = {
  exportSettings: () => Record<string, unknown>;
  importSettings: (settings: Record<string, unknown>) => void;
  onChange: (callback: () => void) => void;
};

const DEFAULT_STORAGE_KEYS: AuthStorageKeys = {
  AUTH: '__AUTH__',
  LOGIN_USER_ID: '__LOGIN_USER_ID__',
  TOKEN: '__TOKEN__',
  REFRESH_TOKEN: '__REFRESH_TOKEN__',
  DEVICE_ID: '__DEVICE_ID__',
};

const defaultStorage: AuthStorage = {
  get: <T>(key: string): T | null => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  },
  set: <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore storage errors
    }
  },
  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore storage errors
    }
  },
};

type CreateCredoAuthStoreOptions<TProfile extends BaseProfile = BaseProfile> = {
  serviceCode: string;

  deviceIdPrefix?: string;

  tokenDuration?: number;

  rememberRefreshDuration?: number;

  sessionRefreshDuration?: number;

  persistKey?: string;

  isDev?: boolean;

  devProfile?: TProfile;

  storage?: AuthStorage;

  storageKeys?: AuthStorageKeys;

  api?: typeof credoSSOApiConnector;

  userStorage?: UserStorage;

  persistStorage?: PersistStorage;
};

export function createCredoAuthStore<TProfile extends BaseProfile = BaseProfile>(
  options: CreateCredoAuthStoreOptions<TProfile>,
) {
  const {
    serviceCode,
    deviceIdPrefix = 'CREDO-APP',
    tokenDuration = 15 * ONE_MINUTE,
    rememberRefreshDuration = 180 * ONE_DAY,
    sessionRefreshDuration = 3 * ONE_HOUR,
    persistKey = 'auth-storage',
    isDev = false,
    devProfile = { name: 'Dev User' } as TProfile,
    storage = defaultStorage,
    storageKeys = DEFAULT_STORAGE_KEYS,
    api: credoSSOApi = credoSSOApiConnector,
    userStorage,
    persistStorage,
  } = options;

  let lastSavedVersion = '';

  const authApi: AuthApi<TProfile> = {
    login: async ({ email, password, tokenExpiration, refreshTokenExpiration, deviceId }) => {
      const response = await credoSSOApi.login({
        serviceCode,
        email,
        password,
        tokenExpiration,
        refreshTokenExpiration,
        deviceId,
      });

      return {
        success: true,
        userUuid: response.userUuid,
        token: response.token,
        refreshToken: response.refreshToken,
      };
    },

    refreshToken: async ({ refreshToken }) => {
      const response = await credoSSOApi.refreshToken({ refreshToken });
      return {
        success: response.success,
        token: response.token,
        refreshToken: response.refreshToken,
        error: response.error,
      };
    },

    getProfile: async ({ token }) => {
      const profile = await cMngtConnector.getMe<TProfile>(token);

      const savedSettings = profile?.settings ?? profile?.profile?.settings;
      if (savedSettings && userStorage) {
        userStorage.importSettings(savedSettings as Record<string, unknown>);

        lastSavedVersion = settingsVersion(userStorage.exportSettings());
      }

      return profile;
    },

    saveProfile: userStorage
      ? async ({ token, name, email }) => {
          const settings = userStorage.exportSettings();
          const currentVersion = settingsVersion(settings);
          if (currentVersion === lastSavedVersion) {
            return { success: true };
          }
          await credoSSOApi.updateProfile(token, {
            name,
            email,
            settings,
          });
          lastSavedVersion = currentVersion;
          return { success: true };
        }
      : undefined,

    register: async ({ username, email }) => {
      console.info('Register attempt:', { username, email });
      return { success: true };
    },

    forgotPassword: async ({ email }) => {
      console.info('Forgot password attempt:', { email });
      return { success: true };
    },

    resetPassword: async ({ token }) => {
      console.info('Reset password attempt:', { token });
      return { success: true };
    },

    loginWithQrCode: async () => {
      return { success: true, qrCode: '' };
    },

    loginWithToken: async ({ token }) => {
      const response = await credoSSOApi.loginWithToken({
        serviceCode,
        token,
      });

      return {
        success: true,
        userUuid: response.userUuid,
        token: response.token,
        refreshToken: response.refreshToken,
      };
    },
  };

  return createAuthStore<TProfile>({
    api: authApi,
    storage,
    storageKeys,
    persistStorage,
    config: {
      deviceIdPrefix,
      tokenDuration,
      rememberRefreshDuration,
      sessionRefreshDuration,
      persistKey,
      isDev,
      devProfile,
    },
  });
}
