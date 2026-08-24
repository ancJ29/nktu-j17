export type BaseProfileData = {
  settings?: Record<string, unknown>;
};

export type BaseProfile<TProfileData extends BaseProfileData = BaseProfileData> = {
  name: string;
  email?: string;
  settings?: Record<string, unknown>;
  emailVerified?: boolean;
  mfaEnabled?: boolean;

  profile?: TProfileData & { settings?: Record<string, unknown> };
};

export type LoginParams = {
  email: string;
  password: string;
  tokenExpiration?: number;
  refreshTokenExpiration?: number;
  deviceId: string;
};

export type LoginResponse = {
  success: boolean;
  userUuid?: string | null;
  token?: string | null;
  refreshToken?: string | null;
  error?: string;
};

export type RefreshTokenParams = {
  refreshToken: string;
};

export type RefreshTokenResponse = {
  success: boolean;
  token?: string | null;
  refreshToken?: string | null;
  error?: string;
};

export type GetProfileParams = {
  token: string;
};

export type RegisterParams = {
  username: string;
  email: string;
  password: string;
};

export type RegisterResponse = {
  success: boolean;
  error?: string;
};

export type ForgotPasswordParams = {
  email: string;
};

export type ForgotPasswordResponse = {
  success: boolean;
  error?: string;
};

export type ResetPasswordParams = {
  token: string;
  password: string;
};

export type ResetPasswordResponse = {
  success: boolean;
  error?: string;
};

export type LoginWithQrCodeResponse = {
  success: boolean;
  qrCode?: string;
  error?: string;
};

export type LoginWithTokenParams = {
  token: string;
};

export type LoginWithTokenResponse = {
  success: boolean;
  userUuid?: string | null;
  token?: string | null;
  refreshToken?: string | null;
  error?: string;
};

export type AuthApi<TProfile extends BaseProfile = BaseProfile> = {
  login: (params: LoginParams) => Promise<LoginResponse>;
  refreshToken: (params: RefreshTokenParams) => Promise<RefreshTokenResponse>;
  getProfile: (params: GetProfileParams) => Promise<TProfile | undefined>;
  register?: (params: RegisterParams) => Promise<RegisterResponse>;
  forgotPassword?: (params: ForgotPasswordParams) => Promise<ForgotPasswordResponse>;
  resetPassword?: (params: ResetPasswordParams) => Promise<ResetPasswordResponse>;
  loginWithQrCode?: () => Promise<LoginWithQrCodeResponse>;
  loginWithToken?: (params: LoginWithTokenParams) => Promise<LoginWithTokenResponse>;
};

export type AuthStorageKeys = {
  AUTH: string;
  LOGIN_USER_ID: string;
  TOKEN: string;
  REFRESH_TOKEN: string;
  DEVICE_ID: string;
};

export type AuthStorage = {
  get: <T>(key: string) => T | null;
  set: <T>(key: string, value: T) => void;
  remove: (key: string) => void;
};

export type AuthStoreConfig<TProfile extends BaseProfile = BaseProfile> = {
  deviceIdPrefix: string;

  tokenDuration: number;

  rememberRefreshDuration: number;

  sessionRefreshDuration: number;

  persistKey?: string;

  isDev?: boolean;

  devProfile?: TProfile;
};

export type AuthData = {
  userUuid: string | null;
  token: string | null;
  refreshToken: string | null;
};

export type TokenRefreshOutcome = 'valid' | 'refreshed' | 'deferred' | 'logged-out' | 'anonymous';

export type LogoutReason =
  | 'user'
  | 'refresh-token-expired'
  | 'refresh-rejected'
  | 'profile-rejected'
  | 'account-locked'
  | 'unknown'
  | (string & {});

export type AuthState<TProfile extends BaseProfile = BaseProfile> = {
  user: TProfile;
  userUuid: string | null;
  token: string | null;
  refreshToken: string | null;

  isProfileLoaded: boolean;

  lastLogoutReason: LogoutReason | null;

  login: (params: {
    email: string;
    password: string;
    remember: boolean;
  }) => Promise<{ success: boolean }>;

  logout: (reason?: LogoutReason) => { success: boolean };

  loadProfile: () => Promise<void>;

  checkAndRefreshToken: () => Promise<TokenRefreshOutcome>;

  register: (params: {
    username: string;
    email: string;
    password: string;
  }) => Promise<{ success: boolean }>;

  forgotPassword: (params: { email: string }) => Promise<{ success: boolean }>;

  resetPassword: (params: { token: string; password: string }) => Promise<{ success: boolean }>;

  loginWithQrCode: () => Promise<{ success: boolean; qrCode: string }>;

  loginWithToken: (params: { token: string }) => Promise<{ success: boolean }>;

  getDeviceId: () => string;
};

export type PersistStorage = {
  getItem: (name: string) => string | null;
  setItem: (name: string, value: string) => void;
  removeItem: (name: string) => void;
};

export type CreateAuthStoreOptions<TProfile extends BaseProfile = BaseProfile> = {
  api: AuthApi<TProfile>;
  storage: AuthStorage;
  storageKeys: AuthStorageKeys;
  config: AuthStoreConfig<TProfile>;

  persistStorage?: PersistStorage;
};
