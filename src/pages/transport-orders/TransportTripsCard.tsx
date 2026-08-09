import { Card, Divider, Group, Stack, Table, Text } from '@mantine/core';
import { IconRoute } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { device } from '@credo/base-ui/utils';
import { SectionCard } from '@/components/SectionCard';
import { EmployeeLink } from '@/components/EmployeeLink';
import { TruckLink } from '@/components/TruckLink';
import { FieldRow } from '@/components/FieldRow';
import { formatDate, formatDateTime } from '@/utils/dateFormat';
import { perms } from '@/utils/permission';
import type { TransportOrder, TransportOrderTrip } from '@/types';
import { formatMoney, orderTripLaborTotal } from './transportOrderPricing';

const isMobile = device.isMobile;
const canViewPrice = perms.transportOrder.canViewPrice();
// A phone spends its width on content, not on card gutters.
const cardPadding = isMobile ? 'sm' : 'lg';

/**
 * DANH SÁCH CHẶNG — the legs of a multi-trip job, read-only, above the fold.
 *
 * **Not inline-editable, for the same reason money isn't:** the legs feed
 * `buildTransportOrderWrite`'s mirror onto the order-level date/truck/driver/route,
 * so a shallow-merge patch of `trips` would leave every one of those pointing at a
 * leg that no longer exists. Editing legs goes through the form, which re-derives.
 *
 * ## Why the shape is per-device (2026-08-09)
 *
 * A leg carries **seven** facts. On desktop that is a table, and the table is the
 * right answer: legs are compared against each other (which one is late, which
 * driver is on which run), and a column is what makes a comparison scannable.
 *
 * On a phone the same table was **not narrow — it was cut**. Seven columns render
 * about four in ~360px, and the overflow could not be scrolled to: Xe, Tài xế and
 * **Lương chuyến** were simply unreachable, which is the one figure the operator
 * opens this card for. The single-trip job had no such problem because it never
 * had a table — its route reads as a vertical card, and the client confirmed that
 * shape works.
 *
 * So mobile gets **one card per leg**, all seven facts stacked. That is a shape
 * change rather than a squeeze, and it's the same call `OrderItemsTable` made for
 * sales-order lines. The trade accepted: legs no longer align into columns on a
 * phone, so comparing leg 3's driver against leg 1's costs a scroll. Comparison is
 * the desk's job; the phone's job is reading one job end to end.
 *
 * `Table.ScrollContainer` was the cheaper fix and is deliberately **not** what
 * shipped: it keeps the value reachable only by a horizontal drag inside a
 * vertically-scrolling page, which is the gesture operators miss — and the
 * unreachable column was the money.
 */
export function TransportTripsCard({ order }: { readonly order: TransportOrder }) {
  const { t } = useTranslation();
  const trips = order.trips ?? [];
  const laborTotal = orderTripLaborTotal(order);

  return (
    <SectionCard
      icon={<IconRoute size={14} />}
      title={t('transportOrders.trips.title')}
      padding={cardPadding}
    >
      {isMobile ? (
        <Stack gap="sm">
          {trips.map((trip, i) => (
            <TripCard key={i} index={i} trip={trip} />
          ))}
        </Stack>
      ) : (
        <TripsTable trips={trips} />
      )}
      {/* Σ driver pay — money, so `canViewPrice` gates it like every other figure.
          It sits here rather than in the fee card because it's what the operator
          pays out, not part of what the customer is billed. */}
      {canViewPrice && (
        <>
          <Divider />
          <Group justify="space-between" wrap="nowrap" gap="sm">
            <Text fw={700}>{t('transportOrders.trips.laborTotal')}</Text>
            <Text fw={700}>{formatMoney(laborTotal)}</Text>
          </Group>
        </>
      )}
    </SectionCard>
  );
}

/**
 * The leg's loading day: its estimate when it has one, else the stored `date`.
 *
 * That fallback is not decoration — every multi-trip order written before
 * 2026-07-21 carries a `date` and no estimate, and `date` is no longer authored
 * (the form derives it from `loadingAt`), so this is the only place those legs
 * still read their day.
 */
function loadingLabel(trip: TransportOrderTrip): string {
  if (trip.loadingAt) return formatDateTime(trip.loadingAt);
  if (trip.date) return formatDate(trip.date);
  return '—';
}

