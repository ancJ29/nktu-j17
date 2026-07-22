import { clearAllCache, reloadPage } from '@credo/base-ui/utils';
import { CREDO_GROUP_STORAGE_KEY } from '@credo/connectors/connector';
import { CLIENT_CODE_STORAGE_KEY } from '@/config/client-code';
import { API_GROUP_STORAGE_KEY } from '@/config/env';

const BOOT_CRITICAL_KEYS = [
  CLIENT_CODE_STORAGE_KEY,
  API_GROUP_STORAGE_KEY,
  CREDO_GROUP_STORAGE_KEY,
];

export async function forceClearCache(
  reason = 'force clear cache',
  afterClear?: () => void,
): Promise<void> {
  const saved = BOOT_CRITICAL_KEYS.map((key) => [key, localStorage.getItem(key)] as const);

  await clearAllCache();

  for (const [key, value] of saved) {
    if (value !== null) localStorage.setItem(key, value);
  }
  afterClear?.();

  reloadPage(reason);
}
