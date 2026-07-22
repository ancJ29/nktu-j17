/**
 * Flush pending cache writes, then reload the page after a short defer so any
 * in-flight async work (debounced `cacheSet` calls elsewhere, an overlapping
 * `refreshConfigFromBackend`, pending storage events) has a chance to settle
 * before the navigation fires. `cacheFlush()` is synchronous, but other
 * writers in the same task aren't.
 *
 * Default 100 ms covers normal reload paths (config save, permission rebuild).
 * Pass a longer delay for cases where the user should briefly perceive a
 * state change before the reload — e.g. the locked-account logout flash uses
 * 2000 ms so the auth-cleared screen renders before the navigation.
 */
import { cacheFlush } from '@/utils/appCache';
import { markCfgReady, markEmpReady } from '@/utils/bootState';
import { reloadPage } from '@credo/base-ui/utils';

export function scheduleReload(reason: string, delayMs: number = 100): void {
  cacheFlush();
  setTimeout(() => {
    if (!reloadPage(reason)) {
      // The reload-loop breaker suppressed it. Callers of scheduleReload leave
      // the boot gates unready on purpose ("a reload is coming") — with no
      // reload coming, release them: a rendered app beats a pinned spinner.
      markCfgReady();
      markEmpReady();
    }
  }, delayMs);
}
