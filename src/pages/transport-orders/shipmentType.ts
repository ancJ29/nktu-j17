import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TransportOrderShipmentType } from '@/types';

export const TRANSPORT_ORDER_SHIPMENT_TYPES: readonly TransportOrderShipmentType[] = [
  'import',
  'export',
  'domestic',
];

export type ShipmentTypeOption = { value: TransportOrderShipmentType; label: string };

export function useShipmentTypeOptions(): ShipmentTypeOption[] {
  const { t } = useTranslation();
  return useMemo(
    () =>
      TRANSPORT_ORDER_SHIPMENT_TYPES.map((value) => ({
        value,
        label: t(`transportOrders.shipmentType.${value}`),
      })),
    [t],
  );
}
