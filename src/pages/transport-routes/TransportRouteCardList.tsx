import { Badge, Group, Stack, Text } from '@mantine/core';
import { IconArrowNarrowRight } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import { ListCardList } from '@/components/ListCardList';
import { ActiveBadge } from '@/components/badges';
import type { TransportRouteRow } from '@/types';
import { formatMoney } from '../transport-orders/transportOrderPricing';
import { useContainerSizeLabel } from '../transport-orders/containerSize';
import { useTruckTypeLabel } from './truckType';
import { routeEndpoints, routeLaborTotal, routeLegCount } from './routeSummary';
import { useRouteCosting } from './useRouteCosting';

type Props = {
  readonly routes: TransportRouteRow[];
  readonly isLoading?: boolean;
};

export function TransportRouteCardList({ routes, isLoading }: Props) {
  const { t } = useTranslation();
  const truckTypeLabel = useTruckTypeLabel();
  const containerSizeLabel = useContainerSizeLabel();
  const { costOf } = useRouteCosting();

  return (
    <ListCardList
      data={routes}
      isLoading={isLoading}
      emptyMessage={t('transportRoutes.noResults')}
      detailRoute={ROUTES.TRANSPORT_ROUTES.EDIT}
      skeletonLines={3}
      renderCard={(r) => {
        const { from, to } = routeEndpoints(r);
        const costing = costOf(r);
        return (
          <Stack gap={6}>
            <Group justify="space-between" wrap="nowrap">
              <Text ff="monospace" fw={700} fz="sm">
                {r.code}
              </Text>
              <ActiveBadge
                isActive={r.isActive}
                activeLabel={t('transportRoutes.status.active')}
                inactiveLabel={t('transportRoutes.status.inactive')}
              />
            </Group>

            <Group gap={6} align="flex-start">
              <Text size="sm" fw={500} style={{ flex: '1 1 auto', minWidth: 0 }}>
                {from || '—'}
              </Text>
              <IconArrowNarrowRight
                size={14}
                style={{ flexShrink: 0, opacity: 0.5, marginTop: 4 }}
              />
              <Text size="sm" fw={500} style={{ flex: '1 1 auto', minWidth: 0 }}>
                {to || '—'}
              </Text>
            </Group>

            <Group gap={6}>
              {r.isMultiTrip && (
                <Badge size="xs" variant="light" color="grape" tt="none" radius="sm">
                  {t('transportOrders.trips.badge', { n: routeLegCount(r) })}
                </Badge>
              )}
              {r.truckType && (
                <Badge size="xs" variant="light" color="primary" tt="none" radius="sm">
                  {truckTypeLabel(r.truckType)}
                </Badge>
              )}
              {r.containerSize && (
                <Badge size="xs" variant="light" color="cyan" tt="none" radius="sm">
                  {containerSizeLabel(r.containerSize)}
                </Badge>
              )}
            </Group>

            <Group gap="lg">
              <Text size="xs" c="dimmed">
                {t('transportRoutes.suggestion.freight')}{' '}
                <Text span size="sm" c="dark">
                  {formatMoney(r.freightAmount)}
                </Text>
              </Text>
              <Text size="xs" c="dimmed">
                {t('transportRoutes.suggestion.labor')}{' '}
                <Text span size="sm" c="dark">
                  {formatMoney(routeLaborTotal(r))}
                </Text>
              </Text>
              {/* Carried onto the card for the same reason the money is: this
                  register is READ on a phone, and giá vốn is now the figure that
                  makes a price legible. Amber marks an under-estimate, as in the
                  table — there is no hover here to explain it, so the colour is
                  the whole signal. */}
              <Text size="xs" c="dimmed">
                {t('transportRoutes.costing.costPrice')}{' '}
                <Text span size="sm" c={costing.missing.length > 0 ? 'orange' : 'dark'}>
                  {formatMoney(costing.costPrice)}
                </Text>
              </Text>
            </Group>
          </Stack>
        );
      }}
    />
  );
}
