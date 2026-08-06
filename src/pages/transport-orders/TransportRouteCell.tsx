import { Fragment, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import { ActionIcon, Box, Group, Stack, Text } from '@mantine/core';
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { DateTimeInput } from '@credo/kits/types';
import type { TransportOrder } from '@/types';
import { formatDateTime, formatTime } from '@/utils/dateFormat';

const ORIGIN_MIN_WIDTH = 104;

type RouteStop = { place: string; at?: DateTimeInput };

function stopList(stops: Array<{ place?: string; at?: DateTimeInput }>): RouteStop[] {
  return stops
    .map((stop) => ({ place: stop.place?.trim() ?? '', at: stop.at }))
    .filter((stop) => stop.place.length > 0);
}

function StopCell({
  stop,
  strong,
  dimmed,
  style,
}: {
  readonly stop: RouteStop;
  readonly strong?: boolean;
  readonly dimmed?: boolean;
  readonly style?: CSSProperties;
}) {
  const time = formatTime(stop.at);

  return (
    <Stack
      gap={0}
      style={style}
      title={time ? `${stop.place} — ${formatDateTime(stop.at)}` : undefined}
    >
      <Text fz="sm" fw={strong ? 500 : undefined} c={dimmed ? 'dimmed' : undefined} lineClamp={1}>
        {stop.place}
      </Text>
      {time && (
        <Text fz="xs" c="dimmed" ff="monospace" fw="bold" lineClamp={1}>
          {time}
        </Text>
      )}
    </Stack>
  );
}

function Arrow() {
  return (
    <Text fz="sm" c="dimmed" style={{ flexShrink: 0 }}>
      ›
    </Text>
  );
}

function RouteLine({ stops, suffix }: { stops: RouteStop[]; suffix?: ReactNode }) {
  const [origin, ...rest] = stops;
  const destination = rest.pop();

  return (
    <Group gap={6} wrap="nowrap" align="flex-start" title={stops.map((s) => s.place).join(' › ')}>
      <StopCell stop={origin ?? { place: '—' }} strong style={{ minWidth: ORIGIN_MIN_WIDTH }} />
      {destination && (
        <Group gap={6} wrap="nowrap" align="flex-start" style={{ flex: 1, minWidth: 0 }}>
          {/* Intermediate stops stay on the line — dimmed and unweighted, so the
              two endpoints read first without the stuffing point being hidden. */}
          {rest.map((stop, i) => (
            <Fragment key={`${stop.place}-${i}`}>
              <Arrow />
              <StopCell stop={stop} dimmed style={{ minWidth: 0 }} />
            </Fragment>
          ))}
          <Arrow />
          <StopCell stop={destination} strong style={{ flex: 1, minWidth: 0 }} />
          {suffix}
        </Group>
      )}
    </Group>
  );
}

export function TransportRouteCell({
  order,
  expanded = false,
  onToggle,
}: {
  readonly order: TransportOrder;
  readonly expanded?: boolean;
  readonly onToggle?: () => void;
}) {
  const { t } = useTranslation();

  const toggle = (e: MouseEvent) => {
    e.stopPropagation();
    onToggle?.();
  };

  if (!order.isMultiTrip) {
    return (
      <RouteLine
        stops={stopList([
          { place: order.route?.pickup, at: order.route?.pickupAt },
          { place: order.route?.stuffing, at: order.route?.stuffingAt },
          { place: order.route?.dropoff, at: order.route?.dropoffAt },
        ])}
      />
    );
  }

  const trips = order.trips ?? [];
  const firstLeg = trips[0];
  const lastLeg = trips[trips.length - 1];

  const summaryStops = [
    ...stopList([{ place: firstLeg?.departure, at: firstLeg?.loadingAt }]),
    ...(trips.length > 1 ? [{ place: '...' }] : []),
    ...stopList([{ place: lastLeg?.destination, at: lastLeg?.unloadingAt }]),
  ];

  return (
    <Group gap={4} wrap="nowrap" align="flex-start" onClick={toggle}>
      <ActionIcon
        size="sm"
        variant="subtle"
        color="gray"
        aria-label={t(expanded ? 'transportOrders.route.collapse' : 'transportOrders.route.expand')}
        onClick={toggle}
      >
        {expanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
      </ActionIcon>
      {expanded ? (
        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
          {trips.map((trip, i) => (
            <Group key={i} gap={6} wrap="nowrap" align="flex-start">
              <Text fz="sm" fw={700} c="dimmed" w={16} style={{ flexShrink: 0 }}>
                {i + 1}.
              </Text>
              <Box style={{ flex: 1, minWidth: 0 }}>
                <RouteLine
                  stops={stopList([
                    { place: trip.departure, at: trip.loadingAt },
                    { place: trip.destination, at: trip.unloadingAt },
                  ])}
                />
              </Box>
            </Group>
          ))}
        </Stack>
      ) : (
        <Box style={{ flex: 1, minWidth: 0 }}>
          <RouteLine
            stops={summaryStops}
            suffix={
              <Text fz="sm" c="dimmed" fs="italic" style={{ flexShrink: 0 }}>
                {t('transportOrders.route.tripTotal', { count: trips.length })}
              </Text>
            }
          />
        </Box>
      )}
    </Group>
  );
}
