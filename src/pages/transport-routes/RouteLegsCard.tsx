import { Button, Group, Table, Text } from '@mantine/core';
import { IconPlus, IconRoute } from '@tabler/icons-react';
import { NumberInput } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { useTranslation } from 'react-i18next';
import { SectionCard } from '@/components/SectionCard';
import { formatMoney } from '../transport-orders/transportOrderPricing';
import { blankLeg, type RouteFormValues } from './routeFormValues';
import { deriveSegmentsFromLegs } from './transportRouteWrite';
import { routeDistanceTotal } from './routeCosting';
import { RoutePlaceInput, RouteRowRemove } from './RouteFormRow';

type Props = {
  readonly form: UseFormReturnType<RouteFormValues>;
  readonly suggestions: string[];
};

/**
 * DANH SÁCH CHẶNG — the legs of a multi-leg route, which on this shape ARE the
 * measured stretches: SỐ KM is a column here rather than a second table
 * re-asking for the two places the operator has just typed (product's report,
 * 2026-08-19). `buildTransportRouteWrite` derives `segments` from these.
 *
 * The totals are computed from `form.values` through the same pure helpers the
 * write path uses, rather than passed down from the page's `draftCosting`.
 * Deriving twice from one source beats threading one number through a prop, and
 * it is what lets this card stand alone.
 */
export function RouteLegsCard({ form, suggestions }: Props) {
  const { t } = useTranslation();
  const legs = form.values.trips;
  const distanceTotal = routeDistanceTotal({ segments: deriveSegmentsFromLegs(legs) });
  const laborTotal = legs.reduce((sum, leg) => sum + (leg.laborCost || 0), 0);

  return (
    <SectionCard
      icon={<IconRoute size={14} />}
      title={t('transportRoutes.trips.title')}
      actions={
        <Button
          size="compact-sm"
          variant="light"
          leftSection={<IconPlus size={14} />}
          onClick={() => form.insertListItem('trips', blankLeg())}
        >
          {t('transportRoutes.trips.add')}
        </Button>
      }
    >
      <Table>
        <Table.Thead>
          <Table.Tr>
            {/* Same width budget as the order form's leg table: the two place
                columns are the only unfixed ones, so they absorb whatever the
                others don't take. */}
            <Table.Th>{t('transportOrders.trips.departure')}</Table.Th>
            <Table.Th>{t('transportOrders.trips.destination')}</Table.Th>
            <Table.Th w={130}>{t('transportRoutes.form.distanceKm')}</Table.Th>
            <Table.Th w={160}>{t('transportOrders.trips.laborCost')}</Table.Th>
            <Table.Th w={40} />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {legs.map((leg, i) => (
            <Table.Tr key={i}>
              <Table.Td>
                <RoutePlaceInput
                  suggestions={suggestions}
                  title={leg.departure || undefined}
                  {...form.getInputProps(`trips.${i}.departure`)}
                />
              </Table.Td>
              <Table.Td>
                <RoutePlaceInput
                  suggestions={suggestions}
                  title={leg.destination || undefined}
                  {...form.getInputProps(`trips.${i}.destination`)}
                />
              </Table.Td>
              <Table.Td>
                <NumberInput
                  min={0}
                  decimalScale={1}
                  thousandSeparator=","
                  {...form.getInputProps(`trips.${i}.distanceKm`)}
                />
              </Table.Td>
              <Table.Td>
                <NumberInput
                  thousandSeparator=","
                  min={0}
                  {...form.getInputProps(`trips.${i}.laborCost`)}
                />
              </Table.Td>
              <Table.Td>
                <RouteRowRemove
                  disabled={legs.length === 1}
                  onClick={() => form.removeListItem('trips', i)}
                />
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <Group justify="flex-end" gap="md">
        <Text fw={600}>{t('transportRoutes.form.distanceTotal')}</Text>
        <Text fw={700}>
          {distanceTotal.toLocaleString('vi-VN')} {t('transportRoutes.costing.km')}
        </Text>
        <Text fw={600} ml="md">
          {t('transportRoutes.trips.laborTotal')}
        </Text>
        <Text fw={700}>{formatMoney(laborTotal)}</Text>
      </Group>
    </SectionCard>
  );
}
