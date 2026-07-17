/**
 * Force a couple of extra page reloads right after login so the permission
 * cache is unquestionably rebuilt before the user touches the app.
 *
 * Why a brute-force double reload on top of the bootstrap pipeline? The
 * permission cache is resolved at module load and consumed at module level
 * (`getModulePermissions`, `NAV_PERMISSION_GATES`) — see `permissions.md`.
 * The first boot after login resolves the employee + writes the 4-layer `prm`,
 * but `appConfig.navigation` and route gates were already built off the
 * pre-resolve snapshot. The existing `first-resolve` reload handles the common
 * case; these deliberate post-login reloads are an extra safety net for the
 * slow paths (config-version bump landing concurrently, background record
 * revalidation swapping a fresher permissions version) where a single reload
 * can still race the rebuild. Two reloads, ~500 ms apart, give every async
 * cache writer time to settle.
 *
 * Mechanics mirror `pendingLoginLog`: a sessionStorage counter survives the
 * reloads (a reload wipes in-memory state), is tab-scoped (a fresh tab never
 * inherits a stale reload budget), and is age-capped so a boot that never
 * reaches a successful resolve doesn't strand a marker that reloads minutes
 * later. The counter is decremented synchronously on each tick, so the reload
 * count is hard-bounded regardless of timing.
 */

const KEY = 'cmngt.postLoginReloads';
const MAX_AGE_MS = 60_000; // 1 minute — comfortably covers two boot+reload cycles.

/** Spacing between the post-login reloads. Long enough for debounced cache
 *  writes (500 ms) and an overlapping config refresh to settle. */
export const POST_LOGIN_RELOAD_DELAY_MS = 500;

/** Default number of reloads requested at the login site. */
export const DEFAULT_POST_LOGIN_RELOADS = 2;

/**
 * Stamp the post-login reload budget. Called at every login site right after
 * `markPendingLogin`, before navigating to the app.
 */
export function markPostLoginReloads(count: number = DEFAULT_POST_LOGIN_RELOADS): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ remaining: count, at: Date.now() }));
  } catch {
    // Quota / disabled storage — login flow shouldn't break on a reload nicety.
  }
}

/**
 * Consume one reload from the post-login budget.
 *
 * Returns `true` when a reload is still owed (the caller should keep the
 * loading UI up and call `scheduleReload`), `false` when the budget is spent,
 * expired, or was never set. Decrements (and clears once exhausted) before
 * returning, so the reload count can never exceed the stamped budget no matter
 * how the boot races play out.
 */
export function tickPostLoginReload(): boolean {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { remaining?: number; at?: number };
    const remaining = typeof parsed.remaining === 'number' ? parsed.remaining : 0;

    // Age cap — a marker from a boot that never settled shouldn't reload the
    // app a minute later.
    const expired = typeof parsed.at === 'number' && Date.now() - parsed.at > MAX_AGE_MS;
    if (remaining <= 0 || expired) {
      sessionStorage.removeItem(KEY);
      return false;
    }

    const next = remaining - 1;
    if (next <= 0) {
      sessionStorage.removeItem(KEY);
    } else {
      // Preserve the original `at` so the age cap measures from login, not from
      // each tick — two reloads must fit inside one MAX_AGE_MS window.
      sessionStorage.setItem(KEY, JSON.stringify({ remaining: next, at: parsed.at }));
    }
    return true;
  } catch {
    return false;
  }
}
