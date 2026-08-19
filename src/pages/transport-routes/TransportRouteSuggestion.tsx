import { Alert, Badge, Button, Group, Stack, Text } from '@mantine/core';
import { IconRoute } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { TransportRouteRow } from '@/types';
import { formatMoney } from '../transport-orders/transportOrderPricing';
import { useContainerSizeLabel } from '../transport-orders/containerSize';
import { routeLaborTotal } from './routeSummary';
import { useRouteCosting } from './useRouteCosting';

type Props = {
  readonly matches: readonly TransportRouteRow[];
  readonly onApply: (route: TransportRouteRow) => void;

  readonly appliedCode?: string | undefined;
};

export function TransportRouteSuggestion({ matches, onApply, appliedCode }: Props) {
  const { t } = useTranslation();
  const containerSizeLabel = useContainerSizeLabel();

  const { costOf } = useRouteCosting();

  if (matches.length === 0) return null;

  return (
    <Alert color="blue" variant="light" icon={<IconRoute size={16} />}>
      <Stack gap="xs">
        <Text size="sm" fw={600}>
          {matches.length === 1
            ? t('transportRoutes.suggestion.title')
            : t('transportRoutes.suggestion.title_other', { count: matches.length })}
        </Text>

        {matches.map((route) => {
          const applied = appliedCode === route.code;
          const costing = costOf(route);

          const suggested = costing.markupPercent > 0 ? costing.suggestedPrice : 0;
          return (
            <Group key={route.id} justify="space-between" wrap="nowrap" gap="md">
              <Group gap="xs" wrap="wrap" style={{ minWidth: 0 }}>
                <Text ff="monospace" fw={600} fz="sm">
                  {route.code}
                </Text>
                {route.containerSize && (
                  <Badge size="xs" variant="light" color="cyan" tt="none" radius="sm">
                    {containerSizeLabel(route.containerSize)}
                  </Badge>
                )}
                {/* Shown unguarded: the strip only ever renders inside the
                    order FORM, which is already an authoring surface with every
                    fee amount on it. `canViewPrice` guards the list and detail
                    page, not this. */}
                <Text size="xs" c="dimmed">
                  {t('transportRoutes.suggestion.freight')}{' '}
                  <Text span size="sm" c="dark" fw={500}>
                    {formatMoney(route.freightAmount)}
                  </Text>
                </Text>
                <Text size="xs" c="dimmed">
                  {t('transportRoutes.suggestion.labor')}{' '}
                  <Text span size="sm" c="dark" fw={500}>
                    {formatMoney(routeLaborTotal(route))}
                  </Text>
                </Text>
                {/* GIÁ BÁO ĐỀ XUẤT — shown, never applied. Áp dụng still copies
                    the route's authored PHÍ VẬN CHUYỂN, because that is the
                    price somebody decided; the markup-derived figure is advice
                    about it. A suggestion that overwrote the decided price would
                    make the price list stop being where a price is set. */}
                {suggested > 0 && (
                  <Text size="xs" c="dimmed">
                    {t('transportRoutes.costing.suggestedPrice', { markup: costing.markupPercent })}{' '}
                    <Text span size="sm" c="dark" fw={500}>
                      {formatMoney(suggested)}
                    </Text>
                  </Text>
                )}
                {route.extra?.notes && (
                  <Text size="xs" c="dimmed" fs="italic" lineClamp={1}>
                    {route.extra.notes}
                  </Text>
                )}
              </Group>

              <Button
                size="compact-sm"
                variant={applied ? 'light' : 'filled'}
                onClick={() => onApply(route)}
                style={{ flexShrink: 0 }}
              >
                {applied
                  ? t('transportRoutes.suggestion.applied', { code: route.code })
                  : t('transportRoutes.suggestion.apply')}
              </Button>
            </Group>
          );
        })}
      </Stack>
    </Alert>
  );
}
