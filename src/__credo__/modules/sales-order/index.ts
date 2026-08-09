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
  checkDuplicateOrderNumber,
  buildSalesOrder,
  applyUpdate,
  filterOrders,
} from './logic.js';
import type {
  SalesOrder,
  CreateSalesOrderInput,
  UpdateSalesOrderInput,
  SalesOrderFilter,
} from './types.js';

export type {
  SalesOrder,
  CreateSalesOrderInput,
  UpdateSalesOrderInput,
  SalesOrderFilter,
  SalesOrderItem,
} from './types.js';

export interface SalesOrderModuleConfig {
  storage: StorageAdapter;
  serviceCode: string;
  keyPrefix?: string;
}

export function createSalesOrderModule(config: SalesOrderModuleConfig) {
  const { storage, serviceCode, keyPrefix = 'sales-orders' } = config;

  return {
    async getById(scope: string, id: string): Promise<SalesOrder | null> {
      const period = extractPeriodFromId(id);
      if (!period) return null;

      const items = await loadPartition<SalesOrder>(storage, serviceCode, keyPrefix, scope, period);
      return items.find((o) => o.id === id) ?? null;
    },

    async create(scope: string, input: CreateSalesOrderInput): Promise<SalesOrder> {
      validateCreateInput(input);
      const period = getCurrentPeriod();
      const items = await loadPartition<SalesOrder>(storage, serviceCode, keyPrefix, scope, period);
      checkDuplicateOrderNumber(items, input.orderNumber);

      const now = Date.now();
      const order = buildSalesOrder(generateId(), input, now);
      items.push(order);
      await savePartition(storage, serviceCode, keyPrefix, scope, period, items);
      return order;
    },

    async update(scope: string, id: string, input: UpdateSalesOrderInput): Promise<SalesOrder> {
      const period = extractPeriodFromId(id);
      if (!period) throw new NotFoundError('SalesOrder', id);

      const items = await loadPartition<SalesOrder>(storage, serviceCode, keyPrefix, scope, period);
      const { item, index } = findWithVersionCheck(items, id, input.version, 'SalesOrder');

      const now = Date.now();
      const updated = applyUpdate(item, input, now);

      if (input.isClosed === true) {
        updated.isClosed = true;
        updated.closedAt = now;
      } else if (input.isClosed === false) {
        updated.isClosed = false;
        updated.closedAt = undefined;
      }

      items[index] = updated;
      await savePartition(storage, serviceCode, keyPrefix, scope, period, items);
      return updated;
    },

    async query(scope: string, filter: SalesOrderFilter): Promise<SalesOrder[]> {
      let allOrders: SalesOrder[];

      if (filter.fromPeriod && filter.toPeriod) {
        const periods = getPeriodRange(filter.fromPeriod, filter.toPeriod);
        allOrders = await queryPartitions<SalesOrder>(
          storage,
          serviceCode,
          keyPrefix,
          scope,
          periods,
        );
      } else {
        const period = getCurrentPeriod();
        allOrders = await loadPartition<SalesOrder>(storage, serviceCode, keyPrefix, scope, period);
      }

      return filterOrders(allOrders, filter);
    },

    async querySync(
      scope: string,
      params: { fromPeriod: string; toPeriod: string; partitionHashes?: Record<string, string> },
    ): Promise<PartitionSyncResult<SalesOrder>> {
      const periods = getPeriodRange(params.fromPeriod, params.toPeriod);
      return queryPartitionsWithHashes<SalesOrder>(
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
