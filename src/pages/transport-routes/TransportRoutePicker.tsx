import { useMemo } from 'react';
import { Select, Text } from '@mantine/core';
import { IconRoute } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { TransportRouteRow } from '@/types';
import { isRouteLive, routeContainerDisplay, routeEndpoints, routeLegCount } from './routeSummary';
import { NON_CONTAINER_TRUCK_TYPES } from '../transport-orders/containerSize';

type Props = {
  readonly routes: readonly TransportRouteRow[];
  readonly onPick: (route: TransportRouteRow) => void;

  readonly appliedId?: string | undefined;
};

export function TransportRoutePicker({ routes, onPick, appliedId }: Props) {
  const { t } = useTranslation();

  const options = useMemo(
    () =>
      routes
        .filter(isRouteLive)
        .map((route) => {
          const { from, to } = routeEndpoints(route);
          const journey = [from, to].filter(Boolean).join(' → ');
          const legs = routeLegCount(route);
          return {
            value: route.id,

            label: [
              route.code,
              route.name,
              journey,
              legs > 1 ? t('transportOrders.trips.badge', { n: legs }) : '',

              routeContainerDisplay(route, NON_CONTAINER_TRUCK_TYPES) === 'missing'
                ? t('transportRoutes.picker.incomplete')
                : '',
            ]
              .filter(Boolean)
              .join(' · '),
          };
        })
        .sort((a, b) => a.label.localeCompare(b.label, 'vi')),
    [routes, t],
  );

  if (options.length === 0) return null;

  return (
    <Select
      label={t('transportRoutes.picker.label')}
      description={t('transportRoutes.picker.hint')}
      placeholder={t('transportRoutes.picker.placeholder')}
      leftSection={<IconRoute size={16} />}
      data={options}
      value={appliedId ?? null}
      onChange={(id) => {
        const route = routes.find((r) => r.id === id);
        if (route) onPick(route);
      }}
      searchable

      allowDeselect={false}
      nothingFoundMessage={
        <Text size="sm" c="dimmed">
          {t('transportRoutes.picker.noMatch')}
        </Text>
      }
      maw={520}
    />
  );
}
