import { Card, Stack, Table, Text, ThemeIcon, Group } from '@mantine/core';
import { IconTruckDelivery } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import { EntityAnchor, EntityChip } from '@/components/EntityLink';
import { featureFlags } from '@/config';
import type { InventoryV2Row } from '@/types';
import { formatNumber } from '@/utils/number';
import { QuantityWithUnit } from './QuantityWithUnit';

/**
 * The open goods receipts behind one item's inbound figure — the
 * `incomingReceipts` variant.
 *
 * **The server sends the breakdown; this draws it.** Each row is a snapshot
 * the receipt staged when it was drafted, so the card needs no receipt store
 * and stays correct for a receipt outside any loaded date range — which is the
 * ordinary case for a draft raised weeks ahead of delivery.
 *
 * Absent entirely when nothing is inbound: an empty table would take a card's
 * worth of the page to say the same thing the missing figure already says.
 */
export function IncomingReceiptsCard({
  stock,
  unit,
}: {
  readonly stock: InventoryV2Row | undefined;
  readonly unit?: string | undefined;
}) {
  const { t } = useTranslation();
  const rows = stock?.incomingBy ?? [];
  if (rows.length === 0) return null;

  return (
    <Card withBorder radius="md" padding="md">
      <Stack gap="sm">
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon size={28} radius="md" variant="light" color="blue">
            <IconTruckDelivery size={16} stroke={1.75} />
          </ThemeIcon>
          <Stack gap={0}>
            <Text size="sm" fw={600}>
              {t('inventoryV2.incoming')}
            </Text>
            <Text size="xs" c="dimmed">
              {t('inventoryV2.incomingTooltip')}
            </Text>
          </Stack>
        </Group>

        <Table withRowBorders={false} verticalSpacing={4}>
          <Table.Tbody>
            {rows.map((row) => (
              <Table.Tr key={row.receiptId}>
                <Table.Td>
                  <ReceiptRef receiptId={row.receiptId} receiptNumber={row.receiptNumber} />
                </Table.Td>
                <Table.Td ta="right">
                  <QuantityWithUnit
                    value={`+${formatNumber(row.quantity)}`}
                    unit={unit}
                    color="blue"
                  />
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Stack>
    </Card>
  );
}

/**
 * A receipt whose number the contribution recorded. A row staged before the
 * number was carried has none — it still shows its quantity, unlinked, rather
 * than vanishing from a total it is part of.
 */
function ReceiptRef({
  receiptId,
  receiptNumber,
}: {
  readonly receiptId: string;
  readonly receiptNumber: string;
}) {
  const { t } = useTranslation();
  const chip = <EntityChip size="sm" label={receiptNumber || t('inventoryV2.incomingUnnamed')} />;
  if (!receiptNumber || !featureFlags.goodsReceiptsV2.enabled) return chip;
  return (
    <EntityAnchor to={ROUTES.GOODS_RECEIPTS_V2.DETAIL.replace(':id', receiptId)} size="sm">
      {chip}
    </EntityAnchor>
  );
}
