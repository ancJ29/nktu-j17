

const KEY = 'cmngt.pendingLoginLog';
const MAX_AGE_MS = 60_000; 

export type LoginMethod = 'password' | 'qr';

export function markPendingLogin(method: LoginMethod) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ method, at: Date.now() }));
  } catch {
    // Quota / disabled storage — login flow shouldn't break on telemetry.
  }
}

export function consumePendingLogin(): LoginMethod | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    const parsed = JSON.parse(raw) as { method?: LoginMethod; at?: number };
    if (!parsed.method) return null;
    if (typeof parsed.at === 'number' && Date.now() - parsed.at > MAX_AGE_MS) return null;
    return parsed.method;
  } catch {
    return null;
  }
}
