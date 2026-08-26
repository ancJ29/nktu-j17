import type { LookupV2Row } from '@/types';
import { credoSmeConnector } from '@credo/connectors/connector';
import { ONE_MINUTE } from '@credo/kits/time';
import { createEntityStore } from './createEntityStore';

type FlatUpdateBody = { version: string; expectedListHash?: string } & Record<string, unknown>;

type FlatCreateBody = { expectedListHash?: string } & Record<string, unknown>;

export const useLookupV2Store = createEntityStore<LookupV2Row, FlatUpdateBody, FlatCreateBody>({
  cacheKey: 'lkpv2.6a8be4',
  cacheTTL: 10 * ONE_MINUTE,

  fetchAll: (hash) =>
    credoSmeConnector.getAllLookups(hash !== undefined ? { hash } : undefined).then((r) =>
      r.changed
        ? {
            items: (r.items ?? []) as LookupV2Row[],
            ...(r.hash !== undefined && { hash: r.hash }),
          }
        : null,
    ),

  create: (body) => {
    const { expectedListHash, ...item } = body;
    return credoSmeConnector.createLookup({ item, expectedListHash }).then((r) => ({
      item: r.item as LookupV2Row,
      ...(r.listHash !== undefined && { listHash: r.listHash }),
    }));
  },

  update: (id, body) => {
    const { version, expectedListHash, ...patch } = body;
    return credoSmeConnector.updateLookup({ id, version, patch, expectedListHash }).then((r) => ({
      item: r.item as LookupV2Row,
      ...(r.listHash !== undefined && { listHash: r.listHash }),
    }));
  },

  delete: (id, version, expectedListHash) =>
    credoSmeConnector
      .deleteLookup({ id, version, expectedListHash })
      .then((r) => ({ ...(r.listHash !== undefined && { listHash: r.listHash }) })),

  bulkUpsert: (items, expectedListHash) =>
    credoSmeConnector.importBatchLookups({ items, expectedListHash }).then((r) => ({
      created: r.created as LookupV2Row[],
      updated: r.updated as LookupV2Row[],
      errors: r.errors,
      summary: r.summary,
      ...(r.listHash !== undefined && { listHash: r.listHash }),
    })),
});
