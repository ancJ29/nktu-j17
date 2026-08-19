import { PORTS } from '@credo/kits/port';

import { createApiGroup } from '../shared/api-group';
import { targets, urls } from '../shared/config';
import { registerStagePrefix } from '../shared/transport-state';
import { C_SSO_ROUTES } from './routes';
import type {
  AddConfigRecordRequest,
  AddConfigRecordResponse,
  AddServiceRequest,
  AddServiceResponse,
  DeleteServiceRequest,
  DeleteServiceResponse,
  DisableServiceRequest,
  DisableServiceResponse,
  GetProfileResponse,
  GetPublicKeyResponse,
  LoginRequest,
  LoginResponse,
  LoginWithTokenRequest,
  LoginWithTokenResponse,
  OperatorAddUserRequest,
  OperatorAddUserResponse,
  OperatorChangeEmailRequest,
  OperatorChangeEmailResponse,
  OperatorChangePasswordRequest,
  OperatorChangePasswordResponse,
  OperatorDeleteUserRequest,
  OperatorDeleteUserResponse,
  OperatorGenerateLoginTokenRequest,
  OperatorGenerateLoginTokenResponse,
  OperatorUpdateProfileRequest,
  OperatorUpdateProfileResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
} from './types';

export * from './routes';

const storages = {
  target: targets['credoSso'] || '',
  accessKey: '',
  trustedServiceKey: '',
  stage: '$default',
  baseUrl: urls['credoSso'] || '',
};

registerStagePrefix(storages.baseUrl, storages.target);

const SSO_ROUTES = C_SSO_ROUTES.SUB_ROUTES.SSO;
const V2_ROUTES = C_SSO_ROUTES.SUB_ROUTES.V2;

const getBaseUrl = () => storages.baseUrl;

const withAuth = (token: string) => ({
  authToken: token,
  trustedServiceKey: storages.trustedServiceKey,
});

const ssoApi = createApiGroup({
  storages,
  prefix: C_SSO_ROUTES.PREFIXES.SSO,
  getBaseUrl,
});

const v2Api = createApiGroup({
  storages,
  prefix: C_SSO_ROUTES.PREFIXES.V2,
  getBaseUrl,
});

const v2AdminApi = createApiGroup({
  storages,
  prefix: C_SSO_ROUTES.PREFIXES.V2,
  getBaseUrl,
  defaults: { accessKeyRequired: true },
});

