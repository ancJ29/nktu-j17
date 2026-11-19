import { Badge, Loader, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { StockMovement, StockMovementLevel } from '@/utils/stockMovement';
import type { StockMovementSource } from './useStockMovement';

const COLOR: Record<StockMovementLevel, string> = { aLot: 'red', normal: 'blue', rarely: 'gray' };

const fmt = (n: number) => String(Math.round(n * 10) / 10);

export function StockMovementBadge({
  source,
  productCode,
}: {
  readonly source: StockMovementSource;
  readonly productCode: string;
}) {
  const { t } = useTranslation();
  const m: StockMovement | undefined = source.get(productCode);

  if (!m) {
    return <Loader size={12} color="gray" aria-label={t('productInventory.movement.loading')} />;
  }
  return (
    <Stack gap={2} align="flex-start">
      <Badge color={COLOR[m.level]} size="sm" radius="sm" tt="none">
        {t(`productInventory.movement.${m.level}`)}
      </Badge>
      <Text size="xs" c="dimmed">
        {t('productInventory.movement.figures', {
          perMonth: fmt(m.perMonth),
        })}
      </Text>
    </Stack>
  );
}
