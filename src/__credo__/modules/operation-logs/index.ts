import type { StorageAdapter } from '../core/types.js';
import { generateId } from '@credo/kits/string';
import { findWithVersionCheck } from '../core/record-helpers.js';
import { loadPartition, savePartition } from '../core/partitioned.js';
import {
  validateCreateInput,
  buildOperationLog,
  applyUpdate,
  partitionId,
  yearOf,
} from './logic.js';
import type { OperationLog, CreateOperationLogInput, UpdateOperationLogInput } from './types.js';

export type {
  OperationLog,
  CreateOperationLogInput,
  UpdateOperationLogInput,
  OperationLogFilter,
} from './types.js';

export interface OperationLogModuleConfig {
  storage: StorageAdapter;
  serviceCode: string;
  keyPrefix?: string;
}

export function createOperationLogModule(config: OperationLogModuleConfig) {
  const { storage, serviceCode, keyPrefix = 'operation-logs' } = config;

  async function getByTarget(
    scope: string,
    targetId: string,
    period: string,
  ): Promise<OperationLog[]> {
    return loadPartition<OperationLog>(
      storage,
      serviceCode,
      keyPrefix,
      scope,
      partitionId(targetId, period),
    );
  }

  return {
    getByTarget,

    async create(scope: string, input: CreateOperationLogInput): Promise<OperationLog> {
      validateCreateInput(input);
      const part = partitionId(input.targetId, yearOf(input.logDate));
      const items = await loadPartition<OperationLog>(storage, serviceCode, keyPrefix, scope, part);

      const now = Date.now();
      const entry = buildOperationLog(generateId(), input, now);
      items.push(entry);
      await savePartition(storage, serviceCode, keyPrefix, scope, part, items);
      return entry;
    },

    async update(scope: string, id: string, input: UpdateOperationLogInput): Promise<OperationLog> {
      const sourcePart = partitionId(input.targetId, input.period);
      const items = await loadPartition<OperationLog>(
        storage,
        serviceCode,
        keyPrefix,
        scope,
        sourcePart,
      );
      const { item, index } = findWithVersionCheck(items, id, input.version, 'OperationLog');

      const now = Date.now();
      const updated = applyUpdate(item, input, now);
      const targetYear = input.logDate !== undefined ? yearOf(input.logDate) : input.period;

      if (targetYear === input.period) {
        items[index] = updated;
        await savePartition(storage, serviceCode, keyPrefix, scope, sourcePart, items);
        return updated;
      }

      items.splice(index, 1);
      await savePartition(storage, serviceCode, keyPrefix, scope, sourcePart, items);

      const targetPart = partitionId(input.targetId, targetYear);
      const targetItems = await loadPartition<OperationLog>(
        storage,
        serviceCode,
        keyPrefix,
        scope,
        targetPart,
      );
      targetItems.push(updated);
      await savePartition(storage, serviceCode, keyPrefix, scope, targetPart, targetItems);
      return updated;
    },

    async remove(
      scope: string,
      id: string,
      targetId: string,
      period: string,
      expectedVersion: string | undefined,
    ): Promise<void> {
      const part = partitionId(targetId, period);
      const items = await loadPartition<OperationLog>(storage, serviceCode, keyPrefix, scope, part);
      const { index } = findWithVersionCheck(items, id, expectedVersion, 'OperationLog');
      items.splice(index, 1);
      await savePartition(storage, serviceCode, keyPrefix, scope, part, items);
    },
  };
}
