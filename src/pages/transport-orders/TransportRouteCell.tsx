import { useState } from 'react';
import { ActionIcon, Box, Group, Stack, Text } from '@mantine/core';
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { TransportOrder } from '@/types';
import { useTruckPlate } from './truckDisplay';

function VehicleLines({
  truckName,
  plate,
  driverName,
}: {
  truckName?: string;
  plate?: string;
  driverName?: string;
}) {
  const name = truckName?.trim();
  return (
    <>
      {name && (
        <Text fz="xs" lineClamp={1}>
          <Text span fw={500}>
            {name}
          </Text>
          {plate && (
            <Text span c="dimmed">
              {` ${plate}`}
            </Text>
          )}
        </Text>
      )}
      {driverName?.trim() && (
        <Text fz="xs" c="dimmed" fs="italic" lineClamp={1}>
          {driverName.trim()}
        </Text>
      )}
    </>
  );
}

export function TransportRouteCell({ order }: { order: TransportOrder }) {
  const { t } = useTranslation();
  const plateOf = useTruckPlate();
  const [expanded, setExpanded] = useState(true);

  if (!order.isMultiTrip) {
    const points = [order.route?.pickup, order.route?.stuffing, order.route?.dropoff]
      .map((p) => p?.trim())
      .filter(Boolean);
    return (
      <Stack gap={2}>
        <Text fz="sm" fw={500} lineClamp={2}>
          {points.join(' → ') || '—'}
        </Text>
        <VehicleLines
          truckName={order.truckPlate}
          plate={plateOf(order.truckId)}
          driverName={order.driverName}
        />
      </Stack>
    );
  }

  const trips = order.trips ?? [];
  const first = trips[0]?.departure?.trim();
  const last = trips[trips.length - 1]?.destination?.trim();
  const summary = [first, '...', last].filter(Boolean).join(' → ');

  return (
    <Group gap={4} wrap="nowrap" align="flex-start">
      <ActionIcon
        size="sm"
        variant="subtle"
        color="gray"
        onClick={(e) => {
          e.stopPropagation();
          setExpanded((v) => !v);
        }}
        aria-label={t(expanded ? 'transportOrders.route.collapse' : 'transportOrders.route.expand')}
      >
        {expanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
      </ActionIcon>
      {expanded ? (
        <Stack gap={6} style={{ minWidth: 0 }}>
          {trips.map((trip, i) => (
            <Box key={i}>
              <Group gap={6} wrap="nowrap" align="baseline">
                <Text fz="sm" fw={700} c="dimmed">
                  {i + 1}.
                </Text>
                <Text fz="sm" fw={500} lineClamp={1}>
                  {[trip.departure?.trim(), trip.destination?.trim()].filter(Boolean).join(' → ') ||
                    '—'}
                </Text>
              </Group>
              {/* Truck + driver indented under the leg they belong to. */}
              <Box pl="md">
                <VehicleLines
                  truckName={trip.truckPlate}
                  plate={plateOf(trip.truckId)}
                  driverName={trip.driverName}
                />
              </Box>
            </Box>
          ))}
        </Stack>
      ) : (
        <Text fz="sm" lineClamp={2}>
          <Text span fw={500}>
            {summary}
          </Text>{' '}
          <Text span c="dimmed" fs="italic">
            {t('transportOrders.route.tripTotal', { count: trips.length })}
          </Text>
        </Text>
      )}
    </Group>
  );
}
