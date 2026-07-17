

import { cMngtConnector } from '@credo/connectors/connector';
import type { CMngtSingleRecordTarget } from '@credo/connectors/types';
import { createEntityStore } from './createEntityStore';

export type SingleRecordRow = { id: string; version: string } & Record<string, unknown>;

type FlatUpdateBody = { version: string; expectedListHash?: string } & Record<string, unknown>;

type FlatCreateBody = { expectedListHash?: string } & Record<string, unknown>;

export type SingleRecordsStoreConfig = {
  
  entity: string;
  
  uniqueField?: string | string[];
  
  cacheKey: string;
  cacheTTL?: number;
  staleTime?: number;
};

export function createSingleRecordsStore<T extends SingleRecordRow>(
  config: SingleRecordsStoreConfig,
) {
  const { entity, uniqueField, cacheKey, cacheTTL, staleTime } = config;

  
  const target: CMngtSingleRecordTarget = {
    entity,
    ...(uniqueField !== undefined && { uniqueField }),
  };

  return createEntityStore<T, FlatUpdateBody, FlatCreateBody>({
    cacheKey,
    ...(cacheTTL !== undefined && { cacheTTL }),
    ...(staleTime !== undefined && { staleTime }),

    fetchAll: (hash) =>
      cMngtConnector
        .getAllSingleRecords(target, hash !== undefined ? { hash } : undefined)
        .then((r) =>
          r.changed
            ? { items: (r.items ?? []) as T[], ...(r.hash !== undefined && { hash: r.hash }) }
            : null,
        ),

    fetchOne: (id) => cMngtConnector.getSingleRecordById(target, { id }).then((r) => r.item as T),

    create: (body) => {
      const { expectedListHash, ...item } = body;
      return cMngtConnector.createSingleRecord(target, { item, expectedListHash }).then((r) => ({
        item: r.item as T,
        ...(r.listHash !== undefined && { listHash: r.listHash }),
      }));
    },

    update: (id, body) => {
      const { version, expectedListHash, ...patch } = body;
      return cMngtConnector
        .updateSingleRecord(target, { id, version, patch, expectedListHash })
        .then((r) => ({
          item: r.item as T,
          ...(r.listHash !== undefined && { listHash: r.listHash }),
        }));
    },

    delete: (id, version, expectedListHash) =>
      cMngtConnector
        .deleteSingleRecord(target, { id, version, expectedListHash })
        .then((r) => ({ ...(r.listHash !== undefined && { listHash: r.listHash }) })),

    bulkUpsert: (items) =>
      cMngtConnector.importBatchSingleRecords(target, { items }).then((r) => ({
        created: r.created as T[],
        updated: r.updated as T[],
        errors: r.errors,
        summary: r.summary,
        ...(r.listHash !== undefined && { listHash: r.listHash }),
      })),
  });
}
