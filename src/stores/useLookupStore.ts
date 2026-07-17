

import type { Lookup } from '@/types';
import { cMngtConnector } from '@credo/connectors/connector';
import { createEntityStore } from './createEntityStore';
import { ONE_MINUTE } from '@credo/kits/time';

type LookupPatch = Omit<Parameters<typeof cMngtConnector.updateLookup>[0], 'id'>;

export const useLookupStore = createEntityStore<Lookup, LookupPatch>({
  cacheKey: 'lkp',
  cacheTTL: 10 * ONE_MINUTE,
  fetchAll: (hash) =>
    cMngtConnector
      .getAllLookups({ hash })
      .then((r) => (r.changed ? { items: r.lookups as Lookup[], hash: r.hash } : null)),
  fetchOne: (id) => cMngtConnector.getLookupById({ id }).then((r) => r.lookup as Lookup),
  update: (id, patch) =>
    cMngtConnector
      .updateLookup({ id, ...patch })
      .then((r) => ({ item: r.lookup as Lookup, listHash: r.listHash })),
  delete: (id, version, expectedListHash) =>
    cMngtConnector
      .deleteLookup({ id, version, expectedListHash })
      .then((r) => ({ listHash: r.listHash })),
});
