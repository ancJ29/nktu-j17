import { useEffect, useState } from 'react';
import { appConfig } from '@/config';
import { ROUTES } from '@/constants/routes';
import type { TransportOrder } from '@/types';
import { isMultiDropType, parseLocations, type LocationProvince } from './multiDrop';

export const MULTI_DROP_TRUCK_TYPES: readonly string[] =
  appConfig.features.transportOrders.multiDropTruckTypes ?? [];

export function transportOrderNewPath(truckType: string | null | undefined): string {
  if (!truckType) return ROUTES.TRANSPORT_ORDERS.NEW;
  const base = isMultiDropType(truckType, MULTI_DROP_TRUCK_TYPES)
    ? ROUTES.TRANSPORT_ORDERS.NEW_MULTI_DROP
    : ROUTES.TRANSPORT_ORDERS.NEW;
  return `${base}?truckType=${encodeURIComponent(truckType)}`;
}

export function transportOrderCopyPath(order: Pick<TransportOrder, 'extra'>): string {
  return isMultiDropType(order.extra?.truckType, MULTI_DROP_TRUCK_TYPES)
    ? ROUTES.TRANSPORT_ORDERS.NEW_MULTI_DROP
    : ROUTES.TRANSPORT_ORDERS.NEW;
}

export function transportOrderEditPath(order: Pick<TransportOrder, 'id' | 'extra'>): string {
  const route = isMultiDropType(order.extra?.truckType, MULTI_DROP_TRUCK_TYPES)
    ? ROUTES.TRANSPORT_ORDERS.EDIT_MULTI_DROP
    : ROUTES.TRANSPORT_ORDERS.EDIT;
  return route.replace(':id', order.id);
}

type LocationsState = { provinces: LocationProvince[]; loading: boolean; failed: boolean };

let locationsPromise: Promise<LocationProvince[]> | null = null;

function loadLocations(): Promise<LocationProvince[]> {
  locationsPromise ??= fetch(`${import.meta.env.BASE_URL}data/locations.json`)
    .then((res) => {
      if (!res.ok) throw new Error(`locations.json ${res.status}`);
      return res.json();
    })
    .then(parseLocations)
    .catch((err: unknown) => {
      locationsPromise = null;
      throw err;
    });
  return locationsPromise;
}

export function useLocations(): LocationsState {
  const [state, setState] = useState<LocationsState>({
    provinces: [],
    loading: true,
    failed: false,
  });
  useEffect(() => {
    let alive = true;
    loadLocations().then(
      (provinces) => alive && setState({ provinces, loading: false, failed: false }),
      () => alive && setState({ provinces: [], loading: false, failed: true }),
    );
    return () => {
      alive = false;
    };
  }, []);
  return state;
}
