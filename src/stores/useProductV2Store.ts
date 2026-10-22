import type { ProductV2Row } from '@/types';
import { credoSmeConnector } from '@credo/connectors/connector';
import { ONE_MINUTE } from '@credo/kits/time';
import { createEntityStore } from './createEntityStore';

type FlatUpdateBody = { version: string; expectedListHash?: string } & Record<string, unknown>;

type FlatCreateBody = { expectedListHash?: string } & Record<string, unknown>;

export const useProductV2Store = createEntityStore<ProductV2Row, FlatUpdateBody, FlatCreateBody>({
  cacheKey: 'prdv2.5c81df',
  cacheTTL: 10 * ONE_MINUTE,

  fetchAll: (hash) =>
    credoSmeConnector.getAllProducts(hash !== undefined ? { hash } : undefined).then((r) =>
      r.changed
        ? {
            items: (r.items ?? []) as ProductV2Row[],
            ...(r.hash !== undefined && { hash: r.hash }),
          }
        : null,
    ),

  create: (body) => {
    const { expectedListHash, ...item } = body;
    return credoSmeConnector.createProduct({ item, expectedListHash }).then((r) => ({
      item: r.item as ProductV2Row,
      ...(r.listHash !== undefined && { listHash: r.listHash }),
    }));
  },

  update: (id, body) => {
    const { version, expectedListHash, ...patch } = body;
    return credoSmeConnector.updateProduct({ id, version, patch, expectedListHash }).then((r) => ({
      item: r.item as ProductV2Row,
      ...(r.listHash !== undefined && { listHash: r.listHash }),
    }));
  },

  delete: (id, version, expectedListHash) =>
    credoSmeConnector
      .archiveProduct({ id, version, expectedListHash })
      .then((r) => ({ ...(r.listHash !== undefined && { listHash: r.listHash }) })),
});
