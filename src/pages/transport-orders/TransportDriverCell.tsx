import { Group, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { TransportOrder, TransportOrderTrip } from '@/types';
import { useTruckPlate } from './truckDisplay';
import { isExternalTruck } from './externalTruck';

export function TransportDriverCell({ order }: { order: TransportOrder }) {
  const { t } = useTranslation();
  const plateOf = useTruckPlate();

  if (order.isMultiTrip) {
    const trips = order.trips ?? [];
    return (
      <Stack gap={2}>
        <Text fz="xs" c="dimmed" fw={600}>
          {t('transportOrders.trips.badge', { n: trips.length })}
        </Text>
        {trips.map((trip, i) => (
          <LegDriver
            key={i}
            index={i}
            trip={trip}

            plate={trip.truckId ? plateOf(trip.truckId) : trip.truckPlate?.trim()}
          />
        ))}
      </Stack>
    );
  }

  return (
    <Stack gap={2}>
      <Text fz="sm" fw={500} lineClamp={1}>
        {order.driverName?.trim() || '—'}
      </Text>
      <Vehicle
        name={order.truckPlate}
        plate={plateOf(order.truckId)}
        external={isExternalTruck(order)}
      />
    </Stack>
  );
}

function LegDriver({
  index,
  trip,
  plate,
}: {
  index: number;
  trip: TransportOrderTrip;
  plate?: string;
}) {
  const driver = trip.driverName?.trim();
  return (
    <Group gap={4} wrap="nowrap" align="baseline">
      <Text fz="xs" fw={700} c="dimmed" style={{ flexShrink: 0 }}>
        {index + 1}.
      </Text>
      <Text fz="sm" lineClamp={1}>
        {driver || '—'}
        {plate && (
          <Text span fz="xs" c="dimmed" ff="monospace">
            {` · ${plate}`}
          </Text>
        )}
      </Text>
    </Group>
  );
}

function Vehicle({ name, plate, external }: { name?: string; plate?: string; external?: boolean }) {
  const { t } = useTranslation();
  const truckName = name?.trim();
  if (!truckName) return null;
  return (
    <Text fz="xs" c="dimmed" lineClamp={1}>
      {truckName}
      {plate && (
        <Text span ff="monospace">
          {` ${plate}`}
        </Text>
      )}
      {external && ` · ${t('transportOrders.form.externalTruck')}`}
    </Text>
  );
}
