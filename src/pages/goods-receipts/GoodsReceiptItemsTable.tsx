import { Box, Card, Group, Stack, Table, Text, ThemeIcon } from '@mantine/core';
import { IconEdit } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { FieldLabel } from '@credo/base-ui/components';
import { ProductLink } from '@/components/ProductLink';
import { lookupLabelOf, type useLookupV2Labels } from '@/hooks';
import type { GoodsReceiptItem } from '@/types';
import { resolveBaseUnitDisplay, type PackagingAwareEntity } from './goodsReceiptUnitDisplay';

export type GoodsReceiptItemsProps = {
  readonly items: readonly GoodsReceiptItem[];
  readonly unitLabels: ReturnType<typeof useLookupV2Labels>;
  readonly products: readonly PackagingAwareEntity[];

  readonly onItemTap?: (idx: number) => void;
};

export function GoodsReceiptItemsTableDesktop(props: GoodsReceiptItemsProps) {
  const { t } = useTranslation();

  const showSubtotal = props.items.length >= 2;
  const unitTotals = new Map<string, number>();
  if (showSubtotal) {
    for (const it of props.items) {
      const u = it.unit || '';
      unitTotals.set(u, (unitTotals.get(u) ?? 0) + it.quantity);
    }
  }
  const subtotalEntries = Array.from(unitTotals.entries()).filter(([u]) => u);

  return (
    <Box style={{ overflowX: 'auto' }}>
      <Table striped highlightOnHover verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th w={36}>#</Table.Th>
            <Table.Th w={400}>{t('common.labels.name')}</Table.Th>
            <Table.Th w={140} style={{ textAlign: 'right' }}>
              {t('common.labels.quantity')}
            </Table.Th>
            <Table.Th ta="right">{t('__new__.01-common.labels.note')}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {props.items.map((item, idx) => {
            const baseTail = resolveBaseUnitDisplay(item, props.products, props.unitLabels);
            return (
              <Table.Tr key={idx}>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {idx + 1}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Group gap={6} wrap="nowrap" align="center">
                    <ProductLink code={item.itemCode} name={item.itemName} />
                  </Group>
                </Table.Td>
                <Table.Td style={{ textAlign: 'right' }}>
                  <Stack gap={2} align="flex-end">
                    <Group gap={4} wrap="nowrap" justify="flex-end" align="baseline">
                      <Text size="sm" fw={700}>
                        {item.quantity.toLocaleString()}
                      </Text>
                      <Text size="sm" c="dimmed">
                        {lookupLabelOf(props.unitLabels, item.unit)}
                      </Text>
                    </Group>
                    {baseTail && (
                      <Text size="xs" c="dimmed" lh={1.2}>
                        {baseTail}
                      </Text>
                    )}
                  </Stack>
                </Table.Td>
                <Table.Td ta="right">
                  {item.note ? (
                    <Text size="sm">{item.note}</Text>
                  ) : (
                    <Text size="sm" c="dimmed" fs="italic">
                      —
                    </Text>
                  )}
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
        {showSubtotal && subtotalEntries.length > 0 && (
          <Table.Tfoot>
            <Table.Tr>
              <Table.Td />
              <Table.Td>
                <FieldLabel>{t('goodsReceipts.detail.itemsSubtotal')}</FieldLabel>
              </Table.Td>
              <Table.Td style={{ textAlign: 'right' }}>
                <Stack gap={2} align="flex-end">
                  {subtotalEntries.map(([u, q]) => (
                    <Group key={u} gap={4} wrap="nowrap" justify="flex-end" align="baseline">
                      <Text size="sm" fw={700}>
                        {q.toLocaleString()}
                      </Text>
                      <Text size="sm" c="dimmed">
                        {lookupLabelOf(props.unitLabels, u)}
                      </Text>
                    </Group>
                  ))}
                </Stack>
              </Table.Td>
              <Table.Td />
            </Table.Tr>
          </Table.Tfoot>
        )}
      </Table>
    </Box>
  );
}

export function GoodsReceiptItemsListMobile(props: GoodsReceiptItemsProps) {
  const tappable = !!props.onItemTap;
  return (
    <Stack gap="xs">
      {props.items.map((item, idx) => {
        const baseTail = resolveBaseUnitDisplay(item, props.products, props.unitLabels);
        const onTap = props.onItemTap;
        return (
          <Card
            key={idx}
            withBorder
            padding="sm"
            radius="sm"
            onClick={onTap ? () => onTap(idx) : undefined}
            style={onTap ? { cursor: 'pointer' } : undefined}
          >
            <Group gap="sm" wrap="nowrap" align="flex-start">
              <Stack gap={6} style={{ flex: 1, minWidth: 0 }}>
                <Text size="sm" fw={600} lh={1.3}>
                  {tappable ? (
                    item.itemName
                  ) : (
                    <ProductLink code={item.itemCode} name={item.itemName} size="sm" />
                  )}
                </Text>
                <Group gap={6} wrap="nowrap" align="baseline">
                  <Text size="lg" fw={800} lh={1}>
                    {item.quantity.toLocaleString()}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {lookupLabelOf(props.unitLabels, item.unit)}
                  </Text>
                  {baseTail && (
                    <Text size="xs" c="dimmed">
                      · {baseTail}
                    </Text>
                  )}
                </Group>
                {item.note && (
                  <Text size="xs" c="dimmed" style={{ whiteSpace: 'pre-wrap' }}>
                    {item.note}
                  </Text>
                )}
              </Stack>
              {tappable && (
                <ThemeIcon
                  variant="light"
                  color="gray"
                  size="md"
                  radius="md"
                  style={{ flexShrink: 0 }}
                >
                  <IconEdit size={14} />
                </ThemeIcon>
              )}
            </Group>
          </Card>
        );
      })}
    </Stack>
  );
}
