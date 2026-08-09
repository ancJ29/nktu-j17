import { useMemo, type Ref } from 'react';
import { Badge, Group, Text } from '@mantine/core';
import { IconArrowNarrowRight } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import { ListDataTable } from '@/components/ListDataTable';
import { ActiveBadge } from '@/components/badges';
import { formatDate } from '@/utils/dateFormat';
import type { TransportRouteRow } from '@/types';
import { formatMoney } from '../transport-orders/transportOrderPricing';
import { useContainerSizeLabel } from '../transport-orders/containerSize';
import { useTruckTypeLabel } from './truckType';
import { routeEndpoints, routeLaborTotal, routeLegCount } from './routeSummary';

type Props = {
  readonly routes: TransportRouteRow[];
  readonly isLoading?: boolean;
  readonly viewportRef?: Ref<HTMLDivElement>;
};

export function TransportRouteDataTable({ routes, isLoading, viewportRef }: Props) {
  const { t } = useTranslation();
  const truckTypeLabel = useTruckTypeLabel();
  const containerSizeLabel = useContainerSizeLabel();

  const columns = useMemo(
    () => [
      {
        key: 'code',
        width: '130px',
        header: t('transportRoutes.columns.code'),

        render: (r: TransportRouteRow) => (
          <Text ff="monospace" fz="sm" fw={600}>
            {r.code}
          </Text>
        ),
      },
      {
        key: 'kind',
        width: '110px',
        header: t('transportRoutes.columns.kind'),
        render: (r: TransportRouteRow) =>
          r.isMultiTrip ? (
            <Badge size="sm" variant="light" color="grape" tt="none" radius="sm">
              {t('transportOrders.trips.badge', { n: routeLegCount(r) })}
            </Badge>
          ) : (
            <Text size="sm" c="dimmed">
              {t('transportRoutes.kind.single')}
            </Text>
          ),
      },
      {
        key: 'route',
        header: t('transportRoutes.columns.route'),
        render: (r: TransportRouteRow) => {
          const { from, to } = routeEndpoints(r);
          return (
            <Group gap={6} wrap="nowrap">
              <Text size="sm" fw={500} lineClamp={1} title={from}>
                {from || '—'}
              </Text>
              <IconArrowNarrowRight size={14} style={{ flexShrink: 0, opacity: 0.5 }} />
              <Text size="sm" fw={500} lineClamp={1} title={to}>
                {to || '—'}
              </Text>
            </Group>
          );
        },
      },
      {
        key: 'truckType',
        width: '140px',
        header: t('transportRoutes.columns.truckType'),
        render: (r: TransportRouteRow) => (
          <Text size="sm">{truckTypeLabel(r.truckType) || '—'}</Text>
        ),
      },
      {
        key: 'containerSize',
        width: '120px',
        header: t('transportRoutes.columns.containerSize'),

        render: (r: TransportRouteRow) =>
          r.containerSize ? (
            <Text size="sm">{containerSizeLabel(r.containerSize)}</Text>
          ) : (
            <Text size="sm" c="dimmed" fs="italic">
              {t('transportRoutes.form.anyContainerSize')}
            </Text>
          ),
      },
      {
        key: 'freightAmount',
        width: '150px',
        header: t('transportRoutes.columns.freightAmount'),
        render: (r: TransportRouteRow) => (
          <Text size="sm" ta="right">
            {formatMoney(r.freightAmount)}
          </Text>
        ),
      },
      {
        key: 'laborCost',
        width: '150px',
        header: t('transportRoutes.columns.laborCost'),

        render: (r: TransportRouteRow) => (
          <Text size="sm" ta="right">
            {formatMoney(routeLaborTotal(r))}
          </Text>
        ),
      },
      {
        key: 'status',
        width: '130px',
        header: t('transportRoutes.columns.status'),
        render: (r: TransportRouteRow) => (
          <ActiveBadge
            isActive={r.isActive}
            activeLabel={t('transportRoutes.status.active')}
            inactiveLabel={t('transportRoutes.status.inactive')}
          />
        ),
      },
      {
        key: 'updatedAt',
        width: '120px',
        header: t('transportRoutes.columns.updatedAt'),
        render: (r: TransportRouteRow) => (
          <Text size="sm" c="dimmed">
            {formatDate(r.updatedAt)}
          </Text>
        ),
      },
    ],
    [t, truckTypeLabel, containerSizeLabel],
  );

  return (
    <ListDataTable
      data={routes}
      columns={columns}
      isLoading={isLoading}
      emptyMessage={t('transportRoutes.noResults')}

      detailRoute={ROUTES.TRANSPORT_ROUTES.EDIT}
      maxHeight="calc(100vh - 250px)"
      viewportRef={viewportRef}
    />
  );
}
