import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLookupV2Labels, useLookupV2Options } from '@/hooks/useLookupV2Options';
import type { LookupOption } from '@/hooks/useLookupOptions';
import type { TransportOrderShipmentType } from '@/types';

export const SHIPMENT_TYPE_CATEGORY = 'shipment-type';

const BUILT_IN_LABEL_KEYS = {
  import: 'transportOrders.shipmentType.import',
  export: 'transportOrders.shipmentType.export',
  domestic: 'transportOrders.shipmentType.domestic',
} as const;

export const FALLBACK_SHIPMENT_TYPES: readonly TransportOrderShipmentType[] =
  Object.keys(BUILT_IN_LABEL_KEYS);

export const DEFAULT_SHIPMENT_TYPE: TransportOrderShipmentType = 'import';

export type ShipmentTypeOption = LookupOption;

export function useShipmentTypeOptions(): ShipmentTypeOption[] {
  const { t } = useTranslation();
  const options = useLookupV2Options(SHIPMENT_TYPE_CATEGORY);
  return useMemo(() => {
    if (options.length > 0) return options;
    return Object.entries(BUILT_IN_LABEL_KEYS).map(([value, key]) => ({ value, label: t(key) }));
  }, [options, t]);
}

export function useShipmentTypeLabel(): (value: string | undefined) => string {
  const { t } = useTranslation();
  const labels = useLookupV2Labels(SHIPMENT_TYPE_CATEGORY);
  return (value) => {
    if (!value) return '';
    const configured = labels.get(value);
    if (configured) return configured;
    const builtIn = BUILT_IN_LABEL_KEYS[value as keyof typeof BUILT_IN_LABEL_KEYS];
    return builtIn ? t(builtIn) : value;
  };
}
