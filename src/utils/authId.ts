/**
 * The credo-sme session handle, and getting it onto the connector.
 *
 * Its own module rather than a corner of `useAuthStore` because the two ends
 * have different lifetimes: the handle is **minted** by the two credo-sme login
 * pages, and **used** by the activity queue, which runs on every page of the
 * app. A store imported only by the login pages cannot restore it for the rest.
 *
 * Kept in its own `localStorage` slot rather than the auth blob
 * `createAuthStore` owns — that blob is a contract with the store, and a field
 * it does not know about is dropped by the next `saveAuthToStorage`.
 */

import { credoSmeConnector } from '@credo/connectors/connector';
import { readLegacyRefreshToken } from '@/stores/authStorage';

export const AUTH_ID_STORAGE_KEY = '__CREDO_AUTH_ID__';

type StoredAuthId = { authId?: string };

/**
 * Persist a freshly minted handle and put it on the connector.
 *
 * A response with no `authId` is not an error — minting is best-effort on the
 * BFF, so a login can succeed on the legacy token alone. Leave whatever was
 * there: it is either still valid or about to be replaced by the next login.
 *
 * **`authExpiresAt` is deliberately not stored.** See `restoreAuthId`.
 */
export function rememberAuthId(response: { authId?: string }): void {
  if (!response.authId) return;
  try {
    localStorage.setItem(AUTH_ID_STORAGE_KEY, JSON.stringify({ authId: response.authId }));
  } catch {
    // Quota or private mode: the session still works for this tab.
  }
  credoSmeConnector.setAuthId(response.authId);
}

/**
 * Put a previously stored handle back on the connector at boot.
 *
 * **No client-side expiry check, and its removal was the point (2026-08-21).**
 * This used to drop a handle whose stored `authExpiresAt` had passed. That was
 * sound while a session's expiry was fixed at login, and became wrong the day
 * credo-sme started renewing sessions on use: the server pushes expiry back a
 * week whenever a session is used inside its last three days, and **never tells
 * the browser** — the renewal happens while resolving some unrelated request.
 * So the stored value is a floor, not a deadline, and a client enforcing it
 * signs out users the server considers perfectly current.
 *
 * Nothing is lost by sending a dead handle: the server checks expiry on every
 * resolve, and a handle that does not resolve is treated exactly like a missing
 * one — every route that reads it still accepts the `x-client-code` it always
 * took. The old check bought one skipped header and cost a false logout.
 */
export function restoreAuthId(): void {
  try {
    const raw = localStorage.getItem(AUTH_ID_STORAGE_KEY);
    if (!raw) return;
    const stored = JSON.parse(raw) as StoredAuthId;
    if (!stored.authId) return;
    credoSmeConnector.setAuthId(stored.authId);
  } catch {
    // Unparseable or unavailable: carry on without a handle.
  }
}

/**
 * Drop the handle — the client half of logging out.
 *
 * **This is what ends the session from the browser's side, and it is enough.**
 * The record in c-storage is not deleted: it is keyed on the device, so the
 * next login overwrites it, and until then it expires on its own. A client
 * cannot revoke anything anyway — dropping its copy is the entire power it has.
 *
 * The connector is cleared in the same breath so a call made between logout and
 * the redirect cannot still carry the old handle and be attributed to the user
 * who just left.
 */
export function forgetAuthId(): void {
  try {
    localStorage.removeItem(AUTH_ID_STORAGE_KEY);
  } catch {
    // Nothing to do — the connector is cleared below either way.
  }
  credoSmeConnector.setAuthId('');
}

/** The stored handle, or `null`. Also the adoption's exit test. */
export function readAuthId(): string | null {
  try {
    const raw = localStorage.getItem(AUTH_ID_STORAGE_KEY);
    if (!raw) return null;
    return (JSON.parse(raw) as StoredAuthId).authId ?? null;
  } catch {
    return null;
  }
}

/**
 * Same-tab single-flight, held as the promise rather than a boolean so a second
 * caller can **await the first one's answer** instead of being turned away.
 * That is what lets the profile read wait for a handle that is already on its
 * way, rather than falling back to c-mngt because it asked a moment too early.
 *
 * Cross-tab is not coordinated here: two tabs adopting mint two handles for one
 * device record, last write wins, and the loser's handle resolves no session —
 * which every route already treats as "no session", not as an error.
 */
let adoption: Promise<string | null> | null = null;

