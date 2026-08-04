import { Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { MaintenanceLogExtra } from '@/types';
import { readMaintenanceItems, warrantySummary } from './maintenanceItems';

export function WarrantySummaryCell({
  extra,
}: {
  readonly extra: MaintenanceLogExtra | undefined;
}) {
  const { t } = useTranslation();
  const summary = warrantySummary(readMaintenanceItems(extra), (months) =>
    t('operationLogs.maintenance.months', { count: months }),
  );
  return (
    <Text size="sm" c={summary ? undefined : 'dimmed'}>
      {summary || '—'}
    </Text>
  );
}
