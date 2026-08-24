import { getEnvVar, isBrowser, setEnvVar } from '@credo/kits/misc';

export const configs: Record<string, Record<string, string>> = {
  '1786e4': {
    activityLogger: 'https://inst-1786e4.api-bridge.work',
    credoSso: 'https://inst-1786e4.api-bridge.work/$default',
    cMngt: 'https://inst-1786e4.api-bridge.work/$default',
    cStorage: 'https://inst-1786e4.api-bridge.work',
  },
  '49a092': {
    activityLogger: 'https://inst-4e8870.api-bridge.work',
    credoSso: 'https://inst-4e8870.api-bridge.work/$default',
    cMngt: 'https://inst-4e8870.api-bridge.work/$default',
    cStorage: 'https://inst-4e8870.api-bridge.work',
  },
  '409e36': {
    activityLogger: 'https://inst-4e8870.api-bridge.work',
    credoSso: 'https://inst-4e8870.api-bridge.work/$default',
    cMngt: 'https://inst-4e8870.api-bridge.work/$default',
    cStorage: 'https://inst-4e8870.api-bridge.work',
  },
};

export const targetConfigs: Record<string, Record<string, string>> = {
  '1786e4': {
    activityLogger: 'activity-logger',
    credoSso: 'credo-sso',
    cMngt: 'c-mngt',
    cStorage: 'c-storage',
  },
  '49a092': {
    activityLogger: 'activity-logger-stg',
    credoSso: 'credo-sso-stg',
    cMngt: 'c-mngt-stg',
    cStorage: 'c-storage-stg',
  },
  '409e36': {
    activityLogger: 'activity-logger-ridge',
    credoSso: 'credo-sso-ridge',
    cMngt: 'c-mngt-ridge',
    cStorage: 'c-storage-ridge',
  },
};

export const CREDO_GROUP_STORAGE_KEY = 'a9c55';

export function setCredoGroup(group: string): void {
  if (!group) return;

  const current = getEnvVar(CREDO_GROUP_STORAGE_KEY) || '-';
  if (current === group) return;

  setEnvVar(CREDO_GROUP_STORAGE_KEY, group);

  if (isBrowser() && group !== credoGroup) {
    setTimeout(() => {
      window.location.reload();
    }, 100);
  }
}

export const credoGroup = getEnvVar(CREDO_GROUP_STORAGE_KEY) || '__default__';

export const urls: Record<string, string> = configs[credoGroup] ?? {};

export const targets: Record<string, string> = targetConfigs[credoGroup] ?? {};
