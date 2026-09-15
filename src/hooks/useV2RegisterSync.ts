import { useEffect } from 'react';
import { resolveClientCode } from '@/config/client-code';
import { createRegisterSync, type SyncedRegister, type SyncedSet } from '@/stores/v2RegisterSync';
import { useCustomerV2Store } from '@/stores/useCustomerV2Store';
import { useLookupV2Store } from '@/stores/useLookupV2Store';
import { useMaterialInventoryV2Store } from '@/stores/useMaterialInventoryV2Store';
import { useMaterialV2Store } from '@/stores/useMaterialV2Store';
import { useProductInventoryV2Store } from '@/stores/useProductInventoryV2Store';
import { useProductV2Store } from '@/stores/useProductV2Store';
import { useVendorV2Store } from '@/stores/useVendorV2Store';
import { cacheGet, cacheSet } from '@/utils/appCache';
import { featureFlags } from '@/utils/features';

export const V2_SYNC_INTERVAL_MS = 60_000;

const sync = createRegisterSync(
  {
    products: { store: () => useProductV2Store, enabled: () => featureFlags.productsV2.enabled },
    materials: { store: () => useMaterialV2Store, enabled: () => featureFlags.materialsV2.enabled },
    vendors: { store: () => useVendorV2Store, enabled: () => featureFlags.vendorsV2.enabled },
    customers: { store: () => useCustomerV2Store, enabled: () => featureFlags.customersV2.enabled },
    lookups: { store: () => useLookupV2Store, enabled: () => featureFlags.lookupV2.enabled },
    productInventory: {
      store: () => useProductInventoryV2Store,
      enabled: () => featureFlags.productsV2.enabled && featureFlags.productsV2.inventory,
    },
    materialInventory: {
      store: () => useMaterialInventoryV2Store,
      enabled: () => featureFlags.materialsV2.enabled && featureFlags.materialsV2.inventory,
    },
  },
  {
    read: () => cacheGet('v2s') as SyncedSet | null | undefined,
    write: (value) => cacheSet('v2s', value satisfies { c: string; r: SyncedRegister[] }),
  },
);

export function useV2RegisterSync(): void {
  useEffect(() => {
    const clientCode = resolveClientCode();
    const stopWatching = sync.watch(clientCode);

    const tick = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      void sync.tick(clientCode);
    };
    tick();
    const interval = setInterval(tick, V2_SYNC_INTERVAL_MS);
    const onVisible = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      stopWatching();
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
}
