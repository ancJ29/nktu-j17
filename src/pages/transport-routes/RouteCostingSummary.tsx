import { Alert, Divider, Group, Stack, Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { formatMoney } from '../transport-orders/transportOrderPricing';
import type { RouteCosting } from './routeCosting';

type Props = {
  readonly costing: RouteCosting;

  readonly litersPer100km: number | undefined;

  readonly fuelPricePerLiter: number | undefined;
};

function Row({
  label,
  value,
  hint,
  strong,
}: {
  label: string;
  value: string;
  hint?: string | undefined;
  strong?: boolean;
}) {
  return (
    <Group justify="space-between" align="flex-start" wrap="nowrap" gap="md">
      <Stack gap={0} style={{ minWidth: 0 }}>
        <Text size="sm" fw={strong ? 600 : undefined} c={strong ? undefined : 'dimmed'}>
          {label}
        </Text>
        {hint && (
          <Text size="xs" c="dimmed">
            {hint}
          </Text>
        )}
      </Stack>
      <Text size="sm" fw={strong ? 700 : undefined} style={{ whiteSpace: 'nowrap' }}>
        {value}
      </Text>
    </Group>
  );
}

export function RouteCostingSummary({ costing, litersPer100km, fuelPricePerLiter }: Props) {
  const { t } = useTranslation();

  return (
    <Stack gap="xs">
      {/* The gaps come first: a giá vốn missing its fuel term is an
          UNDER-estimate, and under-estimating a cost is the direction that
          loses money — so the warning sits above the number, not under it. */}
      {costing.missing.includes('norm') && (
        <Alert color="yellow" variant="light" icon={<IconAlertTriangle size={16} />}>
          {t('transportRoutes.costing.missingNorm')}
        </Alert>
      )}
      {costing.missing.includes('price') && (
        <Alert color="yellow" variant="light" icon={<IconAlertTriangle size={16} />}>
          {t('transportRoutes.costing.missingPrice')}
        </Alert>
      )}

      <Row
        label={t('transportRoutes.costing.distance')}
        value={`${costing.distanceKm.toLocaleString('vi-VN')} ${t('transportRoutes.costing.km')}`}
      />
      <Row
        label={t('transportRoutes.costing.fuelCost')}
        hint={t('transportRoutes.costing.fuelFormula', {
          km: costing.distanceKm.toLocaleString('vi-VN'),
          norm: litersPer100km ?? t('transportRoutes.costing.noNorm'),
          price: formatMoney(fuelPricePerLiter ?? 0),
        })}
        value={formatMoney(costing.fuelCost)}
      />
      <Row
        label={t('transportRoutes.costing.laborTotal')}
        value={formatMoney(costing.laborTotal)}
      />
      <Row
        label={t('transportRoutes.costing.itemsTotal')}
        value={formatMoney(costing.itemsTotal)}
      />

      <Divider my={4} />

      <Row
        label={t('transportRoutes.costing.costPrice')}
        value={formatMoney(costing.costPrice)}
        strong
      />
      {/* Shown only when a markup was set: "+0%" is not a suggestion, it is the
          cost price printed twice. */}
      {costing.markupPercent > 0 && (
        <Row
          label={t('transportRoutes.costing.suggestedPrice', { markup: costing.markupPercent })}
          value={formatMoney(costing.suggestedPrice)}
          strong
        />
      )}
    </Stack>
  );
}
