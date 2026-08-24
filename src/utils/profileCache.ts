import { entityCacheClear, entityCacheGet, entityCacheSet } from '@/utils/entityCache';
import type { CredoSmeGetMeResponse } from '@credo/connectors/types';

const CACHE_KEY = 'prf';

type CachedProfile = {
  a: string;
  d: CredoSmeGetMeResponse;
  t: number;
};

export async function readCachedProfile(handle: string): Promise<CredoSmeGetMeResponse | null> {
  if (!handle) return null;
  try {
    const entry = await entityCacheGet<CachedProfile>(CACHE_KEY);
    if (!entry || entry.a !== handle) return null;
    return entry.d ?? null;
  } catch {
    return null;
  }
}

export function writeCachedProfile(handle: string, profile: CredoSmeGetMeResponse): void {
  if (!handle) return;
  void entityCacheSet<CachedProfile>(CACHE_KEY, { a: handle, d: profile, t: Date.now() }).catch(
    () => undefined,
  );
}

export function clearCachedProfile(): void {
  void entityCacheClear(CACHE_KEY).catch(() => undefined);
}
