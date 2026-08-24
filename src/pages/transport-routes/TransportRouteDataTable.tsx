import { useCallback, useMemo, useState, type MouseEvent, type Ref } from 'react';
import { Badge, Group, Stack, Text, Tooltip } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import { ListDataTable } from '@/components/ListDataTable';
import { formatDate } from '@/utils/dateFormat';
import type { TransportRouteRow } from '@/types';
import { formatMoney } from '../transport-orders/transportOrderPricing';
import { useContainerSizeLabel } from '../transport-orders/containerSize';
import { useTruckTypeLabel } from './truckType';
import { JourneyCell } from '../transport-orders/TransportRouteCell';
import {
  routeContainerDisplay,
  routeJourneyLegs,
  routeLaborTotal,
  routeLegCount,
} from './routeSummary';
import { appConfig } from '@/config';
import { useRouteCosting } from './useRouteCosting';
import { isRecentFuelPriceChange } from '../cost-norms/fuelPrice';
import { routeUsesFuelPricing } from './routeCosting';

const NON_CONTAINER_TRUCK_TYPES = appConfig.features.transportOrders.nonContainerTruckTypes ?? [];

type Props = {
  readonly routes: TransportRouteRow[];
  readonly isLoading?: boolean;
  readonly viewportRef?: Ref<HTMLDivElement>;
};

export function TransportRouteDataTable({ routes, isLoading, viewportRef }: Props) {
  const { t } = useTranslation();
  const truckTypeLabel = useTruckTypeLabel();
  const containerSizeLabel = useContainerSizeLabel();

  const { costOf, currentPrice, norms } = useRouteCosting();

  const [now] = useState(() => Date.now());
  const priceJustChanged = isRecentFuelPriceChange(currentPrice, now);

  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(new Set());
  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }, []);

  const columns = useMemo(
    () => [
      {
        key: 'code',
        width: '135px',
        header: t('transportRoutes.columns.code'),
        render: (r: TransportRouteRow) => (
          <Stack gap={4} align="flex-start">
            {/* Mono, like every other code in this feature (order no.,
                container, plate): it is matched character-by-character, which
                is the one job proportional type is bad at. */}
            <Text ff="monospace" fz="sm" fw={600}>
              {r.code}
            </Text>
            {r.isMultiTrip ? (
              <Badge size="xs" variant="light" color="grape" tt="none" radius="sm">
                {t('transportOrders.trips.badge', { n: routeLegCount(r) })}
              </Badge>
            ) : (
              <Text size="xs" c="dimmed">
                {t('transportRoutes.kind.single')}
              </Text>
            )}
            {!r.isActive && (
              <Badge size="xs" variant="light" color="gray" tt="none" radius="sm">
                {t('transportRoutes.status.inactive')}
              </Badge>
            )}
          </Stack>
        ),
      },
      {
        key: 'route',
        header: t('transportRoutes.columns.route'),

        onCellClick: (r: TransportRouteRow, event: MouseEvent) => {
          if (!r.isMultiTrip) return;
          event.stopPropagation();
          toggleExpanded(r.id);
        },
        render: (r: TransportRouteRow) => (
          <JourneyCell
            legs={routeJourneyLegs(r)}
            expanded={expandedIds.has(r.id)}
            onToggle={() => toggleExpanded(r.id)}

            lines={2}
          />
        ),
      },
      {
        key: 'truckType',
        width: '130px',
        header: t('transportRoutes.columns.truckType'),
        render: (r: TransportRouteRow) => {
          const display = routeContainerDisplay(r, NON_CONTAINER_TRUCK_TYPES);
          return (
            <Stack gap={2}>
              <Text size="sm">{truckTypeLabel(r.truckType) || '—'}</Text>
              {display === 'value' && (
                <Text size="xs" c="dimmed">
                  {containerSizeLabel(r.containerSize)}
                </Text>
              )}
              {display === 'any' && (
                <Text size="xs" c="dimmed" fs="italic">
                  {t('transportRoutes.form.anyContainerSize')}
                </Text>
              )}
            </Stack>
          );
        },
      },
      {
        key: 'freightAmount',
        width: '125px',
        header: t('transportRoutes.columns.freightAmount'),
        render: (r: TransportRouteRow) => (
          <Text size="sm" ta="right">
            {formatMoney(r.freightAmount)}
          </Text>
        ),
      },
      {
        key: 'laborCost',
        width: '120px',
        header: t('transportRoutes.columns.laborCost'),

        render: (r: TransportRouteRow) => (
          <Text size="sm" ta="right">
            {formatMoney(routeLaborTotal(r))}
          </Text>
        ),
      },
      {
        key: 'costPrice',
        width: '175px',
        header: t('transportRoutes.costing.costPrice'),
        render: (r: TransportRouteRow) => {
          const costing = costOf(r);

          const moved =
            priceJustChanged &&
            routeUsesFuelPricing(r, r.truckType ? norms.get(r.truckType) : undefined);
          return (
            <Group gap={4} justify="flex-end" wrap="nowrap">
              {moved && (
                <Tooltip
                  label={t('transportRoutes.costing.costChangedHint')}
                  withArrow
                  multiline
                  w={240}
                >
                  <Badge size="xs" variant="light" color="blue" tt="none" radius="sm">
                    {t('transportRoutes.costing.costChanged')}
                  </Badge>
                </Tooltip>
              )}
              <Text
                size="sm"
                ta="right"

                c={costing.missing.length > 0 ? 'orange' : undefined}
                title={
                  costing.missing.length > 0
                    ? t(
                        costing.missing.includes('norm')
                          ? 'transportRoutes.costing.missingNorm'
                          : 'transportRoutes.costing.missingPrice',
                      )
                    : undefined
                }
              >
                {formatMoney(costing.costPrice)}
              </Text>
            </Group>
          );
        },
      },
      {
        key: 'suggestedPrice',
        width: '130px',
        header: t('transportRoutes.costing.suggestedPriceShort'),

        render: (r: TransportRouteRow) => {
          const costing = costOf(r);
          if (costing.markupPercent <= 0) {
            return (
              <Text size="sm" ta="right" c="dimmed">
                —
              </Text>
            );
          }
          return (
            <Text size="sm" ta="right" title={`+${costing.markupPercent}%`}>
              {formatMoney(costing.suggestedPrice)}
            </Text>
          );
        },
      },
      {
        key: 'updatedAt',
        width: '105px',
        header: t('transportRoutes.columns.updatedAt'),
        render: (r: TransportRouteRow) => (
          <Text size="sm" c="dimmed">
            {formatDate(r.updatedAt)}
          </Text>
        ),
      },
    ],
    [
      t,
      truckTypeLabel,
      containerSizeLabel,
      costOf,
      expandedIds,
      toggleExpanded,
      priceJustChanged,
      norms,
    ],
  );

  const getRowBg = useMemo(() => (r: TransportRouteRow) => (r.isActive ? undefined : 'gray.1'), []);

  return (
    <ListDataTable
      data={routes}
      columns={columns}
      isLoading={isLoading}
      emptyMessage={t('transportRoutes.noResults')}

      detailRoute={ROUTES.TRANSPORT_ROUTES.EDIT}
      maxHeight="calc(100vh - 250px)"
      viewportRef={viewportRef}
      getRowBg={getRowBg}
    />
  );
}
