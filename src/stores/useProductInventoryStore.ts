import type { ProductInventoryRow, ProductInventoryExtra } from '@/types';
import { cMngtConnector } from '@credo/connectors/connector';
import { createEntityStore } from './createEntityStore';
import { ONE_MINUTE } from '@credo/kits/time';

type ProductInventoryPatch = Omit<
  Parameters<typeof cMngtConnector.updateProductInventory<ProductInventoryExtra>>[0],
  'id'
>;

type ProductInventoryCreate = Parameters<
  typeof cMngtConnector.createProductInventory<ProductInventoryExtra>
>[0];

export const useProductInventoryStore = createEntityStore<
  ProductInventoryRow,
  ProductInventoryPatch,
  ProductInventoryCreate
>({
  
  cacheKey: 'pinv',
  cacheTTL: ONE_MINUTE,
  staleTime: ONE_MINUTE, 
  fetchAll: (hash) =>
    cMngtConnector
      .getAllProductInventory<ProductInventoryExtra>({ hash })
      .then((r) => (r.changed ? { items: r.productInventory, hash: r.hash } : null)),
  fetchOne: (id) =>
    cMngtConnector
      .getProductInventoryById<ProductInventoryExtra>({ id })
      .then((r) => r.entry as ProductInventoryRow),
  update: (id, patch) =>
    cMngtConnector
      .updateProductInventory<ProductInventoryExtra>({ id, ...patch })
      .then((r) => ({ item: r.entry as ProductInventoryRow, listHash: r.listHash })),
  create: (patch) =>
    cMngtConnector
      .createProductInventory<ProductInventoryExtra>(patch)
      .then((r) => ({ item: r.entry as ProductInventoryRow, listHash: r.listHash })),
  bulkUpsert: (items) =>
    cMngtConnector.importBatchProductInventory<ProductInventoryExtra>({ items }).then((r) => ({
      created: r.created as ProductInventoryRow[],
      updated: r.updated as ProductInventoryRow[],
      errors: r.errors,
      summary: r.summary,
      listHash: r.listHash,
    })),
});
