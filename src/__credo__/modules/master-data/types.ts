import type { RecordMeta } from '../core/types.js';

export const ENTITY_PREFIXES = ['employees', 'products', 'locations', 'lookups'] as const;

export type EntityName = (typeof ENTITY_PREFIXES)[number];

export type MasterDataHashes = Partial<Record<EntityName, string>>;

export type MasterDataCache = Partial<Record<EntityName, unknown[]>> & {
  hashes: MasterDataHashes;
  meta: RecordMeta;
};
