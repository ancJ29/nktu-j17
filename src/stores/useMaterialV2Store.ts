import type { MaterialV2Row } from '@/types';
import { credoSmeConnector } from '@credo/connectors/connector';
import { ONE_MINUTE } from '@credo/kits/time';
import { createEntityStore } from './createEntityStore';

type FlatUpdateBody = { version: string; expectedListHash?: string } & Record<string, unknown>;

type FlatCreateBody = { expectedListHash?: string } & Record<string, unknown>;

export const useMaterialV2Store = createEntityStore<MaterialV2Row, FlatUpdateBody, FlatCreateBody>({
  cacheKey: 'matv2.7e2a04',
  cacheTTL: 10 * ONE_MINUTE,

  fetchAll: (hash) =>
    credoSmeConnector.getAllMaterials(hash !== undefined ? { hash } : undefined).then((r) =>
      r.changed
        ? {
            items: (r.items ?? []) as MaterialV2Row[],
            ...(r.hash !== undefined && { hash: r.hash }),
          }
        : null,
    ),

  create: (body) => {
    const { expectedListHash, ...item } = body;
    return credoSmeConnector.createMaterial({ item, expectedListHash }).then((r) => ({
      item: r.item as MaterialV2Row,
      ...(r.listHash !== undefined && { listHash: r.listHash }),
    }));
  },

  update: (id, body) => {
    const { version, expectedListHash, ...patch } = body;
    return credoSmeConnector.updateMaterial({ id, version, patch, expectedListHash }).then((r) => ({
      item: r.item as MaterialV2Row,
      ...(r.listHash !== undefined && { listHash: r.listHash }),
    }));
  },

  delete: (id, version, expectedListHash) =>
    credoSmeConnector
      .archiveMaterial({ id, version, expectedListHash })
      .then((r) => ({ ...(r.listHash !== undefined && { listHash: r.listHash }) })),
});
