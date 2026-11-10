import { Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/utils/dateFormat';
import type { Arrival } from './purchaseOrderArrivals';

export function ArrivalText({
  arrival,
  size = 'sm',
}: {
  readonly arrival: Arrival | null;
  readonly size?: 'xs' | 'sm';
}) {
  const { t } = useTranslation();
  if (arrival?.kind === 'received') {
    return (
      <Text size={size} style={{ whiteSpace: 'nowrap' }}>
        {formatDate(new Date(`${arrival.day}T00:00:00+07:00`).toISOString())}
      </Text>
    );
  }
  if (arrival?.kind === 'draft') {
    return (
      <Text size={size} c="dimmed" style={{ whiteSpace: 'nowrap' }}>
        {t('purchaseOrders.columns.draftReceipt')}
      </Text>
    );
  }
  return (
    <Text size={size} c="dimmed">
      —
    </Text>
  );
}
