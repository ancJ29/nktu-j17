import { useNavigate } from 'react-router';
import { Badge, Card, Group, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import type { TransportOrder } from '@/types';
import { formatDate } from '@/utils/dateFormat';
import { findStatus } from './transportOrderStatuses';
import { useShipmentTypeLabel } from './shipmentType';
import { TransportRouteCell } from './TransportRouteCell';

type Props = {
  readonly orders: TransportOrder[];
  readonly isLoading?: boolean;
};

export function TransportOrderCardList({ orders, isLoading }: Props) {
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
                {/* Date and LOẠI HÌNH on one line — same facts as the table,
                    where the type sits under the order number. */}
                <Group gap={6} wrap="nowrap">
                  <Text size="xs" c="dimmed">
                    {formatDate(item.entryDate)}
                  </Text>
                  {item.shipmentType && (
                    <Badge size="xs" variant="light" color="gray">
                      {shipmentTypeLabel(item.shipmentType)}
                    </Badge>
                  )}
                </Group>
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
              {/* Shipment identifiers a dispatcher matches to a booking. */}
              {(item.billNumber || item.containerNumber) && (
                <Text size="xs" c="dimmed" lineClamp={1}>
                  {[item.billNumber, item.containerNumber].filter(Boolean).join(' · ')}
                </Text>
              )}
              {item.customerName && (
                <Text size="xs" c="dimmed" lineClamp={1}>
                  {item.customerName}
                </Text>
              )}
              {/* Same route treatment as the table: full chain for single-trip,
                  collapsed + expandable leg list for multi-trip. */}
              <TransportRouteCell order={item} />
            </Stack>
          </Card>
        );
      })}
    </Stack>
  );
}
