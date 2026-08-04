type BaseResponse = {
  success: boolean;
  error?: string;
  message?: string;
};

type ID = string;
type Timestamp = number;

export type CredoSSOPayload = {
  data: {
    userUuid: ID;
    email: string;
    serviceCode: string;
    profile?: Record<string, unknown>;
    loginAt: Timestamp;
    __meta__?: {
      deviceId?: string;
      ipAddress?: string;
      tokenExpiration?: number;
      refreshTokenExpiration?: number;
    };
  };
};

export type RegisterRequest = {
  email: string;
  password: string;
  serviceCode: string;
};
export type RegisterResponse = BaseResponse;

export type LoginRequest = {
  serviceCode: string;
  email: string;
  password: string;
  tokenExpiration?: number;
  refreshTokenExpiration?: number;
  deviceId?: string;
};
export type LoginResponse = BaseResponse & {
  userUuid?: string;
  token?: string;
  refreshToken?: string;
};

export type RefreshTokenRequest = {
  refreshToken: string;
};
export type RefreshTokenResponse = BaseResponse & {
  token?: string;
  refreshToken?: string;
};

export type GetProfileRequest = {
  token: string;
};
export type GetProfileResponse<T extends Record<string, unknown> = Record<string, unknown>> = T & {
  emailVerified: boolean;
  mfaEnabled: boolean;
};

export type UpdateProfileBody = Record<string, unknown>;
export type UpdateProfileRequest = {
  token: string;
  profile: UpdateProfileBody;
};
export type UpdateProfileResponse = BaseResponse;

export type VerifyEmailRequest = {
  serviceCode: string;
  token: string;
};
export type VerifyEmailResponse = BaseResponse;

export type ResendVerificationRequest = {
  serviceCode: string;
  email: string;
  permissionKey?: string;
  expiration?: number;
  sendViaEmail?: boolean;
};
export type ResendVerificationResponse = BaseResponse & {
  token?: string;
};

export type ForgotPasswordRequest = {
  serviceCode: string;
  email: string;
  sendViaEmail?: boolean;
  permissionKey?: string;
};
export type ForgotPasswordResponse = BaseResponse & {
  token?: string;
};

export type ResetPasswordRequest = {
  serviceCode: string;
  token: string;
  password: string;
};
export type ResetPasswordResponse = BaseResponse;

export type ChangePasswordRequest = {
  token: string;
  serviceCode: string;
  oldPassword: string;
  password: string;
};
export type ChangePasswordResponse = BaseResponse;

export type ChangeEmailRequest = {
  token: string;
  newEmail: string;
  password: string;
  sendViaEmail?: boolean;
};
export type ChangeEmailResponse = BaseResponse & {
  token?: string;
};

export type ConfirmEmailChangeRequest = {
  serviceCode: string;
  token: string;
};
export type ConfirmEmailChangeResponse = BaseResponse;

export type GenerateLoginTokenRequest = {
  serviceCode: string;
  email: string;
  permissionKey?: string;
  expiration?: number;
  sendViaEmail?: boolean;
};
export type GenerateLoginTokenResponse = BaseResponse & {
  token?: string;
};

export type LoginWithTokenRequest = {
  serviceCode: string;
  token: string;
};
export type LoginWithTokenResponse = LoginResponse;

export type OperatorAddUserRequest = {
  email: string;
  password: string;
  serviceCode: string;
};
export type OperatorAddUserResponse = BaseResponse;

export type OperatorGenerateLoginTokenRequest = {
  serviceCode: string;
  email: string;
  expiration?: number;
};
export type OperatorGenerateLoginTokenResponse = BaseResponse & {
  token?: string;
};

export type OperatorDeleteUserRequest = {
  serviceCode: string;
  email: string;
};
export type OperatorDeleteUserResponse = BaseResponse;

export type OperatorDeleteUsersRequest = {
  serviceCode: string;
  emails: string[];
};
export type OperatorDeleteUsersResponse = BaseResponse & {
  results: Array<{
    email: string;
    success: boolean;
    error?: string;
  }>;
};

