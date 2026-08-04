import { useNavigate } from 'react-router';
import { Badge, Card, Group, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import type { TransportOrder } from '@/types';
import { ColorBadge } from '@credo/base-ui/components';
import { formatDate, formatTime } from '@/utils/dateFormat';
import { findStatus } from './transportOrderStatuses';
import { useShipmentTypeLabel } from './shipmentType';
import { orderPlanAt, orderPlanDate } from './planDate';
import { TransportRouteCell } from './TransportRouteCell';
import { TransportDriverCell } from './TransportDriverCell';

export function TransportOrderCardList({
  orders,
  isLoading,
}: {
  readonly orders: TransportOrder[];
  readonly isLoading?: boolean;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const shipmentTypeLabel = useShipmentTypeLabel();

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
        const time = formatTime(orderPlanAt(item));
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
                {/* The plan date leads, with its time — the same promotion the
                    table's NGÀY column made; the order number follows as the
                    reference it is. */}
                <Group gap={6} wrap="nowrap" align="baseline">
                  <Text fw={600}>{formatDate(orderPlanDate(item))}</Text>
                  {time && (
                    <Text size="xs" c="dimmed" ff="monospace">
                      {time}
                    </Text>
                  )}
                  {item.shipmentType && (
                    <ColorBadge size="xs" label={shipmentTypeLabel(item.shipmentType)} />
                  )}
                </Group>
                <Text size="xs" c="dimmed" ff="monospace">
                  {item.orderNumber}
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

            <Stack gap={4} mt="xs">
              {/* Container leads the B/L, mono — matched against a booking. */}
              {(item.containerNumber || item.billNumber) && (
                <Text size="sm" ff="monospace" lineClamp={1}>
                  {[item.containerNumber, item.billNumber].filter(Boolean).join(' · ')}
                </Text>
              )}
              <TransportRouteCell order={item} />
              <TransportDriverCell order={item} />
              {item.customerName && (
                <Text size="xs" c="dimmed" lineClamp={1}>
                  {item.customerName}
                </Text>
              )}
            </Stack>
          </Card>
        );
      })}
    </Stack>
  );
}
