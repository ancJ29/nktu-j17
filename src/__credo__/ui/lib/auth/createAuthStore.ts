import { CallApiError } from '@credo/connectors/connector';
import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';
import { asyncDeduplicator, isTokenExpired, logger } from '../../utils';
import type {
  AuthData,
  AuthState,
  BaseProfile,
  CreateAuthStoreOptions,
  TokenRefreshOutcome,
} from './types';

const REFRESH_RETRY_ATTEMPTS = 2;
const REFRESH_RETRY_DELAY_MS = 600;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isAuthRejection(error: unknown): boolean {
  return error instanceof CallApiError && (error.status === 401 || error.status === 403);
}

export function createAuthStore<TProfile extends BaseProfile = BaseProfile>(
  options: CreateAuthStoreOptions<TProfile>,
) {
  const { api, storage, storageKeys, config, persistStorage } = options;
  const {
    deviceIdPrefix,
    tokenDuration,
    rememberRefreshDuration,
    sessionRefreshDuration,
    persistKey = 'auth-storage',
    // isDev = false,
    // devProfile = { name: 'Dev User', email: 'dev@example.com' } as TProfile,
  } = config;

  function loadAuthFromStorage(): AuthData {
    const storedAuth = storage.get<AuthData>(storageKeys.AUTH) || {
      userUuid: null,
      token: null,
      refreshToken: null,
    };
    return storedAuth;
  }

  function saveAuthToStorage(auth: AuthData) {
    storage.set(storageKeys.LOGIN_USER_ID, auth.userUuid);
    storage.set(storageKeys.AUTH, auth);
  }

  function clearAuthFromStorage() {
    storage.remove(storageKeys.LOGIN_USER_ID);
    storage.remove(storageKeys.AUTH);
  }

  function getOrCreateDeviceId(): string {
    const existingId = storage.get<string>(storageKeys.DEVICE_ID);

    if (existingId && existingId.length > 20) {
      return existingId;
    }
    const newId = [
      deviceIdPrefix,
      Date.now().toString(36),
      Math.random().toString(36).substring(2, 15),
    ].join('-');
    storage.set(storageKeys.DEVICE_ID, newId);
    return newId;
  }

  return create<AuthState<TProfile>>()(
    devtools(
      persist(
        (set, get) => ({
          user: { name: '' } as TProfile,
          ...loadAuthFromStorage(),
          isProfileLoaded: false,
          lastLogoutReason: null,

          checkAndRefreshToken: async (): Promise<TokenRefreshOutcome> => {
            const { token, refreshToken, userUuid } = get();

            if (!token || !refreshToken) return 'anonymous';
            if (!isTokenExpired(token)) return 'valid';

            if (isTokenExpired(refreshToken, 0)) {
              logger.info('Refresh token expired, logging out');
              get().logout('refresh-token-expired');
              return 'logged-out';
            }

            const outcome = await asyncDeduplicator.call<TokenRefreshOutcome>(
              'refreshToken',
              async () => {
                let lastError: unknown;

                for (let attempt = 1; attempt <= REFRESH_RETRY_ATTEMPTS; attempt++) {
                  try {
                    const response = await api.refreshToken({ refreshToken });

                    if (response.success && response.token) {
                      if (!get().token) return 'logged-out';

                      const updatedAuth: AuthData = {
                        userUuid,
                        token: response.token,
                        refreshToken: response.refreshToken || refreshToken,
                      };
                      set(updatedAuth);
                      saveAuthToStorage(updatedAuth);
                      return 'refreshed';
                    }

                    logger.error('Token refresh rejected by server:', response.error);
                    get().logout('refresh-rejected');
                    return 'logged-out';
                  } catch (error) {
                    if (isAuthRejection(error)) {
                      logger.error('Token refresh rejected (401/403), logging out');
                      get().logout('refresh-rejected');
                      return 'logged-out';
                    }

                    lastError = error;
                    if (attempt < REFRESH_RETRY_ATTEMPTS) {
                      await delay(REFRESH_RETRY_DELAY_MS);
                    }
                  }
                }

                logger.warn(
                  'Token refresh unavailable, keeping session for a later retry:',
                  lastError,
                );
                return 'deferred';
              },
            );

            return outcome;
          },

          loadProfile: async () => {
            try {
              const outcome = await get().checkAndRefreshToken();
              const state = get();
              const token = state.token;

              if (!token) {
                set({ isProfileLoaded: true });
                throw new Error('Token is required');
              }

              if (outcome === 'deferred') {
                logger.warn('Skipping profile fetch: token refresh was deferred');
                set({ isProfileLoaded: true });
                return;
              }

              const user = await asyncDeduplicator.call(`getProfile-${token}`, async () => {
                const profile = await api.getProfile({ token }).catch((error: unknown) => {
                  if (isAuthRejection(error)) {
                    logger.error('Profile fetch rejected (401/403), logging out');
                    get().logout('profile-rejected');
                  } else {
                    logger.warn('Failed to get profile, keeping session:', error);
                  }
                  return undefined;
                });
                return profile;
              });

              if (user) {
                set({ user, isProfileLoaded: true });
              } else {
                set({ isProfileLoaded: true });
              }
            } catch (error) {
              set({ isProfileLoaded: true });
              throw error;
            }
          },

          login: async ({ email, password, remember }) => {
            const deviceId = getOrCreateDeviceId();
            const refreshTokenExpiration = remember
              ? rememberRefreshDuration
              : sessionRefreshDuration;

            const response = await api.login({
              email,
              password,
              tokenExpiration: tokenDuration,
              refreshTokenExpiration,
              deviceId,
            });

            const auth: AuthData = {
              userUuid: response.userUuid ?? null,
              token: response.token || null,
              refreshToken: response.refreshToken || null,
            };

            set(auth);
            saveAuthToStorage(auth);

            return { success: true };
          },

          logout: (reason = 'unknown') => {
            logger.info('Logging out', { reason });

            set({
              user: { name: '' } as TProfile,
              userUuid: null,
              token: null,
              refreshToken: null,
              isProfileLoaded: false,
              lastLogoutReason: reason,
            });
            clearAuthFromStorage();
            persistStorage?.removeItem(persistKey);
            return { success: true };
          },

          register: async ({ username, email, password }) => {
            if (!api.register) {
              logger.warn('Register not implemented');
              return { success: false };
            }

            const response = await api.register({ username, email, password });
            return { success: response.success };
          },

          forgotPassword: async ({ email }) => {
            if (!api.forgotPassword) {
              logger.warn('Forgot password not implemented');
              return { success: false };
            }

            const response = await api.forgotPassword({ email });
            return { success: response.success };
          },

          resetPassword: async ({ token, password }) => {
            if (!api.resetPassword) {
              logger.warn('Reset password not implemented');
              return { success: false };
            }

            const response = await api.resetPassword({ token, password });
            return { success: response.success };
          },

          loginWithQrCode: async () => {
            if (!api.loginWithQrCode) {
              logger.warn('Login with QR code not implemented');
              return { success: false, qrCode: '' };
            }

            const response = await api.loginWithQrCode();
            return {
              success: response.success,
              qrCode: response.qrCode || '',
            };
          },

          getDeviceId: () => getOrCreateDeviceId(),

          loginWithToken: async ({ token: loginToken }) => {
            if (!api.loginWithToken) {
              logger.warn('Login with token not implemented');
              return { success: false };
            }

            const response = await api.loginWithToken({ token: loginToken });

            if (response.success && response.token) {
              const auth: AuthData = {
                userUuid: response.userUuid ?? null,
                token: response.token,
                refreshToken: response.refreshToken || null,
              };

              set(auth);
              saveAuthToStorage(auth);
            }

            return { success: response.success };
          },
        }),
        {
          name: persistKey,
          ...(persistStorage ? { storage: createJSONStorage(() => persistStorage) } : {}),
          partialize: (state) => ({
            userUuid: state.userUuid,
            token: state.token,
            refreshToken: state.refreshToken,

            user: state.user,
          }),
        },
      ),
    ),
  );
}