export type OperatorChangePasswordRequest = {
  serviceCode: string;
  email: string;
  password: string;
};
export type OperatorChangePasswordResponse = BaseResponse;

export type OperatorChangeEmailRequest = {
  serviceCode: string;
  oldEmail: string;
  newEmail: string;
};
export type OperatorChangeEmailResponse = BaseResponse;

export type OperatorUpdateProfileRequest = {
  serviceCode: string;
  email: string;
  profile: Record<string, unknown>;
};
export type OperatorUpdateProfileResponse = BaseResponse;

export type OperatorUserSummary = {
  email: string;
  userUuid: string;
  serviceCode: string;
  emailVerified: boolean;
  profile?: Record<string, unknown>;
  passwordChangedAt?: string;
  memo?: Record<string, unknown>;
};
export type OperatorGetUsersRequest = {
  serviceCode: string;
  limit?: number;
  offset?: number;
};
export type OperatorGetUsersResponse = BaseResponse & {
  users: OperatorUserSummary[];
  total: number;
  limit: number;
  offset: number;
};

export type GetAllServicesResponse = BaseResponse & {
  services: Array<{
    serviceCode: string;
    name?: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
  }>;
};

export type AddServiceRequest = {
  serviceCode: string;
  name?: string;
  description?: string;
  operatorAccessKey?: string;
};
export type AddServiceResponse = BaseResponse;

export type EmailAction = 'verification' | 'password-reset' | 'email-change' | 'login-token';

export type EmailConfigInput = {
  emailFrom?: string;
  emailSubject?: string;
  emailHtml?: string;
  emailText?: string;
};
export type UrlConfigInput = {
  baseUrl?: string;
};
export type EmailConfigsInput = Partial<Record<EmailAction, EmailConfigInput>>;
export type UrlConfigsInput = Partial<Record<EmailAction, UrlConfigInput>>;

export type UpdateEmailConfigRequest = {
  serviceCode: string;
  action: EmailAction;
  config: EmailConfigInput;
};
export type UpdateEmailConfigResponse = BaseResponse;

export type GetEmailConfigResponse = BaseResponse & {
  serviceCode: string;
  configs: Record<
    string,
    | {
        emailFrom: string;
        emailSubject: string;
        emailHtml: string;
        emailText: string;
      }
    | undefined
  >;
};

export type AddConfigRecordRequest = {
  serviceCode: string;
  allowEmailSending?: boolean;
  allowRegister?: boolean;
  allowLogin?: boolean;
  allowMagicLink?: boolean;
  allowForgotPassword?: boolean;
  allowResetPassword?: boolean;
  emailConfigs: EmailConfigsInput;
  urlConfigs?: UrlConfigsInput;
};
export type AddConfigRecordResponse = BaseResponse;

export type GetConfigRecordResponse = BaseResponse & {
  config: {
    serviceCode: string;
    allowEmailSending?: boolean;
    allowRegister?: boolean;
    allowLogin?: boolean;
    allowMagicLink?: boolean;
    allowForgotPassword?: boolean;
    allowResetPassword?: boolean;
    emailConfigs: Record<string, unknown>;
    urlConfigs?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
  };
};

export type UnverifyEmailRequest = {
  serviceCode: string;
  email: string;
};
export type UnverifyEmailResponse = BaseResponse;

export type ForceUpdatePasswordRequest = { serviceCode: string; email: string; password: string };
export type ForceUpdatePasswordResponse = BaseResponse;

export type DeleteUserRequest = { serviceCode: string; email: string };
export type DeleteUserResponse = BaseResponse;

export type DeleteServiceRequest = { serviceCode: string };
export type DeleteServiceResponse = BaseResponse;

export type DisableServiceRequest = { serviceCode: string };
export type DisableServiceResponse = BaseResponse;

export type EnableServiceRequest = { serviceCode: string };
export type EnableServiceResponse = BaseResponse;
