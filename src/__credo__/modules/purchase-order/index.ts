import type { StorageAdapter } from '../core/types.js';
import { generateId } from '@credo/kits/string';
import { NotFoundError } from '../core/errors.js';
import {
  loadPartition,
  savePartition,
  queryPartitions,
  getCurrentPeriod,
  getPeriodRange,
  extractPeriodFromId,
} from '../core/partitioned.js';
import {
  validateCreateInput,
  checkDuplicateOrderNumber,
  buildPurchaseOrder,
  applyUpdate,
  validateStatusTransition,
  filterOrders,
} from './logic.js';
import type {
  PurchaseOrder,
  CreatePurchaseOrderInput,
  UpdatePurchaseOrderInput,
  PurchaseOrderFilter,
} from './types.js';

export type {
  PurchaseOrder,
  CreatePurchaseOrderInput,
  UpdatePurchaseOrderInput,
  PurchaseOrderFilter,
  PurchaseOrderItem,
  PurchaseOrderStatus,
} from './types.js';

export interface PurchaseOrderModuleConfig {
  storage: StorageAdapter;
  serviceCode: string;
  keyPrefix?: string;
}

export function createPurchaseOrderModule(config: PurchaseOrderModuleConfig) {
  const { storage, serviceCode, keyPrefix = 'purchase-orders' } = config;

  return {
    async getById(scope: string, id: string): Promise<PurchaseOrder | null> {
      const period = extractPeriodFromId(id);
      if (!period) return null;

      const items = await loadPartition<PurchaseOrder>(
        storage,
        serviceCode,
        keyPrefix,
        scope,
        period,
      );
      return items.find((o) => o.id === id) ?? null;
    },

    async create(scope: string, input: CreatePurchaseOrderInput): Promise<PurchaseOrder> {
      validateCreateInput(input);
      const period = getCurrentPeriod();
      const items = await loadPartition<PurchaseOrder>(
        storage,
        serviceCode,
        keyPrefix,
        scope,
        period,
      );
      checkDuplicateOrderNumber(items, input.orderNumber);

      const now = Date.now();
      const order = buildPurchaseOrder(generateId(), input, now);
      items.push(order);
      await savePartition(storage, serviceCode, keyPrefix, scope, period, items);
      return order;
    },

    async update(
      scope: string,
      id: string,
      input: UpdatePurchaseOrderInput,
    ): Promise<PurchaseOrder> {
      const period = extractPeriodFromId(id);
      if (!period) throw new NotFoundError('PurchaseOrder', id);

      const items = await loadPartition<PurchaseOrder>(
        storage,
        serviceCode,
        keyPrefix,
        scope,
        period,
      );
      const index = items.findIndex((o) => o.id === id);
      if (index === -1) throw new NotFoundError('PurchaseOrder', id);

      const current = items[index]!;

      if (input.status !== undefined) {
        validateStatusTransition(current.status, input.status);
      }

      const now = Date.now();
      const updated = applyUpdate(current, input, now);
      items[index] = updated;
      await savePartition(storage, serviceCode, keyPrefix, scope, period, items);
      return updated;
    },

    async close(scope: string, id: string): Promise<PurchaseOrder> {
      const period = extractPeriodFromId(id);
      if (!period) throw new NotFoundError('PurchaseOrder', id);

      const items = await loadPartition<PurchaseOrder>(
        storage,
        serviceCode,
        keyPrefix,
        scope,
        period,
      );
      const index = items.findIndex((o) => o.id === id);
      if (index === -1) throw new NotFoundError('PurchaseOrder', id);

      const current = items[index]!;
      validateStatusTransition(current.status, 'closed');

      const now = Date.now();
      const closed: PurchaseOrder = {
        ...current,
        status: 'closed',
        closedAt: now,
        updatedAt: now,
      };

      items[index] = closed;
      await savePartition(storage, serviceCode, keyPrefix, scope, period, items);
      return closed;
    },

    async query(scope: string, filter: PurchaseOrderFilter): Promise<PurchaseOrder[]> {
      let allOrders: PurchaseOrder[];

      if (filter.fromPeriod && filter.toPeriod) {
        const periods = getPeriodRange(filter.fromPeriod, filter.toPeriod);
        allOrders = await queryPartitions<PurchaseOrder>(
          storage,
          serviceCode,
          keyPrefix,
          scope,
          periods,
        );
      } else {
        const period = getCurrentPeriod();
        allOrders = await loadPartition<PurchaseOrder>(
          storage,
          serviceCode,
          keyPrefix,
          scope,
          period,
        );
      }

      return filterOrders(allOrders, filter);
    },
  };
}
