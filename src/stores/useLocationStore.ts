import type { Location, LocationExtra } from '@/types';
import { cMngtConnector } from '@credo/connectors/connector';
import { createEntityStore } from './createEntityStore';
import { ONE_MINUTE } from '@credo/kits/time';

type LocationPatch = Omit<Parameters<typeof cMngtConnector.updateLocation<LocationExtra>>[0], 'id'>;

export const useLocationStore = createEntityStore<Location, LocationPatch>({
  cacheKey: 'loc',
  cacheTTL: 10 * ONE_MINUTE,
  fetchAll: (hash) =>
    cMngtConnector
      .getAllLocations<LocationExtra>({ hash })
      .then((r) => (r.changed ? { items: r.locations, hash: r.hash } : null)),
  fetchOne: (id) =>
    cMngtConnector.getLocationById<LocationExtra>({ id }).then((r) => r.location as Location),
  update: (id, patch) =>
    cMngtConnector
      .updateLocation<LocationExtra>({ id, ...patch })
      .then((r) => ({ item: r.location as Location, listHash: r.listHash })),
  delete: (id, version, expectedListHash) =>
    cMngtConnector
      .deleteLocation({ id, version, expectedListHash })
      .then((r) => ({ listHash: r.listHash })),
});
