import { isLocalhost } from '@credo/kits/misc';
import { getEnvVar } from './config';
import { logger } from './logger';

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const RELOAD_GUARD_KEY = '__credo_reload_guard__';
const RELOAD_GUARD_WINDOW_MS = 60_000;
const RELOAD_GUARD_MAX = 5;

type ReloadGuard = { count: number; firstAt: number };

function readReloadGuard(): ReloadGuard | null {
  try {
    const raw = sessionStorage.getItem(RELOAD_GUARD_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ReloadGuard>;
    if (typeof parsed?.count !== 'number' || typeof parsed?.firstAt !== 'number') return null;
    return { count: parsed.count, firstAt: parsed.firstAt };
  } catch {
    return null;
  }
}

export function resetReloadGuard(): void {
  try {
    sessionStorage.removeItem(RELOAD_GUARD_KEY);
  } catch {
    // sessionStorage unavailable — the guard is best-effort by design
  }
}

function chargeReloadBudget(): boolean {
  try {
    const now = Date.now();
    const guard = readReloadGuard();
    const fresh = !guard || now - guard.firstAt > RELOAD_GUARD_WINDOW_MS;
    const next: ReloadGuard = fresh
      ? { count: 1, firstAt: now }
      : { ...guard, count: guard.count + 1 };
    sessionStorage.setItem(RELOAD_GUARD_KEY, JSON.stringify(next));
    return next.count <= RELOAD_GUARD_MAX;
  } catch {
    return true;
  }
}

export function reloadPage(reason?: string): boolean {
  if (isLocalhost()) {
    try {
      if (getEnvVar('RELOAD_PAGE_ALERT') === 'true') {
        alert(reason ? `reload the page due to ${reason}!` : 'reload the page!');
      }
    } catch (e) {
      logger.error('[RELOAD-PAGE] alert error', e);
    }
  }

  if (!chargeReloadBudget()) {
    console.error(
      `[RELOAD-PAGE] reload loop detected (>${RELOAD_GUARD_MAX} reloads in ${
        RELOAD_GUARD_WINDOW_MS / 1000
      }s) — suppressing reload for "${reason ?? 'unknown'}". Close and reopen the tab to reset.`,
    );
    return false;
  }

  setTimeout(() => {
    window.location.reload();
  }, 100);
  return true;
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
    const registrations = (await navigator.serviceWorker?.getRegistrations()) ?? [];
    await Promise.all(registrations.map((r) => r.unregister()));
  } catch (e) {
    logger.error('[CLEAR-CACHE] serviceWorker', e);
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
