import { Badge } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { SalesOrderV2 } from '@/types/sales-order-v2';
import { salesOrderDeliveryOf } from './deliveryProgress';
import { salesOrderIsTerminal } from './statusFlow';

export function SalesOrderDeliveryBadge({ order }: { readonly order: SalesOrderV2 }) {
  const { t } = useTranslation();

  if (salesOrderIsTerminal(order.status)) return null;
  if (salesOrderDeliveryOf(order).state !== 'partial') return null;
  return (
    <Badge size="sm" variant="light" color="yellow">
      {t('salesOrdersV2.delivery.partial')}
    </Badge>
  );
}
