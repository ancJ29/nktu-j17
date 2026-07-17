import { useNavigate } from 'react-router';
import { Badge, Card, Group, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import type { TransportOrder } from '@/types';
import { formatDate } from '@/utils/dateFormat';
import { findStatus } from './transportOrderStatuses';

type Props = {
  readonly orders: TransportOrder[];
  readonly isLoading?: boolean;
};

export function TransportOrderCardList({ orders, isLoading }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (!isLoading && orders.length === 0) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        {t('transportOrders.noResults')}
      </Text>
    );
  }

  return (
    <Stack gap="sm">
      {orders.map((item) => {
        const status = findStatus(item.status);
        return (
          <Card
            key={item.id}
            withBorder
            radius="md"
            padding="sm"
            onClick={() => navigate(ROUTES.TRANSPORT_ORDERS.DETAIL.replace(':id', item.id))}
            style={{ cursor: 'pointer' }}
          >
            <Group justify="space-between" wrap="nowrap" align="flex-start">
              <Stack gap={2} style={{ minWidth: 0 }}>
                <Text fw={600}>{item.orderNumber}</Text>
                <Text size="xs" c="dimmed">
                  {formatDate(item.entryDate)}
                </Text>
              </Stack>
              {item.extra?.cancellation ? (
                <Badge color="red" variant="light">
                  {t('transportOrders.cancel.statusBadge')}
                </Badge>
              ) : (
                <Badge color={status.color} variant="light">
                  {status.label}
                </Badge>
              )}
            </Group>

            <Stack gap={2} mt="xs">
              {/* Same facts as the table, incl. the leg count — a multi-trip job
                  shows leg 1's truck here, and the badge is what stops that from
                  reading as the job's only truck. */}
              <Group gap={6} wrap="nowrap">
                <Text size="sm" lineClamp={1}>
                  {item.truckPlate || '—'}
                  {item.driverName ? ` · ${item.driverName}` : ''}
                </Text>
                {item.isMultiTrip && (
                  <Badge size="xs" variant="light" color="gray">
                    {t('transportOrders.trips.badge', { n: (item.trips ?? []).length })}
                  </Badge>
                )}
              </Group>
              {item.customerName && (
                <Text size="xs" c="dimmed" lineClamp={1}>
                  {item.customerName}
                </Text>
              )}
              <Text size="xs" c="dimmed" lineClamp={2}>
                {[item.route?.pickup, item.route?.dropoff].filter(Boolean).join(' → ')}
              </Text>
            </Stack>
          </Card>
        );
      })}
    </Stack>
  );
}
