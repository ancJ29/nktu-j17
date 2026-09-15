import { Group, Stack, Text, Tooltip } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { formatNumber } from '@/utils/number';
import type { LineStock } from './lineStock';

export function LineStockCell({
  stock,
  orderedQuantity,
}: {
  readonly stock: LineStock | null;

  readonly orderedQuantity?: number;
}) {
  const { t } = useTranslation();

  if (!stock) {
    return (
      <Text size="sm" ta="right" c="dimmed" title={t('salesOrdersV2.form.availableUnknown')}>
        —
      </Text>
    );
  }

  const short = orderedQuantity === undefined ? 0 : orderedQuantity - stock.available;

  const hasMovements = stock.incoming !== 0 || stock.outgoing !== 0;

  return (
    <Stack gap={2} align="end">
      <Text size="sm" fw={700} c={short > 0 ? 'red' : undefined}>
        {formatNumber(stock.available)}
      </Text>

      {stock.forecast !== stock.available && (
        <Tooltip label={t('inventoryV2.forecastTooltip')} withArrow>
          <Text size="xs" c="dimmed">
            → {formatNumber(stock.forecast)}
          </Text>
        </Tooltip>
      )}

      {hasMovements && (
        <Group gap={8} wrap="nowrap" justify="flex-end">
          <Text size="xs" c="dimmed">
            {t('inventoryV2.shortOnHand')} {formatNumber(stock.onHand)}
          </Text>
          {stock.incoming > 0 && (
            <Text size="xs" c="blue">
              {t('inventoryV2.shortIncoming')} +{formatNumber(stock.incoming)}
            </Text>
          )}
          {stock.outgoing > 0 && (
            <Text size="xs" c="orange">
              {t('inventoryV2.shortOutgoing')} −{formatNumber(stock.outgoing)}
            </Text>
          )}
        </Group>
      )}

      {short > 0 && (
        <Text size="xs" c="red" fw={600}>
          {t('salesOrdersV2.form.availableShort', { count: formatNumber(short) })}
        </Text>
      )}
    </Stack>
  );
}
