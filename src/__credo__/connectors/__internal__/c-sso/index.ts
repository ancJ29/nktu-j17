import { PORTS } from '@credo/kits/port';

import { createApiGroup } from '../shared/api-group';
import { urls } from '../shared/config';
import { registerStagePrefix } from '../shared/transport-state';
import { C_SSO_ROUTES } from './routes';
import type {
  AddConfigRecordRequest,
  AddConfigRecordResponse,
  AddServiceRequest,
  AddServiceResponse,
  ChangeEmailRequest,
  ChangeEmailResponse,
  ChangePasswordRequest,
  ChangePasswordResponse,
  ConfirmEmailChangeRequest,
  ConfirmEmailChangeResponse,
  DeleteServiceRequest,
  DeleteServiceResponse,
  DeleteUserRequest,
  DeleteUserResponse,
  DisableServiceRequest,
  DisableServiceResponse,
  EnableServiceRequest,
  EnableServiceResponse,
  ForceUpdatePasswordRequest,
  ForceUpdatePasswordResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  GenerateLoginTokenRequest,
  GenerateLoginTokenResponse,
  GetAllServicesResponse,
  GetConfigRecordResponse,
  GetEmailConfigResponse,
  GetProfileResponse,
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
  OperatorDeleteUsersRequest,
  OperatorDeleteUsersResponse,
  OperatorGenerateLoginTokenRequest,
  OperatorGenerateLoginTokenResponse,
  OperatorGetUsersRequest,
  OperatorGetUsersResponse,
  OperatorUpdateProfileRequest,
  OperatorUpdateProfileResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  RegisterRequest,
  RegisterResponse,
  ResendVerificationRequest,
  ResendVerificationResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  UnverifyEmailRequest,
  UnverifyEmailResponse,
  UpdateEmailConfigRequest,
  UpdateEmailConfigResponse,
  UpdateProfileResponse,
  VerifyEmailRequest,
  VerifyEmailResponse,
} from './types';

export * from './routes';

const storages = {
  accessKey: '',
  trustedServiceKey: '',
  stage: '$default',
  baseUrl: urls['credoSso'] || '',
};

registerStagePrefix(storages.baseUrl);

const SSO_ROUTES = C_SSO_ROUTES.SUB_ROUTES.SSO;
const CONFIG_ROUTES = C_SSO_ROUTES.SUB_ROUTES.CONFIG;
const OPERATOR_ROUTES = C_SSO_ROUTES.SUB_ROUTES.OPERATOR;
const ADMIN_ROUTES = C_SSO_ROUTES.SUB_ROUTES.ADMIN;

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

const configApi = createApiGroup({
  storages,
  prefix: C_SSO_ROUTES.PREFIXES.CONFIG,
  getBaseUrl,
  defaults: { accessKeyRequired: true },
});

const operatorApi = createApiGroup({
  storages,
  prefix: C_SSO_ROUTES.PREFIXES.OPERATOR,
  getBaseUrl,
});

const adminApi = createApiGroup({
  storages,
  prefix: C_SSO_ROUTES.PREFIXES.ADMIN,
  getBaseUrl,
  defaults: { accessKeyRequired: true },
});

