export { createStorageAdapter } from './storage.js';
export {
  buildKey,
  loadItems,
  loadEnvelope,
  saveItems,
  saveItemsWithMeta,
  findWithVersionCheck,
  checkListVersion,
  checkListVersionTolerant,
} from './record-helpers.js';
export { generateId, newVersion } from '@credo/kits/string';
export {
  buildPartitionKey,
  getCurrentPeriod,
  getPeriodRange,
  loadPartition,
  loadPartitionEnvelope,
  savePartition,
  savePartitionWithMeta,
  queryPartitions,
  extractPeriodFromId,
} from './partitioned.js';
export {
  ModuleError,
  NotFoundError,
  ValidationError,
  VersionConflictError,
  ListVersionConflictError,
} from './errors.js';
export type {
  StorageAdapter,
  StorageMode,
  BaseModuleConfig,
  RecordMeta,
  RecordEnvelope,
} from './types.js';
