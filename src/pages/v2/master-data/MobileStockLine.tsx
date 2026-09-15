import { Badge, Group, Text } from '@mantine/core';
import { IconBellOff } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { InventoryV2Row } from '@/types';
import { formatNumber } from '@/utils/number';
import { forecastOf, stockLevelOf } from './stockLevel';

export function MobileStockLine({
  stock,
  min,
  alertsOff = false,
  unit,
}: {
  readonly stock: InventoryV2Row | undefined;
  readonly min?: number | undefined;
  readonly alertsOff?: boolean;
  readonly unit?: string | undefined;
}) {
  const { t } = useTranslation();
  const onHand = stock?.onHand ?? 0;
  const forecasted = forecastOf(stock);
  const level = stockLevelOf({ stock, min, alertsOff });

  return (
    <Group gap={6} wrap="nowrap" align="baseline">
      {alertsOff && <IconBellOff size={13} stroke={1.75} color="var(--mantine-color-dimmed)" />}
      <Text
        size="lg"
        fw={700}
        c={level === 'outOfStock' ? 'red' : level === 'mustOrder' ? 'orange' : undefined}
      >
        {formatNumber(onHand)}
      </Text>
      {unit ? (
        <Text size="xs" c="dimmed">
          {unit}
        </Text>
      ) : null}
      {forecasted !== onHand && (
        <Badge size="xs" variant="light" color="gray" radius="sm">
          → {formatNumber(forecasted)}
        </Badge>
      )}
      {!stock && (
        <Text size="xs" c="dimmed" fs="italic">
          {t('inventoryV2.neverCounted')}
        </Text>
      )}
    </Group>
  );
}
