import { isLocalhost } from '@credo/kits/misc';
import { getEnvVar } from './config';
import { logger } from './logger';

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function reloadPage(reason?: string) {
  if (isLocalhost()) {
    try {
      if (getEnvVar('RELOAD_PAGE_ALERT') === 'true') {
        alert(reason ? `reload the page due to ${reason}!` : 'reload the page!');
      }
    } catch (e) {
      logger.error('[RELOAD-PAGE] alert error', e);
    }
  }
  setTimeout(() => {
    window.location.reload();
  }, 100);
}

export async function clearAllCache(): Promise<void> {
  try {
    localStorage.clear();
  } catch (e) {
    logger.error('[CLEAR-CACHE] localStorage', e);
  }

  try {
    sessionStorage.clear();
  } catch (e) {
    logger.error('[CLEAR-CACHE] sessionStorage', e);
  }

  
  
  
  try {
    const idb = globalThis.indexedDB;
    const list = typeof idb?.databases === 'function' ? await idb.databases() : [];
    await Promise.all(
      list.map((info) =>
        info.name
          ? new Promise<void>((resolve) => {
              const req = idb.deleteDatabase(info.name!);
              req.onsuccess = () => resolve();
              req.onerror = () => {
                logger.error('[CLEAR-CACHE] idb delete', info.name, req.error);
                resolve();
              };
              req.onblocked = () => {
                logger.warn('[CLEAR-CACHE] idb delete blocked', info.name);
                resolve();
              };
            })
          : Promise.resolve(),
      ),
    );
  } catch (e) {
    logger.error('[CLEAR-CACHE] indexedDB', e);
  }

  
  try {
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch (e) {
    logger.error('[CLEAR-CACHE] caches', e);
  }

  
  try {
    for (const pair of document.cookie.split(';')) {
      const name = pair.split('=')[0]?.trim();
      if (!name) continue;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    }
  } catch (e) {
    logger.error('[CLEAR-CACHE] cookies', e);
  }
}
