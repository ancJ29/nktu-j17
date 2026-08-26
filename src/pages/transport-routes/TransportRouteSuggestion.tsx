import { Alert, Badge, Button, Group, Stack, Text } from '@mantine/core';
import { IconRoute } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { TransportRouteRow } from '@/types';
import { formatMoney } from '../transport-orders/transportOrderPricing';
import { useContainerSizeLabel } from '../transport-orders/containerSize';

type Props = {
  readonly matches: readonly TransportRouteRow[];
  readonly onApply: (route: TransportRouteRow) => void;

  readonly appliedCode?: string | undefined;
};

export function TransportRouteSuggestion({ matches, onApply, appliedCode }: Props) {
  const { t } = useTranslation();
  const containerSizeLabel = useContainerSizeLabel();

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
          return (
            <Group key={route.id} justify="space-between" wrap="nowrap" gap="md">
              <Group gap="xs" wrap="wrap" style={{ minWidth: 0 }}>
                <Text ff="monospace" fw={600} fz="sm">
                  {route.code}
                </Text>
                {/* Suppressed when it merely repeats the code — a client that
                    names a route after its own code should not read it twice. */}
                {route.name && route.name !== route.code && (
                  <Text fz="sm" fw={500}>
                    {route.name}
                  </Text>
                )}
                {route.containerSize && (
                  <Badge size="xs" variant="light" color="cyan" tt="none" radius="sm">
                    {containerSizeLabel(route.containerSize)}
                  </Badge>
                )}
                {/* The ONE number, and the only one applying actually copies:
                    what the customer is charged. Shown unguarded because the
                    strip renders inside the order FORM, which is already an
                    authoring surface carrying every fee amount — this is not a
                    figure the operator is being shown for the first time. */}
                <Text size="xs" c="dimmed">
                  {t('transportRoutes.suggestion.freight')}{' '}
                  <Text span size="sm" c="dark" fw={500}>
                    {formatMoney(route.freightAmount)}
                  </Text>
                </Text>
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
