import { cMngtConnector } from '@credo/connectors/connector';
import { cacheGet, cacheSet } from '@/utils/appCache';
import { resolveClientCode } from '@/config/client-code';
import { logger } from '@credo/base-ui/utils';
import type { CMngtMasterDataHashes } from '@credo/connectors/types';
import { DEFAULT_LOCATION_CODE, type Location, type LocationExtra } from '@/types';
import type { EntityStore } from './createEntityStore';
import { useEmployeeStore } from './useEmployeeStore';
import { useProductStore } from './useProductStore';
import { useCustomerStore } from './useCustomerStore';
import { useVendorStore } from './useVendorStore';
import { useLocationStore } from './useLocationStore';

let inflightPromise: Promise<void> | null = null;

export function loadAllMasterData(): Promise<void> {
  if (inflightPromise) return inflightPromise;
  inflightPromise = doLoad().finally(() => {
    inflightPromise = null;
  });
  return inflightPromise;
}

function readCachedHashes(clientCode: string): CMngtMasterDataHashes {
  const entry = cacheGet('mdh');

  if (!entry || entry.c !== clientCode) return {};
  return entry.h;
}

function saveHashes(clientCode: string, hashes: CMngtMasterDataHashes): void {
  cacheSet('mdh', { c: clientCode, h: hashes });
}

async function hydrateAllFromCache(): Promise<void> {
  await Promise.all([
    useEmployeeStore.getState().hydrateFromCache(),
    useProductStore.getState().hydrateFromCache(),
    useLocationStore.getState().hydrateFromCache(),
  ]);
}

function buildHashesToSend(cached: CMngtMasterDataHashes): CMngtMasterDataHashes {
  const out: CMngtMasterDataHashes = {};
  if (cached.employees && useEmployeeStore.getState().items.length > 0)
    out.employees = cached.employees;
  if (cached.products && useProductStore.getState().items.length > 0)
    out.products = cached.products;
  if (cached.locations && useLocationStore.getState().items.length > 0)
    out.locations = cached.locations;
  return out;
}

const HASH_KEY_TO_STORE: ReadonlyArray<
  [
    keyof CMngtMasterDataHashes,
    { getState: () => Pick<EntityStore<{ id: string }>, 'setListHash'> },
  ]
> = [
  ['employees', useEmployeeStore],
  ['products', useProductStore],
  ['locations', useLocationStore],
];

function applyListHashes(hashes: CMngtMasterDataHashes): void {
  for (const [key, store] of HASH_KEY_TO_STORE) {
    const h = hashes[key];
    if (h) store.getState().setListHash(h);
  }
}

async function doLoad(): Promise<void> {
  const vendorsReady = useVendorStore.getState().loadAll();
  const customersReady = useCustomerStore.getState().loadAll();

  await hydrateAllFromCache();

  const clientCode = resolveClientCode();
  const cachedHashes = readCachedHashes(clientCode);
  const toSend = buildHashesToSend(cachedHashes);

  try {
    const res = await cMngtConnector.getAllMasterData({
      ...(toSend.employees && { employeesHash: toSend.employees }),
      ...(toSend.products && { productsHash: toSend.products }),
      ...(toSend.locations && { locationsHash: toSend.locations }),
    });

    if (res.changed) {
      const u = res.updated;
      if (u.employees) useEmployeeStore.getState().setItems(u.employees as never[]);
      if (u.products) useProductStore.getState().setItems(u.products as never[]);
      if (u.locations) useLocationStore.getState().setItems(u.locations as never[]);
    }

    applyListHashes(res.hashes);

    saveHashes(clientCode, res.hashes);

    logger.debug('Master data: synced', {
      changed: res.changed,
      updatedKeys: res.changed ? Object.keys(res.updated) : [],
    });
  } catch (e) {
    logger.error('Failed to load master data', e);
    // Hydrated-from-cache state remains in place; individual list pages can
    // retry via their own `loadAll` / `forceRefresh`.
  } finally {
    ensureStoresInitialized();
  }

  void ensureDefaultLocation();

  await Promise.all([vendorsReady, customersReady]);
}

function ensureStoresInitialized(): void {
  initIfEmpty(useEmployeeStore);
  initIfEmpty(useProductStore);
  initIfEmpty(useCustomerStore);
  initIfEmpty(useVendorStore);
  initIfEmpty(useLocationStore);
}

function initIfEmpty<T extends { id: string }>(store: {
  getState: () => Pick<EntityStore<T>, 'initialized' | 'items' | 'setItems'>;
}): void {
  const state = store.getState();
  if (!state.initialized) state.setItems(state.items);
}

async function ensureDefaultLocation(): Promise<void> {
  const store = useLocationStore.getState();
  if (store.items.length > 0) return;
  try {
    const res = await cMngtConnector.createLocation<LocationExtra>({
      name: 'Default location',
      code: DEFAULT_LOCATION_CODE,
    });
    store.upsertItem(res.location as Location);
    logger.debug('Master data: seeded DEFAULT location');
  } catch (e) {
    logger.error('Failed to seed DEFAULT location', e);
  }
}
