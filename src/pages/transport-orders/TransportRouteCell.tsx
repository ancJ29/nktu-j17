import { useState } from 'react';
import { ActionIcon, Box, Group, Stack, Text } from '@mantine/core';
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { TransportOrder } from '@/types';

const ORIGIN_MIN_WIDTH = 104;

function placeList(places: Array<string | undefined>): string[] {
  return places.map((place) => place?.trim() ?? '').filter((place) => place.length > 0);
}

function RouteLine({ stops }: { stops: string[] }) {
  const [origin, ...rest] = stops;
  const destination = rest.pop();

  return (
    <Group gap={6} wrap="nowrap" align="baseline" title={stops.join(' › ')}>
      <Text fz="sm" fw={500} lineClamp={1} miw={ORIGIN_MIN_WIDTH}>
        {origin || '—'}
      </Text>
      {destination && (
        <Text fz="sm" lineClamp={1} style={{ flex: 1, minWidth: 0 }}>
          {/* Intermediate stops stay on the line — dimmed and unweighted, so the
              two endpoints read first without the stuffing point being hidden. */}
          {rest.map((stop) => (
            <Text key={stop} span c="dimmed">
              {`› ${stop} `}
            </Text>
          ))}
          <Text span c="dimmed">
            {'› '}
          </Text>
          <Text span fw={500}>
            {destination}
          </Text>
        </Text>
      )}
    </Group>
  );
}

export function TransportRouteCell({ order }: { order: TransportOrder }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  if (!order.isMultiTrip) {
    return (
      <RouteLine
        stops={placeList([order.route?.pickup, order.route?.stuffing, order.route?.dropoff])}
      />
    );
  }

  const trips = order.trips ?? [];
  const first = trips[0]?.departure?.trim();
  const last = trips[trips.length - 1]?.destination?.trim();
  const summary = [first, '...', last].filter(Boolean).join(' › ');

  return (
    <Group gap={4} wrap="nowrap" align="flex-start">
      <ActionIcon
        size="sm"
        variant="subtle"
        color="gray"
        aria-label={t(expanded ? 'transportOrders.route.collapse' : 'transportOrders.route.expand')}
        onClick={(e) => {
          e.stopPropagation();
          setExpanded((v) => !v);
        }}
      >
        {expanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
      </ActionIcon>
      {expanded ? (
        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
          {trips.map((trip, i) => (
            <Group key={i} gap={6} wrap="nowrap" align="baseline">
              <Text fz="sm" fw={700} c="dimmed" w={16} style={{ flexShrink: 0 }}>
                {i + 1}.
              </Text>
              <Box style={{ flex: 1, minWidth: 0 }}>
                <RouteLine stops={placeList([trip.departure, trip.destination])} />
              </Box>
            </Group>
          ))}
        </Stack>
      ) : (
        <Text fz="sm" lineClamp={1} style={{ flex: 1, minWidth: 0 }}>
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