/** The desktop table — unchanged; a column per fact, legs compared down the page. */
function TripsTable({ trips }: { readonly trips: readonly TransportOrderTrip[] }) {
  const { t } = useTranslation();

  return (
    <Table>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>{t('transportOrders.trips.departure')}</Table.Th>
          <Table.Th>{t('transportOrders.trips.destination')}</Table.Th>
          {/* No NGÀY column — the loading estimate carries the leg's day, and the
              leg's stored `date` is derived from it on the form. A leg with no
              estimate falls back to showing that date (see `loadingLabel`), so a
              pre-2026-07-21 multi-trip order still reads its per-leg day here. */}
          <Table.Th>{t('transportOrders.trips.loadingAt')}</Table.Th>
          <Table.Th>{t('transportOrders.trips.unloadingAt')}</Table.Th>
          <Table.Th>{t('transportOrders.columns.truck')}</Table.Th>
          <Table.Th>{t('transportOrders.form.driver')}</Table.Th>
          <Table.Th ta="right">{t('transportOrders.trips.laborCost')}</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {trips.map((trip, i) => (
          <Table.Tr key={i}>
            <Table.Td>{trip.departure || '—'}</Table.Td>
            <Table.Td>{trip.destination || '—'}</Table.Td>
            {/* Estimates, so they read dimmed — the plan, not what happened.
                Read-only like the rest of the leg: `trips` is the source the
                order-level mirror derives from, so it is edited on the form. */}
            <Table.Td c="dimmed">{loadingLabel(trip)}</Table.Td>
            <Table.Td c="dimmed">
              {trip.unloadingAt ? formatDateTime(trip.unloadingAt) : '—'}
            </Table.Td>
            {/* Linked, not printed — same rule as the order-level truck/driver, and
                each leg carries its own plate/name snapshot to fall back on. */}
            <Table.Td>
              <TruckLink id={trip.truckId} fallbackLabel={trip.truckPlate} showPlate />
            </Table.Td>
            <Table.Td>{trip.driverId ? <EmployeeLink id={trip.driverId} /> : '—'}</Table.Td>
            <Table.Td ta="right">{canViewPrice ? formatMoney(trip.laborCost) : '—'}</Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}

/**
 * One leg as a card. The route leads — it is what identifies the leg — and the
 * leg number is kept because it pairs with the list's route/driver cells, which
 * number their legs the same way.
 */
function TripCard({ index, trip }: { readonly index: number; readonly trip: TransportOrderTrip }) {
  const { t } = useTranslation();

  return (
    <Card withBorder radius="md" padding="md">
      <Stack gap="sm">
        <Group gap={6} wrap="nowrap" align="flex-start">
          <Text fw={700} c="dimmed" style={{ flexShrink: 0 }}>
            {index + 1}.
          </Text>
          {/* Wraps rather than clamps: on a card there is a next line to use, and
              a leg is told apart from its neighbours by its full address — the
              same reason the form's leg table gave its place columns the slack. */}
          <Text fw={600} style={{ minWidth: 0, wordBreak: 'break-word' }}>
            {trip.departure || '—'} › {trip.destination || '—'}
          </Text>
        </Group>
        <Stack gap={4}>
          <FieldRow label={t('transportOrders.trips.loadingAt')} value={loadingLabel(trip)} />
          <FieldRow
            label={t('transportOrders.trips.unloadingAt')}
            value={trip.unloadingAt ? formatDateTime(trip.unloadingAt) : '—'}
          />
          <FieldRow
            label={t('transportOrders.columns.truck')}
            value={<TruckLink id={trip.truckId} fallbackLabel={trip.truckPlate} showPlate />}
          />
          <FieldRow
            label={t('transportOrders.form.driver')}
            value={trip.driverId ? <EmployeeLink id={trip.driverId} /> : '—'}
          />
          {/* The reason the card exists: on the table this column was off-screen
              and unreachable. Gated like every other figure. */}
          {canViewPrice && (
            <FieldRow
              label={t('transportOrders.trips.laborCost')}
              value={formatMoney(trip.laborCost)}
            />
          )}
        </Stack>
      </Stack>
    </Card>
  );
}
