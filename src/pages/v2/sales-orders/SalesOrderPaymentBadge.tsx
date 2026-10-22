import { Badge } from '@mantine/core';
import type { SalesOrderV2 } from '@/types/sales-order-v2';
import { PAYMENT_COLORS, paymentStatusOf, useSalesOrderPaymentLabel } from './payment';

export function SalesOrderPaymentBadge({ order }: { readonly order: SalesOrderV2 }) {
  const labelOf = useSalesOrderPaymentLabel();
  const status = paymentStatusOf(order);
  return (
    <Badge size="sm" variant="light" color={PAYMENT_COLORS[status]}>
      {labelOf(status)}
    </Badge>
  );
}
