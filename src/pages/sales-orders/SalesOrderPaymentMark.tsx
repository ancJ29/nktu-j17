import { Badge, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { SalesOrder } from '@/types';
import {
  computeSalesOrderTotals,
  isSalesOrderOverdue,
  isSalesOrderPaymentUntracked,
  resolveSalesOrderPaymentState,
} from '@/utils/salesOrderPricing';

const NO_CLAMP = {
  root: { maxWidth: 'none', overflow: 'visible', whiteSpace: 'nowrap' },
  label: { overflow: 'visible', textOverflow: 'clip', whiteSpace: 'nowrap' },
} as const;

export function SalesOrderPaymentMark({
  order,
  vatRate,
  todayVn,
}: {
  readonly order: SalesOrder;
  readonly vatRate: number;
  readonly todayVn: string;
}) {
  const { t } = useTranslation();
  if (order.extra?.cancellation != null) {
    return (
      <Text size="sm" c="dimmed">
        —
      </Text>
    );
  }
  if (isSalesOrderPaymentUntracked(order.extra)) {
    return (
      <Badge variant="light" size="sm" radius="sm" color="gray" w="max-content" styles={NO_CLAMP}>
        {t('salesOrders.billing.untracked')}
      </Badge>
    );
  }
  const { grandTotal } = computeSalesOrderTotals(order, vatRate);
  const payment = resolveSalesOrderPaymentState(order.extra, grandTotal);
  const overdue = isSalesOrderOverdue(order, todayVn, vatRate);
  return (
    <Stack gap={2} align="flex-start">
      <Badge
        variant="light"
        size="sm"
        radius="sm"
        w="max-content"
        styles={NO_CLAMP}
        color={payment.state === 'paid' ? 'teal' : payment.state === 'partial' ? 'orange' : 'gray'}
      >
        {t(`salesOrders.billing.${payment.state}`)}
      </Badge>
      {payment.state === 'partial' && (
        <Text size="xs" c="dimmed">
          {t('salesOrders.finance.leftToCollect', { amount: payment.remaining.toLocaleString() })}
        </Text>
      )}
      {overdue && (
        <Badge variant="filled" size="sm" radius="sm" color="red" w="max-content" styles={NO_CLAMP}>
          {t('salesOrders.billing.overdue')}
        </Badge>
      )}
    </Stack>
  );
}
