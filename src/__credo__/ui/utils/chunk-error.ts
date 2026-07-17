import { logger } from './logger';

const STATE_KEY = '__chunk_reload_state__';

const BUST_PARAM = '__r';

const FRESH_WINDOW_MS = 5 * 60_000;

type ReloadState = { stage: number; at: number };

function readState(): ReloadState | null {
  try {
    const raw = sessionStorage.getItem(STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ReloadState;
    if (typeof parsed?.stage !== 'number' || typeof parsed?.at !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeState(state: ReloadState): void {
  try {
    sessionStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    // sessionStorage unavailable (private mode quirks) — without the guard we
    // could loop, so fall through; the worst case is a second reload attempt.
  }
}

async function dropServiceWorkerState(): Promise<void> {
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch (e) {
    logger.error('[chunk-reload] cache clear failed', e);
  }
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch (e) {
    logger.error('[chunk-reload] SW unregister failed', e);
  }
}

function reloadCacheBusted(): void {
  const url = new URL(window.location.href);
  url.searchParams.set(BUST_PARAM, String(Date.now()));
  window.location.replace(url.toString());
}

function recover(event: Event): boolean {
  const now = Date.now();
  const prev = readState();
  const stage = prev && now - prev.at < FRESH_WINDOW_MS ? prev.stage : 0;

  logger.warn('[chunk-reload] dynamic import failed (stage', stage, ')', event);

  
  const soon = (fn: () => void) => setTimeout(fn, 100);

  if (stage === 0) {
    writeState({ stage: 1, at: now });
    soon(() => window.location.reload());
    return true;
  }

  if (stage === 1) {
    writeState({ stage: 2, at: now });
    void dropServiceWorkerState().finally(() => soon(() => window.location.reload()));
    return true;
  }

  if (stage === 2) {
    
    
    
    writeState({ stage: 3, at: now });
    soon(reloadCacheBusted);
    return true;
  }

  
  
  
  logger.error('[chunk-reload] gave up after soft + hard + cache-busted reload; surfacing error');
  return false;
}

export function isChunkLoadError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : String(error ?? '');
  return (
    /Failed to fetch dynamically imported module/i.test(message) || 
    /error loading dynamically imported module/i.test(message) || 
    /Importing a module script failed/i.test(message) || 
    /Unable to preload CSS/i.test(message) // Vite's CSS preload helper
  );
}

export function clearChunkReloadParam(): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has(BUST_PARAM)) return;
  url.searchParams.delete(BUST_PARAM);
  window.history.replaceState(window.history.state, '', url.toString());
}

export function installChunkErrorReload(): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('vite:preloadError', (event) => {
    
    
    
    
    
    
    
    if (recover(event)) event.preventDefault();
  });
}
