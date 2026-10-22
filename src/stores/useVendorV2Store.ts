import type { VendorV2Row } from '@/types';
import { credoSmeConnector } from '@credo/connectors/connector';
import { ONE_MINUTE } from '@credo/kits/time';
import { createEntityStore } from './createEntityStore';

type FlatUpdateBody = { version: string; expectedListHash?: string } & Record<string, unknown>;

type FlatCreateBody = { expectedListHash?: string } & Record<string, unknown>;

export const useVendorV2Store = createEntityStore<VendorV2Row, FlatUpdateBody, FlatCreateBody>({
  cacheKey: 'vndv2.3f71c2',
  cacheTTL: 10 * ONE_MINUTE,

  fetchAll: (hash) =>
    credoSmeConnector.getAllVendors(hash !== undefined ? { hash } : undefined).then((r) =>
      r.changed
        ? {
            items: (r.items ?? []) as VendorV2Row[],
            ...(r.hash !== undefined && { hash: r.hash }),
          }
        : null,
    ),

  create: (body) => {
    const { expectedListHash, ...item } = body;
    return credoSmeConnector.createVendor({ item, expectedListHash }).then((r) => ({
      item: r.item as VendorV2Row,
      ...(r.listHash !== undefined && { listHash: r.listHash }),
    }));
  },

  update: (id, body) => {
    const { version, expectedListHash, ...patch } = body;
    return credoSmeConnector.updateVendor({ id, version, patch, expectedListHash }).then((r) => ({
      item: r.item as VendorV2Row,
      ...(r.listHash !== undefined && { listHash: r.listHash }),
    }));
  },

  delete: (id, version, expectedListHash) =>
    credoSmeConnector
      .archiveVendor({ id, version, expectedListHash })
      .then((r) => ({ ...(r.listHash !== undefined && { listHash: r.listHash }) })),
});
