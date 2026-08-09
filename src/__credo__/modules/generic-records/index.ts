import type { StorageAdapter } from '../core/types.js';
import { generateId } from '@credo/kits/string';
import { findWithVersionCheck } from '../core/record-helpers.js';
import {
  getCurrentPeriod,
  getPeriodRange,
  loadPartition,
  queryPartitions,
  queryPartitionsWithHashes,
  savePartition,
  type PartitionSyncResult,
} from '../core/partitioned.js';
import { validateCreateInput, buildGenericRecord, applyUpdate, dayOf } from './logic.js';
import type {
  GenericRecord,
  CreateGenericRecordInput,
  UpdateGenericRecordInput,
  GenericRecordQueryFilter,
} from './types.js';

export type {
  GenericRecord,
  CreateGenericRecordInput,
  UpdateGenericRecordInput,
  GenericRecordQueryFilter,
} from './types.js';

export interface GenericRecordModuleConfig {
  storage: StorageAdapter;
  serviceCode: string;
  keyPrefix?: string;
}

export function createGenericRecordModule(config: GenericRecordModuleConfig) {
  const { storage, serviceCode, keyPrefix = 'generic-records' } = config;

  const partScope = (scope: string, recordType: string): string => `${scope}.${recordType}`;

  return {
    async query(scope: string, filter: GenericRecordQueryFilter): Promise<GenericRecord[]> {
      const scoped = partScope(scope, filter.recordType);
      if (filter.fromPeriod && filter.toPeriod) {
        const periods = getPeriodRange(filter.fromPeriod, filter.toPeriod);
        return queryPartitions<GenericRecord>(storage, serviceCode, keyPrefix, scoped, periods);
      }
      return loadPartition<GenericRecord>(
        storage,
        serviceCode,
        keyPrefix,
        scoped,
        getCurrentPeriod(),
      );
    },

    async querySync(
      scope: string,
      params: {
        recordType: string;
        fromPeriod: string;
        toPeriod: string;
        partitionHashes?: Record<string, string>;
      },
    ): Promise<PartitionSyncResult<GenericRecord>> {
      const periods = getPeriodRange(params.fromPeriod, params.toPeriod);
      return queryPartitionsWithHashes<GenericRecord>(
        storage,
        serviceCode,
        keyPrefix,
        partScope(scope, params.recordType),
        periods,
        params.partitionHashes ?? {},
      );
    },

    async create(scope: string, input: CreateGenericRecordInput): Promise<GenericRecord> {
      validateCreateInput(input);
      const scoped = partScope(scope, input.recordType.trim());
      const part = dayOf(input.recordDate);
      const items = await loadPartition<GenericRecord>(
        storage,
        serviceCode,
        keyPrefix,
        scoped,
        part,
      );

      const now = Date.now();
      const record = buildGenericRecord(generateId(), input, now);
      items.push(record);
      await savePartition(storage, serviceCode, keyPrefix, scoped, part, items);
      return record;
    },

    async update(
      scope: string,
      id: string,
      input: UpdateGenericRecordInput,
    ): Promise<GenericRecord> {
      const scoped = partScope(scope, input.recordType);
      const sourcePart = input.period;
      const items = await loadPartition<GenericRecord>(
        storage,
        serviceCode,
        keyPrefix,
        scoped,
        sourcePart,
      );
      const { item, index } = findWithVersionCheck(items, id, input.version, 'GenericRecord');

      const now = Date.now();
      const updated = applyUpdate(item, input, now);
      const targetDay = input.recordDate !== undefined ? dayOf(input.recordDate) : sourcePart;

      if (targetDay === sourcePart) {
        items[index] = updated;
        await savePartition(storage, serviceCode, keyPrefix, scoped, sourcePart, items);
        return updated;
      }

      items.splice(index, 1);
      await savePartition(storage, serviceCode, keyPrefix, scoped, sourcePart, items);

      const targetItems = await loadPartition<GenericRecord>(
        storage,
        serviceCode,
        keyPrefix,
        scoped,
        targetDay,
      );
      targetItems.push(updated);
      await savePartition(storage, serviceCode, keyPrefix, scoped, targetDay, targetItems);
      return updated;
    },

    async remove(
      scope: string,
      recordType: string,
      id: string,
      period: string,
      expectedVersion: string | undefined,
    ): Promise<void> {
      const scoped = partScope(scope, recordType);
      const items = await loadPartition<GenericRecord>(
        storage,
        serviceCode,
        keyPrefix,
        scoped,
        period,
      );
      const { index } = findWithVersionCheck(items, id, expectedVersion, 'GenericRecord');
      items.splice(index, 1);
      await savePartition(storage, serviceCode, keyPrefix, scoped, period, items);
    },
  };
}
