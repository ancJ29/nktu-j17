import { compareEnvVar } from '@credo/kits/misc';

export const ADMIN_CONFIG_KEY = '__X_ADMIN_CONFIG__';

export const isAdmin = compareEnvVar(
  ADMIN_CONFIG_KEY,
  
  import.meta.env.VITE_APP_ADMIN_CONFIG ?? '7adc1b16b71a',
);

if (!isAdmin && localStorage.getItem(ADMIN_CONFIG_KEY)) {
  localStorage.removeItem(ADMIN_CONFIG_KEY);
}

export function getAdminConfigValue(): string {
  try {
    return localStorage.getItem(ADMIN_CONFIG_KEY) ?? '';
  } catch {
    return '';
  }
}

export const isDev = import.meta.env.DEV;

export const API_GROUP_STORAGE_KEY = 'e4f039f79';

export const appApiGroup =
  localStorage.getItem(API_GROUP_STORAGE_KEY) ||
  (import.meta.env.VITE_APP_API_GROUP as string) ||
  '';

export function setAppApiGroup(apiGroup: string) {
  localStorage.setItem(API_GROUP_STORAGE_KEY, apiGroup);
}

export const appActivityLoggerInternalAccessKey =
  localStorage.getItem('284901473a') ||
  (import.meta.env.VITE_APP_ACTIVITY_LOGGER_INTERNAL_ACCESS_KEY as string) ||
  '';

export const appCredoStorageHash = (import.meta.env.VITE_APP_CREDO_STORAGE_HASH as string) ?? '';

export const credoClientCode = (import.meta.env.VITE_CREDO_CLIENT_CODE as string) ?? '';

export const isProduction = import.meta.env.VITE_APP_PRODUCTION_FLAG === 'true';

export const isInternal = !isProduction || window.location.hostname.includes('internal');

export const isLocalhost = window.location.hostname.includes('localhost');
