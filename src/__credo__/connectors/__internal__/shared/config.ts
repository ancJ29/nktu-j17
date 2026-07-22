import { getEnvVar, isBrowser, setEnvVar } from '@credo/kits/misc';

const configs: Record<string, Record<string, string>> = {
  c39c49: {
    activityLogger: 'https://d687fa1b765-c39c49.api-bridge.work',
    credoSso: 'https://credo-sso-c39c49.api-bridge.work/$default',
    cMngt: 'https://c-mngt-c39c49.api-bridge.work/$default',
    cStorage: 'https://c-storage-c39c49.api-bridge.work',
  },
  '12b1b2': {
    activityLogger: 'https://d687fa1b765-12b1b2.api-bridge.work',
    credoSso: 'https://credo-sso-12b1b2.api-bridge.work/$default',
    cMngt: 'https://c-mngt-12b1b2.api-bridge.work/$default',
    cStorage: 'https://c-storage-12b1b2.api-bridge.work',
  },
  '409e36': {
    activityLogger: 'https://d687fa1b765-409e36.api-bridge.work',
    credoSso: 'https://credo-sso-409e36.api-bridge.work/$default',
    cMngt: 'https://c-mngt-409e36.api-bridge.work/$default',
    cStorage: 'https://c-storage-409e36.api-bridge.work',
  },
  'mts-kappa': {
    credoSso: 'https://credo-sso-mts-kappa.api-bridge.work/$default',
    cStorage: 'https://c-storage-mts-kappa.api-bridge.work',
    cMarket: 'https://c-market-mts-kappa.api-bridge.work',
    cBot: 'https://c-bot-mts-kappa.api-bridge.work',
  },
  __default__: {
    credoSso: 'https://hgy5t5njm5.execute-api.ap-southeast-1.amazonaws.com/$default',
    cMngt: 'https://5sohakfena.execute-api.ap-southeast-1.amazonaws.com/$default',
    cStorage: 'https://c-storage-mts-kappa.api-bridge.work',
  },
};

export const CREDO_GROUP_STORAGE_KEY = '19c55230d1';

export function setCredoGroup(group: string): void {
  
  
  
  
  if (!group) return;

  if (group === 'ridge') {
    setCredoGroup('409e36');
    return;
  }

  const current = getEnvVar(CREDO_GROUP_STORAGE_KEY) || '-';
  if (current === group) return;

  setEnvVar(CREDO_GROUP_STORAGE_KEY, group);
  console.log('credoGroup', group);

  
  
  
  
  
  if (isBrowser() && group !== credoGroup) {
    setTimeout(() => {
      window.location.reload();
    }, 100);
  }
}

export const credoGroup = getEnvVar(CREDO_GROUP_STORAGE_KEY) || '__default__';

export const urls: Record<string, string> = configs[credoGroup] ?? {};
