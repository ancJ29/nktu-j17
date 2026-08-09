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
  checkDuplicateRequestNumber,
  buildDeliveryRequest,
  applyUpdate,
  filterRequests,
} from './logic.js';
import type {
  DeliveryRequest,
  CreateDeliveryRequestInput,
  UpdateDeliveryRequestInput,
  DeliveryRequestFilter,
} from './types.js';

export type {
  DeliveryRequest,
  CreateDeliveryRequestInput,
  UpdateDeliveryRequestInput,
  DeliveryRequestFilter,
  DeliveryRequestItem,
} from './types.js';

export interface DeliveryRequestModuleConfig {
  storage: StorageAdapter;
  serviceCode: string;
  keyPrefix?: string;
}

export function createDeliveryRequestModule(config: DeliveryRequestModuleConfig) {
  const { storage, serviceCode, keyPrefix = 'delivery-requests' } = config;

  return {
    async getById(scope: string, id: string): Promise<DeliveryRequest | null> {
      const period = extractPeriodFromId(id);
      if (!period) return null;

      const items = await loadPartition<DeliveryRequest>(
        storage,
        serviceCode,
        keyPrefix,
        scope,
        period,
      );
      return items.find((r) => r.id === id) ?? null;
    },

    async getByIds(scope: string, ids: string[]): Promise<DeliveryRequest[]> {
      if (ids.length === 0) return [];

      const idsByPeriod = new Map<string, Set<string>>();
      for (const id of ids) {
        const period = extractPeriodFromId(id);
        if (!period) continue;
        let bucket = idsByPeriod.get(period);
        if (!bucket) {
          bucket = new Set();
          idsByPeriod.set(period, bucket);
        }
        bucket.add(id);
      }
      if (idsByPeriod.size === 0) return [];

      const partitions = await Promise.all(
        Array.from(idsByPeriod, ([period, wanted]) =>
          loadPartition<DeliveryRequest>(storage, serviceCode, keyPrefix, scope, period).then(
            (items) => items.filter((r) => wanted.has(r.id)),
          ),
        ),
      );
      return partitions.flat();
    },

    async create(scope: string, input: CreateDeliveryRequestInput): Promise<DeliveryRequest> {
      validateCreateInput(input);
      const period = getCurrentPeriod();
      const items = await loadPartition<DeliveryRequest>(
        storage,
        serviceCode,
        keyPrefix,
        scope,
        period,
      );
      checkDuplicateRequestNumber(items, input.requestNumber);

      const now = Date.now();
      const request = buildDeliveryRequest(generateId(), input, now);
      items.push(request);
      await savePartition(storage, serviceCode, keyPrefix, scope, period, items);
      return request;
    },

    async update(
      scope: string,
      id: string,
      input: UpdateDeliveryRequestInput,
    ): Promise<DeliveryRequest> {
      const period = extractPeriodFromId(id);
      if (!period) throw new NotFoundError('DeliveryRequest', id);

      const items = await loadPartition<DeliveryRequest>(
        storage,
        serviceCode,
        keyPrefix,
        scope,
        period,
      );
      const { item, index } = findWithVersionCheck(items, id, input.version, 'DeliveryRequest');

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

    async query(scope: string, filter: DeliveryRequestFilter): Promise<DeliveryRequest[]> {
      let allRequests: DeliveryRequest[];

      if (filter.fromPeriod && filter.toPeriod) {
        const periods = getPeriodRange(filter.fromPeriod, filter.toPeriod);
        allRequests = await queryPartitions<DeliveryRequest>(
          storage,
          serviceCode,
          keyPrefix,
          scope,
          periods,
        );
      } else {
        const period = getCurrentPeriod();
        allRequests = await loadPartition<DeliveryRequest>(
          storage,
          serviceCode,
          keyPrefix,
          scope,
          period,
        );
      }

      return filterRequests(allRequests, filter);
    },

    async querySync(
      scope: string,
      params: { fromPeriod: string; toPeriod: string; partitionHashes?: Record<string, string> },
    ): Promise<PartitionSyncResult<DeliveryRequest>> {
      const periods = getPeriodRange(params.fromPeriod, params.toPeriod);
      return queryPartitionsWithHashes<DeliveryRequest>(
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
