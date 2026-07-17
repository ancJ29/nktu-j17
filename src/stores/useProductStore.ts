import type { Product } from '@/types';
import { cMngtConnector } from '@credo/connectors/connector';
import { createEntityStore } from './createEntityStore';
import { ONE_MINUTE } from '@credo/kits/time';

type ProductPatch = Omit<Parameters<typeof cMngtConnector.updateProduct>[0], 'id'>;

export const useProductStore = createEntityStore<Product, ProductPatch>({
  cacheKey: 'prd',
  cacheTTL: 10 * ONE_MINUTE,
  fetchAll: (hash) =>
    cMngtConnector
      .getAllProducts({ hash })
      .then((r) => (r.changed ? { items: r.products, hash: r.hash } : null)),
  fetchOne: (id) => cMngtConnector.getProductById({ id }).then((r) => r.product as Product),
  update: (id, patch) =>
    cMngtConnector
      .updateProduct({ id, ...patch })
      .then((r) => ({ item: r.product as Product, listHash: r.listHash })),
  delete: (id, version, expectedListHash) =>
    cMngtConnector
      .deleteProduct({ id, version, expectedListHash })
      .then((r) => ({ listHash: r.listHash })),
});
