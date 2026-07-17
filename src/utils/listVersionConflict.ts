

import { CallApiError } from '@credo/connectors/connector';
import type { CMngtMasterDataHashes } from '@credo/connectors/types';
import { cacheGet } from '@/utils/appCache';

type HashStore = { getState: () => { hash: string | null } };

export function readListHash(
  store: HashStore,
  mdhKey: keyof CMngtMasterDataHashes,
): string | undefined {
  const fromStore = store.getState().hash;
  if (fromStore) return fromStore;
  const mdh = cacheGet('mdh');
  return mdh?.h?.[mdhKey];
}

export function isListVersionConflict(err: unknown): err is CallApiError {
  if (!(err instanceof CallApiError) || err.status !== 409) return false;
  const p = err.payload;
  return (
    typeof p === 'object' &&
    p !== null &&
    (p as { code?: unknown }).code === 'LIST_VERSION_CONFLICT'
  );
}
