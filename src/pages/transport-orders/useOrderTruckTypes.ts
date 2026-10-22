import { appConfig } from '@/config';
import type { LookupOption } from '@/hooks/useLookupV2Options';
import { useTruckTypeOptions } from '../transport-routes/truckType';
import { narrowTruckTypeOptions } from './orderTruckTypes';

export const ORDER_TRUCK_TYPES: readonly string[] =
  appConfig.features.transportOrders.orderTruckTypes ?? [];

export function useOrderTruckTypeOptions(): LookupOption[] {
  return narrowTruckTypeOptions(useTruckTypeOptions(), ORDER_TRUCK_TYPES);
}
