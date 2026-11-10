import { type ReactNode } from 'react';
import { ActionIcon, Badge, Card, Group, Skeleton, Stack, Text } from '@mantine/core';
import { IconCopy, IconListDetails } from '@tabler/icons-react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import type { PurchaseOrder } from '@/types';
import { formatDate } from '@/utils/dateFormat';
import { businessDateString } from '@/utils/code';
import { isLocationsEnabled, isPricingManagementEnabled, perms } from '@/utils/permission';
import { findPurchaseOrderStatus } from './purchaseOrderStatuses';
import { ArrivalText } from './ArrivalText';
import { arrivalFor, type ArrivalsState } from './purchaseOrderArrivals';
import {
  formatMoney,
  isOverdue,
  orderTotal,
  poCurrency,
  poExtra,
  poIsPaid,
  poPayment,
  poItems,
  plannedArrivalIso,
  poCustomer,
  poOrderDateIso,
  poStatus,
} from './purchaseOrderModel';

const locationsEnabled = isLocationsEnabled();
const showPrice = isPricingManagementEnabled() && perms.purchaseOrder.canViewPrice();

type Props = {
  readonly orders: PurchaseOrder[];

  readonly arrivals: ArrivalsState;

  readonly employeeNameById: ReadonlyMap<string, string>;
  readonly isLoading?: boolean;
  readonly onShowItems?: (order: PurchaseOrder) => void;
};

function Fact({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <Stack gap={0}>
      <Text size="10px" c="dimmed" tt="uppercase" fw={600}>
        {label}
      </Text>
      {children}
    </Stack>
  );
}

function CardSkeleton() {
  return (
    <Card withBorder padding="sm">
      <Stack gap="xs">
        <Group justify="space-between">
          <Skeleton h={16} w="60%" />
          <Skeleton h={20} w={60} radius="xl" />
        </Group>
        <Skeleton h={12} w="40%" />
        <Skeleton h={12} w="70%" />
      </Stack>
    </Card>
  );
}

export function PurchaseOrderCardList({
  orders,
  arrivals,
  employeeNameById,
  isLoading,
  onShowItems,
}: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const today = businessDateString();

  if (isLoading) {
    return (
      <Stack gap="sm">
        {Array.from({ length: 5 }, (_, i) => (
          <CardSkeleton key={i} />
        ))}
      </Stack>
    );
  }
  if (orders.length === 0) {
    return (
      <Text c="dimmed" ta="center" py="xl" size="sm">
        {t('purchaseOrders.noItems')}
      </Text>
    );
  }

  return (
    <Stack gap="sm">
      {orders.map((o) => {
        const status = findPurchaseOrderStatus(poStatus(o));
        const overdue = isOverdue(o, today);
        const currency = poCurrency(o);
        const paidText = poIsPaid(o)
          ? t('purchaseOrders.payment.paid')
          : overdue
            ? t('purchaseOrders.payment.overdue')
            : poPayment(o).state === 'partial'
              ? t('purchaseOrders.payment.partial')
              : t('purchaseOrders.payment.unpaid');
        const meta = [
          t('purchaseOrders.columns.itemsCount', { count: poItems(o).length }),
          locationsEnabled ? o.locationName : null,
        ]
          .filter(Boolean)
          .join(' · ');
        return (
          <Card
            key={o.id}
            withBorder
            padding="sm"
            onClick={() => navigate(ROUTES.PURCHASE_ORDERS.DETAIL.replace(':id', o.id))}
            style={{ cursor: 'pointer' }}
          >
            <Stack gap={6}>
              <Group justify="space-between" wrap="nowrap" align="flex-start">
                <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                  <Group gap={6} wrap="nowrap" align="center">
                    <Text fw={700} size="md" truncate>
                      {o.orderNumber || '—'}
                    </Text>
                    {poExtra(o).copyFromId && (
                      <IconCopy size={12} color="var(--mantine-color-dimmed)" />
                    )}
                  </Group>
                  {o.reference && (
                    <Text size="xs" c="dimmed" ff="monospace" lineClamp={1}>
                      {o.reference}
                    </Text>
                  )}
                </Stack>
                <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
                  <Badge color={status.color} variant="light">
                    {t(status.labelKey)}
                  </Badge>
                  {onShowItems && (
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      aria-label={t('purchaseOrders.detail.viewItems')}
                      onClick={(e) => {
                        e.stopPropagation();
                        onShowItems(o);
                      }}
                    >
                      <IconListDetails size={18} />
                    </ActionIcon>
                  )}
                </Group>
              </Group>
              <Text size="sm" fw={600} lh={1.25} truncate>
                {o.vendorName || '—'}
              </Text>
              {poCustomer(o) && (
                <Text size="xs" lh={1.3} truncate>
                  {t('purchaseOrders.form.customerLabel')}:{' '}
                  {poCustomer(o)?.name || poCustomer(o)?.code}
                </Text>
              )}
              <Group gap="md" wrap="wrap">
                <Fact label={t('purchaseOrders.form.orderDateLabel')}>
                  <Text size="xs">{poOrderDateIso(o) ? formatDate(poOrderDateIso(o)) : '—'}</Text>
                </Fact>
                <Fact label={t('purchaseOrders.form.plannedArrivalLabel')}>
                  <Text size="xs">
                    {plannedArrivalIso(o) ? formatDate(plannedArrivalIso(o)) : '—'}
                  </Text>
                </Fact>
                <Fact label={t('purchaseOrders.form.actualArrivalLabel')}>
                  <ArrivalText size="xs" arrival={arrivalFor(arrivals, o)} />
                </Fact>
              </Group>
              {poExtra(o).assignedTo && (
                <Text size="xs" lh={1.3} truncate>
                  {t('common.labels.assignedTo')}:{' '}
                  {employeeNameById.get(poExtra(o).assignedTo!) ?? '—'}
                </Text>
              )}
              <Text size="xs" c="dimmed" lh={1.3}>
                {meta}
              </Text>
              <Group gap={8} wrap="wrap">
                <Badge variant="light" color={poIsPaid(o) ? 'green' : overdue ? 'red' : 'orange'}>
                  {paidText}
                </Badge>
                {o.paymentDeadline && !poIsPaid(o) && (
                  <Text size="xs" c={overdue ? 'red' : 'dimmed'}>
                    {t('purchaseOrders.payment.deadlineShort', {
                      date: formatDate(o.paymentDeadline),
                    })}
                  </Text>
                )}
                {showPrice && poPayment(o).state === 'partial' && (
                  <Text size="xs" c="dimmed">
                    {t('purchaseOrders.payment.leftShort', {
                      amount: `${formatMoney(poPayment(o).remaining, currency)} ${currency}`,
                    })}
                  </Text>
                )}
                {showPrice && (
                  <Text size="xs" fw={600}>
                    {formatMoney(orderTotal(o), currency)} {currency}
                  </Text>
                )}
              </Group>
            </Stack>
          </Card>
        );
      })}
    </Stack>
  );
}