export const cSsoConnector = {
  useLocal: () => cSsoConnector.setBaseUrl(`http://localhost:${PORTS.CREDO_SSO}/dev`),

  setTarget: (target: string) => {
    storages.target = target;

    registerStagePrefix(storages.baseUrl, target);
    return cSsoConnector;
  },
  setBaseUrl: (baseUrl: string) => {
    if (baseUrl) {
      storages.baseUrl = baseUrl;
      registerStagePrefix(baseUrl, storages.target);
    }
    return cSsoConnector;
  },
  setAccessKey: (accessKey: string) => {
    if (accessKey) {
      storages.accessKey = accessKey;
    }
    return cSsoConnector;
  },
  setTrustedServiceKey: (trustedServiceKey: string) => {
    if (trustedServiceKey) {
      storages.trustedServiceKey = trustedServiceKey;
    }
    return cSsoConnector;
  },

  login: ({
    serviceCode,
    email,
    password,
    tokenExpiration,
    refreshTokenExpiration,
    deviceId,
  }: LoginRequest) =>
    ssoApi<LoginResponse>(SSO_ROUTES.LOGIN, {
      withNonce: true,
      body: {
        serviceCode,
        email,
        password,
        tokenExpiration,
        refreshTokenExpiration,
        deviceId,
      },
    }),

  refreshToken: ({ refreshToken }: RefreshTokenRequest) =>
    ssoApi<RefreshTokenResponse>(SSO_ROUTES.REFRESH_TOKEN, {
      body: { refreshToken },
    }),

  getProfile: <T extends Record<string, unknown> = Record<string, unknown>>(token: string) =>
    ssoApi<GetProfileResponse<T>>(SSO_ROUTES.GET_PROFILE, {
      storages: withAuth(token),
    }),

  loginWithToken: ({ serviceCode, token }: LoginWithTokenRequest) =>
    ssoApi<LoginWithTokenResponse>(SSO_ROUTES.LOGIN_WITH_TOKEN, {
      body: { serviceCode, token },
    }),

  getPublicKey: () => v2Api<GetPublicKeyResponse>(V2_ROUTES.GET_PUBLIC_KEY),

  addService: ({ serviceCode, name, description, operatorAccessKey }: AddServiceRequest) =>
    v2AdminApi<AddServiceResponse>(V2_ROUTES.ADD_SERVICE, {
      body: { serviceCode, name, description, operatorAccessKey },
    }),

  addConfigRecord: ({
    serviceCode,
    allowRegister,
    allowLogin,
    allowMagicLink,
    allowForgotPassword,
    allowResetPassword,
  }: AddConfigRecordRequest) =>
    v2AdminApi<AddConfigRecordResponse>(V2_ROUTES.ADD_CONFIG_RECORD, {
      body: {
        serviceCode,
        allowRegister,
        allowLogin,
        allowMagicLink,
        allowForgotPassword,
        allowResetPassword,
      },
    }),

  operatorAddUser: (
    operatorAccessKey: string,
    { email, password, serviceCode }: OperatorAddUserRequest,
  ) =>
    v2Api<OperatorAddUserResponse>(V2_ROUTES.OPERATOR_ADD_USER, {
      body: { email, password, serviceCode },
      extraHeaders: { 'x-operator-access-key': operatorAccessKey },
    }),

  operatorGenerateLoginToken: (
    operatorAccessKey: string,
    { serviceCode, email, expiration }: OperatorGenerateLoginTokenRequest,
  ) =>
    v2Api<OperatorGenerateLoginTokenResponse>(V2_ROUTES.OPERATOR_GENERATE_LOGIN_TOKEN, {
      body: { serviceCode, email, expiration },
      extraHeaders: { 'x-operator-access-key': operatorAccessKey },
    }),

  operatorDeleteUser: (
    operatorAccessKey: string,
    { serviceCode, email }: OperatorDeleteUserRequest,
  ) =>
    v2Api<OperatorDeleteUserResponse>(V2_ROUTES.OPERATOR_DELETE_USER, {
      body: { serviceCode, email },
      extraHeaders: { 'x-operator-access-key': operatorAccessKey },
    }),

  operatorChangePassword: (
    operatorAccessKey: string,
    { serviceCode, email, password }: OperatorChangePasswordRequest,
  ) =>
    v2Api<OperatorChangePasswordResponse>(V2_ROUTES.OPERATOR_CHANGE_PASSWORD, {
      body: { serviceCode, email, password },
      extraHeaders: { 'x-operator-access-key': operatorAccessKey },
    }),

  operatorChangeEmail: (
    operatorAccessKey: string,
    { serviceCode, oldEmail, newEmail }: OperatorChangeEmailRequest,
  ) =>
    v2Api<OperatorChangeEmailResponse>(V2_ROUTES.OPERATOR_CHANGE_EMAIL, {
      body: { serviceCode, oldEmail, newEmail },
      extraHeaders: { 'x-operator-access-key': operatorAccessKey },
    }),

  operatorUpdateProfile: (
    operatorAccessKey: string,
    { serviceCode, email, profile }: OperatorUpdateProfileRequest,
  ) =>
    v2Api<OperatorUpdateProfileResponse>(V2_ROUTES.OPERATOR_UPDATE_PROFILE, {
      body: { serviceCode, email, profile },
      extraHeaders: { 'x-operator-access-key': operatorAccessKey },
    }),

  deleteService: ({ serviceCode }: DeleteServiceRequest) =>
    v2AdminApi<DeleteServiceResponse>(V2_ROUTES.DELETE_SERVICE, {
      body: { serviceCode },
    }),

  disableService: ({ serviceCode }: DisableServiceRequest) =>
    v2AdminApi<DisableServiceResponse>(V2_ROUTES.DISABLE_SERVICE, {
      body: { serviceCode },
    }),
};
