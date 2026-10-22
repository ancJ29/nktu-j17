import type { StorageAdapter } from '../core/types.js';
import { generateId } from '@credo/kits/string';
import { NotFoundError } from '../core/errors.js';
import { findWithVersionCheck } from '../core/record-helpers.js';
import {
  loadPartition,
  savePartition,
  queryPartitions,
  queryPartitionsWithHashes,
  getCurrentPeriod,
  getPeriodRange,
  extractPeriodFromId,
  type PartitionSyncResult,
} from '../core/partitioned.js';
import {
  validateCreateInput,
  checkDuplicateReceiptNumber,
  buildGoodsReceipt,
  applyUpdate,
  applyTransition,
  assertEditable,
  assertTransition,
  assertNoFieldEdits,
  filterReceipts,
} from './logic.js';
import type {
  GoodsReceipt,
  CreateGoodsReceiptInput,
  UpdateGoodsReceiptInput,
  GoodsReceiptFilter,
} from './types.js';

export type {
  GoodsReceipt,
  GoodsReceiptItem,
  GoodsReceiptItemType,
  GoodsReceiptStatus,
  CreateGoodsReceiptInput,
  UpdateGoodsReceiptInput,
  GoodsReceiptFilter,
} from './types.js';

export interface GoodsReceiptModuleConfig {
  storage: StorageAdapter;
  serviceCode: string;
  keyPrefix?: string;
}

export function createGoodsReceiptModule(config: GoodsReceiptModuleConfig) {
  const { storage, serviceCode, keyPrefix = 'goods-receipts' } = config;

  return {
    async getById(scope: string, id: string): Promise<GoodsReceipt | null> {
      const period = extractPeriodFromId(id);
      if (!period) return null;

      const items = await loadPartition<GoodsReceipt>(
        storage,
        serviceCode,
        keyPrefix,
        scope,
        period,
      );
      return items.find((r) => r.id === id) ?? null;
    },

    async create(scope: string, input: CreateGoodsReceiptInput): Promise<GoodsReceipt> {
      validateCreateInput(input);
      const period = getCurrentPeriod();
      const items = await loadPartition<GoodsReceipt>(
        storage,
        serviceCode,
        keyPrefix,
        scope,
        period,
      );
      checkDuplicateReceiptNumber(items, input.receiptNumber);

      const now = Date.now();
      const receipt = buildGoodsReceipt(generateId(), input, now);
      items.push(receipt);
      await savePartition(storage, serviceCode, keyPrefix, scope, period, items);
      return receipt;
    },

    async update(scope: string, id: string, input: UpdateGoodsReceiptInput): Promise<GoodsReceipt> {
      const period = extractPeriodFromId(id);
      if (!period) throw new NotFoundError('GoodsReceipt', id);

      const items = await loadPartition<GoodsReceipt>(
        storage,
        serviceCode,
        keyPrefix,
        scope,
        period,
      );
      const { item, index } = findWithVersionCheck(items, id, input.version, 'GoodsReceipt');

      const now = Date.now();
      const isTransition = input.status !== undefined && input.status !== item.status;

      let updated: GoodsReceipt;
      if (isTransition) {
        assertNoFieldEdits(input);
        assertTransition(item.status, input.status!);
        updated = applyTransition(item, input.status!, now);
      } else {
        assertEditable(item.status);
        updated = applyUpdate(item, input, now);
      }

      items[index] = updated;
      await savePartition(storage, serviceCode, keyPrefix, scope, period, items);
      return updated;
    },

    async query(scope: string, filter: GoodsReceiptFilter): Promise<GoodsReceipt[]> {
      let allReceipts: GoodsReceipt[];

      if (filter.fromPeriod && filter.toPeriod) {
        const periods = getPeriodRange(filter.fromPeriod, filter.toPeriod);
        allReceipts = await queryPartitions<GoodsReceipt>(
          storage,
          serviceCode,
          keyPrefix,
          scope,
          periods,
        );
      } else {
        const period = getCurrentPeriod();
        allReceipts = await loadPartition<GoodsReceipt>(
          storage,
          serviceCode,
          keyPrefix,
          scope,
          period,
        );
      }

      return filterReceipts(allReceipts, filter);
    },

    async querySync(
      scope: string,
      params: { fromPeriod: string; toPeriod: string; partitionHashes?: Record<string, string> },
    ): Promise<PartitionSyncResult<GoodsReceipt>> {
      const periods = getPeriodRange(params.fromPeriod, params.toPeriod);
      return queryPartitionsWithHashes<GoodsReceipt>(
        storage,
        serviceCode,
        keyPrefix,
        scope,
        periods,
        params.partitionHashes ?? {},
      );
    },
  };
}
