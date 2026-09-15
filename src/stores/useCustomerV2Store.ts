import type { CustomerV2Row } from '@/types';
import { credoSmeConnector } from '@credo/connectors/connector';
import { ONE_MINUTE } from '@credo/kits/time';
import { createEntityStore } from './createEntityStore';

type FlatUpdateBody = { version: string; expectedListHash?: string } & Record<string, unknown>;

type FlatCreateBody = { expectedListHash?: string } & Record<string, unknown>;

export const useCustomerV2Store = createEntityStore<CustomerV2Row, FlatUpdateBody, FlatCreateBody>({
  cacheKey: 'custv2.9b04ea',
  cacheTTL: 10 * ONE_MINUTE,

  fetchAll: (hash) =>
    credoSmeConnector.getAllCustomers(hash !== undefined ? { hash } : undefined).then((r) =>
      r.changed
        ? {
            items: (r.items ?? []) as CustomerV2Row[],
            ...(r.hash !== undefined && { hash: r.hash }),
          }
        : null,
    ),

  create: (body) => {
    const { expectedListHash, ...item } = body;
    return credoSmeConnector.createCustomer({ item, expectedListHash }).then((r) => ({
      item: r.item as CustomerV2Row,
      ...(r.listHash !== undefined && { listHash: r.listHash }),
    }));
  },

  update: (id, body) => {
    const { version, expectedListHash, ...patch } = body;
    return credoSmeConnector.updateCustomer({ id, version, patch, expectedListHash }).then((r) => ({
      item: r.item as CustomerV2Row,
      ...(r.listHash !== undefined && { listHash: r.listHash }),
    }));
  },

  delete: (id, version, expectedListHash) =>
    credoSmeConnector
      .archiveCustomer({ id, version, expectedListHash })
      .then((r) => ({ ...(r.listHash !== undefined && { listHash: r.listHash }) })),
});
