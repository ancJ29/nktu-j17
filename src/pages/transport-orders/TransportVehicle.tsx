import { IconTruck } from '@tabler/icons-react';
import { Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { EntityChip, EntityDash, LINK_ICON_SIZE, type LinkSize } from '@/components/EntityLink';
import { TruckLink } from '@/components/TruckLink';
import { isExternalTruck } from './externalTruck';

export function TransportVehicle({
  truckId,
  truckPlate,
  size = 'sm',
}: {
  readonly truckId?: string | null;
  readonly truckPlate?: string | null;
  readonly size?: LinkSize;
}) {
  if (!isExternalTruck({ truckId })) {
    return <TruckLink id={truckId} fallbackLabel={truckPlate} showPlate size={size} />;
  }
  return <ExternalTruckChip plate={truckPlate} size={size} />;
}

export function ExternalTruckChip({
  plate,
  size = 'sm',
}: {
  readonly plate?: string | null;
  readonly size?: LinkSize;
}) {
  const { t } = useTranslation();
  const value = plate?.trim();
  if (!value) return <EntityDash size={size} />;
  return (
    <EntityChip
      size={size}
      color="gray"
      lead={<IconTruck size={LINK_ICON_SIZE[size]} stroke={1.75} style={{ flexShrink: 0 }} />}
      label={
        <>
          {value}
          <Text span c="dimmed" fw={400}>
            {' · '}
            {t('transportOrders.form.externalTruck')}
          </Text>
        </>
      }
    />
  );
}
