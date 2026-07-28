import { credoSSOApi } from '../../connectors';
import type { AuthApi, BaseProfile } from './types';

type CreateCredoSSOAuthApiOptions = {
  serviceCode: string;

  api?: typeof credoSSOApi;
};

export function createCredoSSOAuthApi<TProfile extends BaseProfile = BaseProfile>(
  options: CreateCredoSSOAuthApiOptions,
): AuthApi<TProfile> {
  const { serviceCode, api = credoSSOApi } = options;

  return {
    login: async ({ email, password, tokenExpiration, refreshTokenExpiration, deviceId }) => {
      const response = await api.login({
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
      const response = await api.refreshToken({ refreshToken });
      return {
        success: response.success,
        token: response.token,
        refreshToken: response.refreshToken,
        error: response.error,
      };
    },

    getProfile: async ({ token }) => {
      return api.getProfile<TProfile>(token);
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
  };
}
