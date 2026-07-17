

import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';
import { asyncDeduplicator, isTokenExpired, logger } from '../../utils';
import type { AuthData, AuthState, BaseProfile, CreateAuthStoreOptions } from './types';

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
    if (existingId) return existingId;

    const newId = `${deviceIdPrefix}-${Date.now().toString(36)}`;
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

          checkAndRefreshToken: async () => {
            const { token, refreshToken, userUuid } = get();

            
            if (!token || !refreshToken || !isTokenExpired(token)) {
              return;
            }

            
            if (isTokenExpired(refreshToken, 0)) {
              logger.info('Refresh token expired, logging out');
              get().logout();
              return;
            }

            try {
              
              const response = await asyncDeduplicator.call('refreshToken', async () => {
                return api.refreshToken({ refreshToken });
              });

              if (response.success && response.token) {
                
                if (!get().token) return;

                
                const updatedAuth: AuthData = {
                  userUuid,
                  token: response.token,
                  refreshToken: response.refreshToken || refreshToken,
                };
                set(updatedAuth);
                saveAuthToStorage(updatedAuth);
              } else {
                
                logger.error('Token refresh failed:', response.error);
                get().logout();
              }
            } catch (error) {
              
              logger.error('Token refresh error:', error);
              get().logout();
            }
          },

          loadProfile: async () => {
            
            
            
            
            

            try {
              await get().checkAndRefreshToken();
              const state = get();
              const token = state.token;

              if (!token) {
                set({ isProfileLoaded: true });
                throw new Error('Token is required');
              }

              const user = await asyncDeduplicator.call(`getProfile-${token}`, async () => {
                const profile = await api.getProfile({ token }).catch((error) => {
                  logger.error('Failed to get profile:', error);
                  get().logout();
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

          logout: () => {
            set({ token: null, refreshToken: null, isProfileLoaded: false });
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

          saveProfile: async () => {
            if (!api.saveProfile) {
              logger.warn('Save profile not implemented');
              return;
            }

            const state = get();
            const token = state.token;
            if (!token) {
              logger.warn('Cannot save profile: no token');
              return;
            }

            const user = state.user;
            await api.saveProfile({
              token,
              name: user.name || '',
              email: user.email || '',
            });
          },
        }),
        {
          name: persistKey,
          ...(persistStorage ? { storage: createJSONStorage(() => persistStorage) } : {}),
          partialize: (state) => ({
            userUuid: state.userUuid,
            token: state.token,
            refreshToken: state.refreshToken,
          }),
        },
      ),
    ),
  );
}