export const cSsoConnector = {
  useLocal: () => cSsoConnector.setBaseUrl(`http://localhost:${PORTS.CREDO_SSO}/dev`),
  setBaseUrl: (baseUrl: string) => {
    storages.baseUrl = baseUrl;
    registerStagePrefix(baseUrl);
    return cSsoConnector;
  },
  setAccessKey: (accessKey: string) => {
    storages.accessKey = accessKey;
    return cSsoConnector;
  },
  setTrustedServiceKey: (trustedServiceKey: string) => {
    storages.trustedServiceKey = trustedServiceKey;
    return cSsoConnector;
  },

  
  
  

  register: ({ email, password, serviceCode }: RegisterRequest) =>
    ssoApi<RegisterResponse>(SSO_ROUTES.REGISTER, {
      body: { email, password, serviceCode },
    }),

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

  updateProfile: (token: string, profile: Record<string, unknown>) =>
    ssoApi<UpdateProfileResponse>(SSO_ROUTES.UPDATE_PROFILE, {
      storages: withAuth(token),
      body: profile,
    }),

  verifyEmail: ({ serviceCode, token }: VerifyEmailRequest) =>
    ssoApi<VerifyEmailResponse>(SSO_ROUTES.VERIFY_EMAIL, {
      body: { serviceCode, token },
    }),

  resendVerification: ({
    serviceCode,
    email,
    permissionKey,
    expiration,
    sendViaEmail,
  }: ResendVerificationRequest) =>
    ssoApi<ResendVerificationResponse>(SSO_ROUTES.RESEND_VERIFICATION, {
      body: { serviceCode, email, permissionKey, expiration, sendViaEmail },
    }),

  forgotPassword: ({ serviceCode, email, sendViaEmail, permissionKey }: ForgotPasswordRequest) =>
    ssoApi<ForgotPasswordResponse>(SSO_ROUTES.FORGOT_PASSWORD, {
      body: { serviceCode, email, sendViaEmail, permissionKey },
    }),

  resetPassword: ({ serviceCode, token, password }: ResetPasswordRequest) =>
    ssoApi<ResetPasswordResponse>(SSO_ROUTES.RESET_PASSWORD, {
      body: { serviceCode, token, password },
    }),

  changePassword: ({ token, serviceCode, oldPassword, password }: ChangePasswordRequest) =>
    ssoApi<ChangePasswordResponse>(SSO_ROUTES.CHANGE_PASSWORD, {
      storages: withAuth(token),
      body: { serviceCode, oldPassword, password },
    }),

  changeEmail: ({ token, newEmail, password, sendViaEmail }: ChangeEmailRequest) =>
    ssoApi<ChangeEmailResponse>(SSO_ROUTES.CHANGE_EMAIL, {
      storages: withAuth(token),
      body: { newEmail, password, sendViaEmail },
    }),

  confirmEmailChange: ({ serviceCode, token }: ConfirmEmailChangeRequest) =>
    ssoApi<ConfirmEmailChangeResponse>(SSO_ROUTES.CONFIRM_EMAIL_CHANGE, {
      body: { serviceCode, token },
    }),

  generateLoginToken: ({
    serviceCode,
    email,
    permissionKey,
    expiration,
    sendViaEmail,
  }: GenerateLoginTokenRequest) =>
    ssoApi<GenerateLoginTokenResponse>(SSO_ROUTES.GENERATE_LOGIN_TOKEN, {
      body: { serviceCode, email, permissionKey, expiration, sendViaEmail },
    }),

  loginWithToken: ({ serviceCode, token }: LoginWithTokenRequest) =>
    ssoApi<LoginWithTokenResponse>(SSO_ROUTES.LOGIN_WITH_TOKEN, {
      body: { serviceCode, token },
    }),

  
  
  

  getAllServices: () => configApi<GetAllServicesResponse>(CONFIG_ROUTES.GET_ALL_SERVICES),

  addService: ({ serviceCode, name, description, operatorAccessKey }: AddServiceRequest) =>
    configApi<AddServiceResponse>(CONFIG_ROUTES.ADD_SERVICE, {
      body: { serviceCode, name, description, operatorAccessKey },
    }),

  updateEmailConfig: ({ serviceCode, action, config }: UpdateEmailConfigRequest) =>
    configApi<UpdateEmailConfigResponse>(CONFIG_ROUTES.UPDATE_EMAIL_CONFIG, {
      body: { serviceCode, action, config },
    }),

  getEmailConfig: (serviceCode: string) =>
    configApi<GetEmailConfigResponse>(CONFIG_ROUTES.GET_EMAIL_CONFIG, {
      params: { serviceCode },
      noContentType: true,
    }),

  addConfigRecord: ({
    serviceCode,
    allowEmailSending,
    allowRegister,
    allowLogin,
    allowMagicLink,
    allowForgotPassword,
    allowResetPassword,
    emailConfigs,
    urlConfigs,
  }: AddConfigRecordRequest) =>
    configApi<AddConfigRecordResponse>(CONFIG_ROUTES.ADD_CONFIG_RECORD, {
      body: {
        serviceCode,
        allowEmailSending,
        allowRegister,
        allowLogin,
        allowMagicLink,
        allowForgotPassword,
        allowResetPassword,
        emailConfigs,
        urlConfigs,
      },
    }),

  getConfigRecord: (serviceCode: string) =>
    configApi<GetConfigRecordResponse>(CONFIG_ROUTES.GET_CONFIG_RECORD, {
      params: { serviceCode },
      noContentType: true,
    }),

  
  
  

  operatorAddUser: (
    operatorAccessKey: string,
    { email, password, serviceCode }: OperatorAddUserRequest,
  ) =>
    operatorApi<OperatorAddUserResponse>(OPERATOR_ROUTES.ADD_USER, {
      body: { email, password, serviceCode },
      extraHeaders: { 'x-operator-access-key': operatorAccessKey },
    }),

  operatorGenerateLoginToken: (
    operatorAccessKey: string,
    { serviceCode, email, expiration }: OperatorGenerateLoginTokenRequest,
  ) =>
    operatorApi<OperatorGenerateLoginTokenResponse>(OPERATOR_ROUTES.GENERATE_LOGIN_TOKEN, {
      body: { serviceCode, email, expiration },
      extraHeaders: { 'x-operator-access-key': operatorAccessKey },
    }),

  operatorDeleteUser: (
    operatorAccessKey: string,
    { serviceCode, email }: OperatorDeleteUserRequest,
  ) =>
    operatorApi<OperatorDeleteUserResponse>(OPERATOR_ROUTES.DELETE_USER, {
      body: { serviceCode, email },
      extraHeaders: { 'x-operator-access-key': operatorAccessKey },
    }),

  operatorDeleteUsers: (
    operatorAccessKey: string,
    { serviceCode, emails }: OperatorDeleteUsersRequest,
  ) =>
    operatorApi<OperatorDeleteUsersResponse>(OPERATOR_ROUTES.DELETE_USERS, {
      body: { serviceCode, emails },
      extraHeaders: { 'x-operator-access-key': operatorAccessKey },
    }),

  operatorChangePassword: (
    operatorAccessKey: string,
    { serviceCode, email, password }: OperatorChangePasswordRequest,
  ) =>
    operatorApi<OperatorChangePasswordResponse>(OPERATOR_ROUTES.CHANGE_PASSWORD, {
      body: { serviceCode, email, password },
      extraHeaders: { 'x-operator-access-key': operatorAccessKey },
    }),

  operatorChangeEmail: (
    operatorAccessKey: string,
    { serviceCode, oldEmail, newEmail }: OperatorChangeEmailRequest,
  ) =>
    operatorApi<OperatorChangeEmailResponse>(OPERATOR_ROUTES.CHANGE_EMAIL, {
      body: { serviceCode, oldEmail, newEmail },
      extraHeaders: { 'x-operator-access-key': operatorAccessKey },
    }),

  operatorUpdateProfile: (
    operatorAccessKey: string,
    { serviceCode, email, profile }: OperatorUpdateProfileRequest,
  ) =>
    operatorApi<OperatorUpdateProfileResponse>(OPERATOR_ROUTES.UPDATE_PROFILE, {
      body: { serviceCode, email, profile },
      extraHeaders: { 'x-operator-access-key': operatorAccessKey },
    }),

  operatorGetUsers: (
    operatorAccessKey: string,
    { serviceCode, limit, offset }: OperatorGetUsersRequest,
  ) =>
    operatorApi<OperatorGetUsersResponse>(OPERATOR_ROUTES.GET_USERS, {
      body: { serviceCode, limit, offset },
      extraHeaders: { 'x-operator-access-key': operatorAccessKey },
    }),

  
  
  

  unverifyEmail: ({ serviceCode, email }: UnverifyEmailRequest) =>
    adminApi<UnverifyEmailResponse>(ADMIN_ROUTES.UNVERIFY_EMAIL, {
      body: { serviceCode, email },
    }),

  forceUpdatePassword: ({ serviceCode, email, password }: ForceUpdatePasswordRequest) =>
    adminApi<ForceUpdatePasswordResponse>(ADMIN_ROUTES.FORCE_UPDATE_PASSWORD, {
      body: { serviceCode, email, password },
    }),

  deleteUser: ({ serviceCode, email }: DeleteUserRequest) =>
    adminApi<DeleteUserResponse>(ADMIN_ROUTES.DELETE_USER, {
      body: { serviceCode, email },
    }),

  deleteService: ({ serviceCode }: DeleteServiceRequest) =>
    adminApi<DeleteServiceResponse>(ADMIN_ROUTES.DELETE_SERVICE, {
      body: { serviceCode },
    }),

  disableService: ({ serviceCode }: DisableServiceRequest) =>
    adminApi<DisableServiceResponse>(ADMIN_ROUTES.DISABLE_SERVICE, {
      body: { serviceCode },
    }),

  enableService: ({ serviceCode }: EnableServiceRequest) =>
    adminApi<EnableServiceResponse>(ADMIN_ROUTES.ENABLE_SERVICE, {
      body: { serviceCode },
    }),
};
