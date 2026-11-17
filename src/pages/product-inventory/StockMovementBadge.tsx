import { Badge, Group, Loader, Stack, Text, Tooltip } from '@mantine/core';
import { useTranslation } from 'react-i18next';

import type { StockMovement, StockMovementLevel } from '@/utils/stockMovement';

import { STOCK_MOVEMENT_WINDOW_DAYS } from './productInventoryListVariant';
import type { StockMovementSource } from './useStockMovement';

const COLOR: Record<StockMovementLevel, string> = { aLot: 'teal', normal: 'blue', rarely: 'gray' };

const fmt = (n: number) => String(Math.round(n * 10) / 10);

export function StockMovementBadge({
  source,
  productCode,
  showFigures = true,
}: {
  readonly source: StockMovementSource;
  readonly productCode: string;
  readonly showFigures?: boolean;
}) {
  const { t } = useTranslation();
  const m: StockMovement | undefined = source.get(productCode);

  if (!m)
    return <Loader size={12} color="gray" aria-label={t('productInventory.movement.loading')} />;

  const figures = t('productInventory.movement.figures', {
    perMonth: fmt(m.perMonth),
    orders: m.orders,
    days: STOCK_MOVEMENT_WINDOW_DAYS,
  });
  const badge = (
    <Badge variant="light" color={COLOR[m.level]} size="sm" radius="sm" tt="none">
      {t(`productInventory.movement.${m.level}`)}
    </Badge>
  );
  if (showFigures) {
    return (
      <Stack gap={2} align="flex-end">
        {badge}
        <Text size="xs" c="dimmed">
          {figures}
        </Text>
      </Stack>
    );
  }
  return (
    <Tooltip label={figures} withArrow>
      <Group gap={0} justify="center" wrap="nowrap" style={{ cursor: 'help' }}>
        {badge}
      </Group>
    </Tooltip>
  );
}
