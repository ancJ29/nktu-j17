import { Badge, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { PurchaseOrder } from '@/types';
import { formatDate } from '@/utils/dateFormat';
import { isPricingManagementEnabled, perms } from '@/utils/permission';
import { businessDateString } from '@/utils/code';
import { PAYMENT_STATE_COLOR } from '@/utils/paymentStateColor';
import {
  formatMoney,
  isOverdue,
  poCurrency,
  poIsPaid,
  poPayment,
  poPaymentUntracked,
} from './purchaseOrderModel';

export const NO_CLAMP = {
  root: { maxWidth: 'none', overflow: 'visible', whiteSpace: 'nowrap' },
  label: { overflow: 'visible', textOverflow: 'clip', whiteSpace: 'nowrap' },
} as const;

const showPrice = isPricingManagementEnabled() && perms.purchaseOrder.canViewPrice();

export function PurchaseOrderPaymentState({ order: item }: { readonly order: PurchaseOrder }) {
  const { t } = useTranslation();
  const overdue = isOverdue(item, businessDateString());

  if (poPaymentUntracked(item)) {
    return (
      <Badge
        variant="light"
        w="max-content"
        styles={NO_CLAMP}
        color={PAYMENT_STATE_COLOR.untracked}
      >
        {t('purchaseOrders.payment.untracked')}
      </Badge>
    );
  }
  return (
    <Stack gap={2}>
      <Badge
        variant="light"
        w="max-content"
        styles={NO_CLAMP}
        color={
          PAYMENT_STATE_COLOR[
            poIsPaid(item)
              ? 'paid'
              : overdue
                ? 'overdue'
                : poPayment(item).state === 'partial'
                  ? 'partial'
                  : 'unpaid'
          ]
        }
      >
        {poIsPaid(item)
          ? t('purchaseOrders.payment.paid')
          : overdue
            ? t('purchaseOrders.payment.overdue')
            : poPayment(item).state === 'partial'
              ? t('purchaseOrders.payment.partial')
              : t('purchaseOrders.payment.unpaid')}
      </Badge>
      {showPrice && poPayment(item).state === 'partial' && (
        <Text size="xs" c="dimmed">
          {t('purchaseOrders.payment.leftShort', {
            amount: `${formatMoney(poPayment(item).remaining, poCurrency(item))} ${poCurrency(item)}`,
          })}
        </Text>
      )}
      {item.paymentDeadline && !poIsPaid(item) && (
        <Text size="xs" c={overdue ? 'red' : 'dimmed'}>
          {t('purchaseOrders.payment.deadlineShort', {
            date: formatDate(item.paymentDeadline),
          })}
        </Text>
      )}
    </Stack>
  );
}
