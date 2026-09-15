import { Card, Stack, Table, Text, ThemeIcon, Group } from '@mantine/core';
import { IconShoppingCart } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import { EntityAnchor, EntityChip } from '@/components/EntityLink';
import { featureFlags } from '@/config';
import type { InventoryV2Row } from '@/types';
import { formatNumber } from '@/utils/number';
import { QuantityWithUnit } from './QuantityWithUnit';

/**
 * The open sales orders holding one item's stock — `IncomingReceiptsCard`'s
 * mirror on the locked side, and every rule there holds here: the server
 * sends the breakdown (each row is the snapshot the order staged), so the
 * card needs no order store and stays correct for an order outside any
 * loaded date range. Absent entirely when nothing is held.
 */
export function OutgoingOrdersCard({
  stock,
  unit,
}: {
  readonly stock: InventoryV2Row | undefined;
  readonly unit?: string | undefined;
}) {
  const { t } = useTranslation();
  const rows = stock?.outgoingBy ?? [];
  if (rows.length === 0) return null;

  return (
    <Card withBorder radius="md" padding="md">
      <Stack gap="sm">
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon size={28} radius="md" variant="light" color="orange">
            <IconShoppingCart size={16} stroke={1.75} />
          </ThemeIcon>
          <Stack gap={0}>
            <Text size="sm" fw={600}>
              {t('inventoryV2.outgoing')}
            </Text>
            <Text size="xs" c="dimmed">
              {t('inventoryV2.outgoingTooltip')}
            </Text>
          </Stack>
        </Group>

        <Table withRowBorders={false} verticalSpacing={4}>
          <Table.Tbody>
            {rows.map((row) => (
              <Table.Tr key={row.orderId}>
                <Table.Td>
                  <OrderRef orderId={row.orderId} orderNumber={row.orderNumber} />
                </Table.Td>
                <Table.Td ta="right">
                  <QuantityWithUnit value={formatNumber(row.quantity)} unit={unit} color="orange" />
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Stack>
    </Card>
  );
}

/** An order whose number the lock recorded — `ReceiptRef`'s reasoning. */
function OrderRef({
  orderId,
  orderNumber,
}: {
  readonly orderId: string;
  readonly orderNumber: string;
}) {
  const { t } = useTranslation();
  const chip = <EntityChip size="sm" label={orderNumber || t('inventoryV2.outgoingUnnamed')} />;
  if (!orderNumber || !featureFlags.salesOrdersV2.enabled) return chip;
  return (
    <EntityAnchor to={ROUTES.SALES_ORDERS_V2.DETAIL.replace(':id', orderId)} size="sm">
      {chip}
    </EntityAnchor>
  );
}
