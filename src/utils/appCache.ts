

import { createAppCache } from '@credo/base-ui/utils';
import type { CMngtMasterDataHashes } from '@credo/connectors/types';
import type { PartialPermissions } from '@/types/permissions';

export type AppCacheData = {
  
  
  
  
  

  
  
  
  
  
  

  
  cfg?: unknown;
  
  crt?: number;
  
  auth?: Record<string, unknown>;
  
  zap?: unknown;
  
  prm?: unknown;
  
  prv?: { cfg?: string; emp?: string };
  
  emo?: { o?: PartialPermissions; v?: string };
  
  usr?: {
    shared?: Record<string, unknown>;
    pc?: Record<string, unknown>;
    mobile?: Record<string, unknown>;
  };
  
  mdh?: { c: string; h: CMngtMasterDataHashes };
  // `vmg` / `cmg` (vendors-/customers-migrated flags) lived here 2026-07-14 only
  // — both one-time migration runtimes were retired with their dedicated
  // backends. Stale entries in deployed browsers are inert (nothing reads them).
};

const appCache = createAppCache<AppCacheData>({
  storageKey: '72e8a',
  timestampKey: '769ee14d',
});

export const initAppCache = appCache.init;
export const cacheGet = appCache.get;
export const cacheSet = appCache.set;
export const cacheClear = appCache.clear;
export const cacheReset = appCache.reset;
export const cacheFlush = appCache.flush;