/**
 * Give an already-signed-in browser an `authId` without asking for a password.
 *
 * @transitional c-mngt-session-adoption
 *
 * TODO: remove this and every other site tagged
 * `@transitional c-mngt-session-adoption` within 1 month of the production
 * deploy — target 2026-09-21. Grep `noted on` for the full set; it spans this
 * app, the credo-sme BFF and the connector.
 * noted on 2026-08-21
 *
 * **A date, not a condition, and that is deliberate.** The original retirement
 * rule was "a full refresh-token lifetime with no `sessionAdopted` log line" —
 * up to 180 days, measured by a counter with no durable sink that only ever
 * answers "since the last restart". A condition nobody can evaluate is not a
 * retirement plan, it is how transitional code becomes permanent. Past this
 * date, a browser that never adopted simply logs in again, which is a
 * one-time cost to a shrinking set of users and the thing this bridge was only
 * ever buying time against.
 *
 * **The deploy that moved logins onto credo-sme did not sign anyone out — and
 * that is exactly why this is needed.** Existing sessions kept working on their
 * c-mngt JWT pair, so they carry a refresh token and no handle. Nothing breaks
 * without one, which is the trap: `POST /activities` silently falls back to the
 * `actorId` the client claims, so the audit trail quietly keeps trusting the
 * browser for every user who did not happen to log in again. The gap closes on
 * its own eventually, one re-login at a time, and "eventually" is not a
 * property anyone can point at.
 *
 * Fire-and-forget by construction. Boot must not wait on it, and a failure must
 * not be visible: the session it is upgrading is working fine, and the worst
 * outcome of doing nothing is the behaviour we already had.
 *
 * **Every guard here is an exit, not an error.** No refresh token means nobody
 * is signed in; no device id means the record has no key to live under (the
 * BFF would answer 200 and mint nothing, which is the silent half-success worth
 * refusing up front); an existing handle means this already ran.
 *
 * A 401 is the expected ending for a browser idle past its refresh lifetime.
 * It is swallowed on purpose: that user is about to be sent to `/login` by the
 * ordinary session machinery, and will get a handle from the login itself.
 *
 * **Retirement.** The route logs `sessionAdopted` on every call. When a full
 * refresh-token lifetime has passed with none, every browser that could use
 * this has upgraded or expired — and this function, its connector method and
 * the route go together.
 */
export function adoptSessionIfNeeded(input: AdoptionInput): void {
  void ensureAuthId(input);
}

/**
 * What an adoption needs.
 *
 * `refreshToken` is optional and defaults to whatever is in appCache: the value
 * lives under a known key (`authStorage.readLegacyRefreshToken`), so adoption
 * never needed a store to hand it over. Callers may still pass one explicitly —
 * the login pages know theirs before it has been persisted.
 */
export type AdoptionInput = {
  refreshToken?: string | null | undefined;
  serviceCode: string;
  deviceId: string;
};

/**
 * The handle for this browser, adopting one if there is none yet.
 *
 * `null` means "this browser cannot have a handle right now" — not signed in,
 * no device id, credo-sso declined, or the service was unreachable. Callers
 * must treat that as *unknown*, never as *rejected*: it is the difference
 * between falling back to the old path and signing the user out.
 */
export async function ensureAuthId(input: AdoptionInput): Promise<string | null> {
  const existing = readAuthId();
  if (existing) {
    // A previous page load stored it but this process may not have put it on
    // the connector yet — cheap to redo, and wrong to assume.
    credoSmeConnector.setAuthId(existing);
    return existing;
  }
  const refreshToken = input.refreshToken ?? readLegacyRefreshToken();
  if (!refreshToken || !input.serviceCode || !input.deviceId) return null;
  adoption ??= runAdoption({ ...input, refreshToken });
  return adoption;
}

async function runAdoption(input: AdoptionInput): Promise<string | null> {
  try {
    const response = await credoSmeConnector.adoptSession({
      refreshToken: input.refreshToken as string,
      serviceCode: input.serviceCode,
    });
    // `rememberAuthId` ignores a response with no `authId`, so a 200 that
    // minted nothing leaves the browser exactly as it was.
    rememberAuthId(response);
    return response.authId ?? null;
  } catch {
    // Declined, unreachable, or not deployed here. The session in hand is
    // untouched and the next boot tries again.
    return null;
  } finally {
    // Released so a later boot — or a later profile read — can retry. Holding
    // it would turn one offline moment into a tab that never adopts.
    adoption = null;
  }
}
