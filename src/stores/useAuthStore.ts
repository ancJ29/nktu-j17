import { appConfig } from '@/config';
import { resolveClientCode, resolveServiceCode } from '@/config/client-code';
import { AUTH_STORAGE_KEYS, encodedAuthStorage, encodedPersistStorage } from '@/stores/authStorage';
import { CallApiError, cMngtConnector, credoSmeConnector } from '@credo/connectors/connector';
import type {
  CredoSmeEffectivePermissions,
  CredoSmeGetMeResponse,
  CredoSmeMyInformation,
} from '@credo/connectors/types';
import {
  adoptSessionIfNeeded,
  ensureAuthId,
  forgetAuthId,
  readAuthId,
  rememberAuthId,
} from '@/utils/authId';
import { clearCachedProfile, readCachedProfile, writeCachedProfile } from '@/utils/profileCache';
import { logger } from '@credo/base-ui/utils';
import type { AuthApi, BaseProfile } from '@credo/base-ui/lib';
import { createAuthStore } from '@credo/base-ui/lib';
import { ONE_DAY, ONE_MINUTE } from '@credo/base-ui/utils';

type Profile = BaseProfile & {
  isRoot?: boolean;

  myInformation?: CredoSmeMyInformation | null;
};

const serviceCode = resolveServiceCode();

credoSmeConnector.setClientCode(resolveClientCode());

const smeAuthApi: AuthApi<Profile> = {
  login: async ({ email, password, tokenExpiration, refreshTokenExpiration, deviceId }) => {
    const response = await credoSmeConnector.login({
      serviceCode,
      email,
      password,
      tokenExpiration,
      refreshTokenExpiration,
      deviceId,
    });
    rememberAuthId(response);
    return {
      success: true,
      userUuid: response.userUuid,
      token: response.token,
      refreshToken: response.refreshToken,
    };
  },

  refreshToken: () => {
    throw new Error('credo-sme serves no refresh route — the session handle renews server-side');
  },

  getProfile: () => {
    throw new Error('credo-sme profiles load through loadProfile() — this slot is token-shaped');
  },

  loginWithToken: async ({ token }) => {
    const response = await credoSmeConnector.loginWithToken({ serviceCode, token });
    rememberAuthId(response);
    return {
      success: true,
      userUuid: response.userUuid,
      token: response.token,
      refreshToken: response.refreshToken,
    };
  },
};

export const useAuthStore = createAuthStore<Profile>({
  api: smeAuthApi,
  storage: encodedAuthStorage,
  persistStorage: encodedPersistStorage,
  storageKeys: AUTH_STORAGE_KEYS,
  config: {
    deviceIdPrefix: 'C-MNGT',
    isDev: appConfig.env?.IS_DEV ?? false,
    tokenDuration: 15 * ONE_MINUTE,
    rememberRefreshDuration: 180 * ONE_DAY,
    sessionRefreshDuration: ONE_DAY,
  },
});

export function isSignedIn(): boolean {
  return readAuthId() !== null;
}

export async function loadProfile(): Promise<void> {
  const handle = await ensureAuthId({ serviceCode, deviceId });
  if (!handle) {
    useAuthStore.setState({ isProfileLoaded: true });
    return;
  }

  const cached = await readCachedProfile(handle);
  if (cached) {
    useAuthStore.setState({ user: toProfile(cached), isProfileLoaded: true });
    void revalidateProfile(handle, cached);
    return;
  }

  await fetchProfile(handle, { fatal: true });
}

async function revalidateProfile(handle: string, cached: CredoSmeGetMeResponse): Promise<void> {
  await fetchProfile(handle, { fatal: false, cached }).catch(() => undefined);
}

let freshServerPermissions: CredoSmeEffectivePermissions | null = null;

export function readFreshServerPermissions(): CredoSmeEffectivePermissions | null {
  return freshServerPermissions;
}

async function fetchProfile(
  handle: string,
  { fatal, cached }: { fatal: boolean; cached?: CredoSmeGetMeResponse },
): Promise<void> {
  try {
    const me = await credoSmeConnector.getMe(cached?.profileHash);
    if ('noChange' in me) {
      freshServerPermissions = cached?.permissions ?? null;
      return;
    }
    writeCachedProfile(handle, me);
    freshServerPermissions = me.permissions;
    useAuthStore.setState({ user: toProfile(me), isProfileLoaded: true });
  } catch (error) {
    if (isSessionEnded(error)) {
      logger.warn('[auth] /auth/me rejected the handle — ending the session');
      useAuthStore.getState().logout('profile-rejected');
      return;
    }

    logger.warn('[auth] profile read failed, keeping the session', { error });
    if (fatal) useAuthStore.setState({ isProfileLoaded: true });
  }
}

function isSessionEnded(error: unknown): boolean {
  return error instanceof CallApiError && (error.status === 401 || error.status === 403);
}

function toProfile(me: CredoSmeGetMeResponse): Profile {
  return {
    name: me.myInformation?.name || me.name,
    email: me.email,
    isRoot: me.isRootUser,
    myInformation: me.myInformation,
  };
}

export const SESSION_EXPIRED_NOTICE_KEY = 'sessionExpiredNotice';

export type SessionExpiredNotice = {
  reason: string;

  at: number;
};

export function takeSessionExpiredNotice(): SessionExpiredNotice | null {
  const raw = sessionStorage.getItem(SESSION_EXPIRED_NOTICE_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(SESSION_EXPIRED_NOTICE_KEY);

  try {
    const parsed = JSON.parse(raw) as Partial<SessionExpiredNotice>;
    if (typeof parsed?.reason !== 'string') return { reason: 'unknown', at: Date.now() };
    return { reason: parsed.reason, at: typeof parsed.at === 'number' ? parsed.at : Date.now() };
  } catch {
    return { reason: 'unknown', at: Date.now() };
  }
}

function endSession(reason: string): void {
  forgetAuthId();
  clearCachedProfile();

  const notice: SessionExpiredNotice = { reason, at: Date.now() };
  try {
    sessionStorage.setItem(SESSION_EXPIRED_NOTICE_KEY, JSON.stringify(notice));
  } catch {
    // Quota / disabled storage — the toast is a nicety, not a requirement.
  }
  logger.warn('Session ended', { reason });
}

const factoryLogout = useAuthStore.getState().logout;

useAuthStore.setState({
  loadProfile,
  logout: (reason = 'unknown') => {
    endSession(reason);
    return factoryLogout(reason);
  },
});

function readDeviceId(): string {
  try {
    const getter = (useAuthStore.getState() as { getDeviceId?: () => string }).getDeviceId;
    if (typeof getter !== 'function') {
      logger.warn(
        '[auth] getDeviceId missing from @credo/base-ui — x-device-id will not be sent. Rebuild the package (yarn build:all) and restart the dev server.',
      );
      return '';
    }
    return getter();
  } catch (error) {
    logger.warn('[auth] could not resolve a device id; x-device-id will not be sent', { error });
    return '';
  }
}

export const deviceId = readDeviceId();
if (deviceId) {
  credoSmeConnector.setDeviceId(deviceId);

  cMngtConnector.setDeviceId(deviceId);

  adoptSessionIfNeeded({ serviceCode, deviceId });
}
