import { useTranslation } from 'react-i18next';
import { featureFlags } from '@/config';
import { perms } from '@/utils/permission';
import type { SalesOrderV2 } from '@/types/sales-order-v2';

export type SalesOrderPaymentStatus = NonNullable<SalesOrderV2['paymentStatus']>;

export const PAYMENT_STATUSES: readonly SalesOrderPaymentStatus[] = [
  'unpaid',
  'partial',
  'paid',
] as const;

export const paymentTrackingOn = featureFlags.salesOrdersV2.paymentTracking;

export const canManagePayment = () => perms.salesOrder.canManagePayment();

export const paymentStatusOf = (order: SalesOrderV2): SalesOrderPaymentStatus =>
  order.paymentStatus ?? 'unpaid';

export const PAYMENT_COLORS: Record<SalesOrderPaymentStatus, string> = {
  unpaid: 'gray',
  partial: 'yellow',
  paid: 'green',
};

export function useSalesOrderPaymentLabel(): (status: SalesOrderPaymentStatus) => string {
  const { t } = useTranslation();
  return (status) =>
    t(
      status === 'paid'
        ? 'salesOrdersV2.payment.paid'
        : status === 'partial'
          ? 'salesOrdersV2.payment.partial'
          : 'salesOrdersV2.payment.unpaid',
    );
}
