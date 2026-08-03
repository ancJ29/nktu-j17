import { getEnvVar, isBrowser, setEnvVar } from '@credo/kits/misc';

const configs: Record<string, Record<string, string>> = {
  '1786e3': {
    activityLogger: 'https://d687fa1b765-1786e3.api-bridge.work',
    credoSso: 'https://credo-sso-1786e3.api-bridge.work/$default',
    cMngt: 'https://c-mngt-1786e3.api-bridge.work/$default',
    cStorage: 'https://c-storage-1786e3.api-bridge.work',
  },
  '49d092': {
    activityLogger: 'https://d687fa1b765-49d092.api-bridge.work',
    credoSso: 'https://credo-sso-49d092.api-bridge.work/$default',
    cMngt: 'https://c-mngt-49d092.api-bridge.work/$default',
    cStorage: 'https://c-storage-49d092.api-bridge.work',
  },
  '22ac97': {
    activityLogger: 'https://d687fa1b765-22ac97.api-bridge.work',
    credoSso: 'https://credo-sso-22ac97.api-bridge.work/$default',
    cMngt: 'https://c-mngt-22ac97.api-bridge.work/$default',
    cStorage: 'https://c-storage-22ac97.api-bridge.work',
  },
  'mts-kappa': {
    credoSso: 'https://credo-sso-mts-kappa.api-bridge.work/$default',
    cStorage: 'https://c-storage-mts-kappa.api-bridge.work',
    cMarket: 'https://c-market-mts-kappa.api-bridge.work',
    cBot: 'https://c-bot-mts-kappa.api-bridge.work',
  },
};

export const CREDO_GROUP_STORAGE_KEY = '19c55230d1';

export function setCredoGroup(group: string): void {
  if (!group) return;

  if (group === 'ridge' || group === '409e36') {
    setCredoGroup('22ac97');
    return;
  }

  if (group === '12b1b2') {
    setCredoGroup('49d092');
    return;
  }

  if (group === 'c39c49') {
    setCredoGroup('1786e3');
    return;
  }

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
