import { Card, Group, Stack, Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { SalesOrderFinanceSummary } from '@/utils/salesOrderPricing';

export function SalesOrderFinanceTotals({ summary }: { summary: SalesOrderFinanceSummary }) {
  const { t } = useTranslation();

  return (
    <Card
      withBorder
      radius="md"
      padding="sm"
      shadow="sm"
      
      
      
      bg="var(--mantine-color-body)"
      style={{ position: 'sticky', bottom: 0, zIndex: 3 }}
    >
      <Group justify="space-between" wrap="wrap" gap="lg">
        <Group gap="lg" wrap="wrap">
          <Cell
            label={t('salesOrders.finance.totalsCount')}
            value={summary.count.toLocaleString()}
          />
          <Cell
            label={t('salesOrders.finance.subtotalLabel')}
            value={summary.subtotal.toLocaleString()}
          />
          <Cell label={t('salesOrders.finance.vatLabel')} value={summary.vat.toLocaleString()} />
          <Cell
            label={t('salesOrders.finance.grandTotalLabel')}
            value={summary.grandTotal.toLocaleString()}
            strong
          />
        </Group>
        {summary.missingCount > 0 && (
          <Group gap={6} wrap="nowrap" c="orange">
            <IconAlertTriangle size={16} aria-hidden />
            <Text size="sm" fw={500}>
              {t('salesOrders.finance.totalsMissing', { count: summary.missingCount })}
            </Text>
          </Group>
        )}
      </Group>
    </Card>
  );
}

function Cell({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <Stack gap={0}>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text size="md" fw={strong ? 700 : 600}>
        {value}
      </Text>
    </Stack>
  );
}
