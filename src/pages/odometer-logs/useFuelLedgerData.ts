import { useCallback, useEffect, useState } from 'react';
import { logger } from '@credo/base-ui/utils';
import {
  odometerFuelPaymentBundle,
  useOdometerFuelResetStore,
} from '@/stores/useOdometerFuelStores';
import { odometerLogBundle } from '@/stores/useOdometerLogStore';
import type { OdometerFuelPayment, OdometerFuelReset, OdometerLog } from '@/types';
import { dayToDate, FUEL_LEDGER_FLOOR } from './fuelLedgerModel';

export type LedgerData = { logs: OdometerLog[]; payments: OdometerFuelPayment[] };

export type FuelLedgerSource = {
  
  data: LedgerData | null;
  resets: OdometerFuelReset[];
  resetsError: boolean;
  loadFailed: boolean;
  retryResets: () => void;
  reload: () => void;
};

export function useFuelLedgerData(enabled: boolean): FuelLedgerSource {
  const resets = useOdometerFuelResetStore((s) => s.items);
  const resetsInitialized = useOdometerFuelResetStore((s) => s.initialized);
  const resetsError = useOdometerFuelResetStore((s) => s.error);
  const loadResets = useOdometerFuelResetStore((s) => s.loadAll);

  const [data, setData] = useState<LedgerData | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (enabled && !resetsInitialized && !resetsError) loadResets();
  }, [enabled, resetsInitialized, resetsError, loadResets]);

  useEffect(() => {
    
    
    if (!enabled || !resetsInitialized) return;
    let cancelled = false;
    
    
    const from = dayToDate(FUEL_LEDGER_FLOOR);
    const to = new Date();
    Promise.all([
      odometerLogBundle.queryRange(from, to),
      odometerFuelPaymentBundle.queryRange(from, to),
    ])
      .then(([logs, payments]) => {
        if (cancelled) return;
        setData({ logs, payments });
        setLoadFailed(false);
      })
      .catch((err) => {
        logger.error('Fuel ledger read failed:', err);
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, resetsInitialized, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  const retryResets = useCallback(() => loadResets(), [loadResets]);

  return { data, resets, resetsError: !!resetsError, loadFailed, retryResets, reload };
}
