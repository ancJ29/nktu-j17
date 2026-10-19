import { Stack, Text, type MantineSize } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { OdometerLog } from '@/types';
import { formatNumber } from '@/utils/number';
import { readFuelCost, readOtherCosts } from './odometerLogModel';

export function OdometerCostLines({
  log,
  size = 'xs',
}: {
  readonly log: OdometerLog | undefined;
  readonly size?: MantineSize;
}) {
  const { t } = useTranslation();
  const fuelCost = readFuelCost(log);
  const others = readOtherCosts(log);
  if (fuelCost === undefined && others.length === 0) return null;
  return (
    <Stack gap={0}>
      {fuelCost !== undefined && (
        <Text size={size} c="dimmed">
          {t('odometerLog.home.fuelCost', { amount: formatNumber(fuelCost) })}
        </Text>
      )}
      {others.map((line, i) => (
        <Text key={i} size={size} c="dimmed">
          {t('odometerLog.home.otherCost', {
            content: line.content || t('odometerLog.home.otherCostUnnamed'),
            amount: formatNumber(line.amount),
          })}
        </Text>
      ))}
    </Stack>
  );
}
