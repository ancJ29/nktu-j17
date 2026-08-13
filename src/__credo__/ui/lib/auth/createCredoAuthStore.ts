import { cMngtConnector } from '@credo/connectors/connector';

import { credoSSOApi as credoSSOApiConnector } from '../../connectors';
import { ONE_DAY, ONE_HOUR, ONE_MINUTE } from '../../utils';

import { createAuthStore } from './createAuthStore';
import type { AuthApi, AuthStorage, AuthStorageKeys, BaseProfile, PersistStorage } from './types';

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

  useBffAuth?: () => boolean;

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
    useBffAuth = () => false,
    persistStorage,
  } = options;

  const authApi: AuthApi<TProfile> = {
    login: async ({ email, password, tokenExpiration, refreshTokenExpiration, deviceId }) => {
      const params = {
        serviceCode,
        email,
        password,
        tokenExpiration,
        refreshTokenExpiration,
        deviceId,
      };
      const response = useBffAuth()
        ? await cMngtConnector.login(params)
        : await credoSSOApi.login(params);

      return {
        success: true,
        userUuid: response.userUuid,
        token: response.token,
        refreshToken: response.refreshToken,
      };
    },

    refreshToken: async ({ refreshToken }) => {
      const response = useBffAuth()
        ? await cMngtConnector.refreshToken({ refreshToken })
        : await credoSSOApi.refreshToken({ refreshToken });
      return {
        success: response.success,
        token: response.token,
        refreshToken: response.refreshToken,
        error: response.error,
      };
    },

    getProfile: async ({ token }) => {
      return cMngtConnector.getMe<TProfile>(token);
    },

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
      const params = { serviceCode, token };
      const response = useBffAuth()
        ? await cMngtConnector.loginWithToken(params)
        : await credoSSOApi.loginWithToken(params);

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
