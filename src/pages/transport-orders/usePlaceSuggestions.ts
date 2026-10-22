import { useEffect, useMemo, useState } from 'react';
import { logger } from '@credo/base-ui/utils';
import { ONE_MINUTE } from '@credo/kits/time';
import type { TransportOrder } from '@/types';
import { transportOrderBundle, useTransportOrderStore } from '@/stores/useTransportOrderStore';
import { useTransportRouteStore } from '@/stores/useTransportRouteStore';
import { collectTransportPlaces } from './placeSuggestions';

const PLACE_SUGGESTION_WINDOW_DAYS = 90;

const WINDOW_TTL = 10 * ONE_MINUTE;

let windowOrders: TransportOrder[] = [];
let windowAt = 0;
let inFlight: Promise<TransportOrder[]> | null = null;

function loadWindow(): Promise<TransportOrder[]> {
  if (inFlight) return inFlight;
  if (windowAt > 0 && Date.now() - windowAt < WINDOW_TTL) return Promise.resolve(windowOrders);

  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - PLACE_SUGGESTION_WINDOW_DAYS);

  inFlight = transportOrderBundle
    .queryRange(from, to)
    .then((items) => {
      windowOrders = items;
      windowAt = Date.now();
      return items;
    })
    .catch((err: unknown) => {
      logger.warn('[placeSuggestions] window read failed', err);
      return windowOrders;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

function mergeById(history: TransportOrder[], live: TransportOrder[]): TransportOrder[] {
  if (history.length === 0) return live;
  const byId = new Map(history.map((o) => [o.id, o]));
  for (const order of live) byId.set(order.id, order);
  return [...byId.values()];
}

export function usePlaceSuggestions(): string[] {
  const orders = useTransportOrderStore((s) => s.items);
  const routes = useTransportRouteStore((s) => s.items);
  const routesInit = useTransportRouteStore((s) => s.initialized);
  const loadRoutes = useTransportRouteStore((s) => s.loadAll);
  const [history, setHistory] = useState<TransportOrder[]>(windowOrders);

  useEffect(() => {
    if (!routesInit) loadRoutes();
  }, [routesInit, loadRoutes]);

  useEffect(() => {
    let alive = true;
    void loadWindow().then((items) => {
      if (alive) setHistory(items);
    });
    return () => {
      alive = false;
    };
  }, []);

  return useMemo(
    () => collectTransportPlaces(mergeById(history, orders), routes),
    [history, orders, routes],
  );
}
