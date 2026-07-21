import { useState } from 'react';
import { ActionIcon, Box, Group, Stack, Text } from '@mantine/core';
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { TransportOrder } from '@/types';
import { formatDateTime } from '@/utils/dateFormat';
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
    const stops = (
      [
        [order.route?.pickup, order.route?.pickupAt],
        [order.route?.stuffing, order.route?.stuffingAt],
        [order.route?.dropoff, order.route?.dropoffAt],
      ] as const
    )
      .map(([place, at]) => ({ place: typeof place === 'string' ? place.trim() : '', at }))
      .filter((s) => s.place);
    
    
    
    
    const scheduled = stops.some((s) => s.at);
    return (
      <Stack gap={2}>
        {scheduled ? (
          <Stack gap={0}>
            {stops.map((s, i) => (
              <Group key={i} gap={6} wrap="nowrap" align="baseline">
                <Text fz="sm" fw={500} lineClamp={1}>
                  {i > 0 && (
                    <Text span c="dimmed">
                      {'→ '}
                    </Text>
                  )}
                  {s.place}
                </Text>
                {s.at && (
                  <Text fz="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                    {formatDateTime(s.at)}
                  </Text>
                )}
              </Group>
            ))}
          </Stack>
        ) : (
          <Text fz="sm" fw={500} lineClamp={2}>
            {stops.map((s) => s.place).join(' → ') || '—'}
          </Text>
        )}
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
              {/* The leg's estimated slots, indented with its vehicle — one line
                  for both ends, since on a leg they read as a span. */}
              <Box pl="md">
                {(trip.loadingAt || trip.unloadingAt) && (
                  <Text fz="xs" c="dimmed" lineClamp={1}>
                    {[trip.loadingAt, trip.unloadingAt]
                      .map((v) => (v ? formatDateTime(v) : '?'))
                      .join(' → ')}
                  </Text>
                )}
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
