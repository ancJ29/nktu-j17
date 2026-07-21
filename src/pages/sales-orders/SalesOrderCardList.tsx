import {
  ActionIcon,
  Badge,
  Card,
  Checkbox,
  Divider,
  Group,
  Skeleton,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import { IconAlertTriangle, IconListDetails, IconRobot } from '@tabler/icons-react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import { ROUTES } from '@/constants/routes';
import { formatDate, formatDateTime } from '@/utils/dateFormat';
import type { SalesOrder, Employee } from '@/types';
import type { ResolvedStatusOption, ResolvedTagOption } from '@/utils/permission';
import { useMemo } from 'react';
import { SalesOrderStatusBadge } from '@/components/sales-orders/SalesOrderStatusBadge';
import { useCustomerStore } from '@/stores/useCustomerStore';
import { resolveSalesOrderCustomerName } from '@/utils/customerDisplay';
import { isCheatCompletedSalesOrder } from '@/utils/salesOrderCheatMarker';
import { resolveSalesOrderRowBg } from './urgencyRowBg';
import { getPricingVatRate } from '@/utils/permission';
import {
  computeSalesOrderTotals,
  isSalesOrderBillingExempt,
  isSalesOrderMissingMoneyInfo,
} from '@/utils/salesOrderPricing';
import { isNKTU } from '@/config/client';
import { NKTUSalesOrderStatusBadge } from '@/components/sales-orders/NKTUSalesOrderStatusBadge';

type SalesOrderCardListProps = {
  readonly orders: SalesOrder[];
  readonly isLoading?: boolean;
  readonly resolveStatus: (value: string | undefined | null) => ResolvedStatusOption;
  readonly resolveDeliveryMethod: (value: string | undefined | null) => string;
  readonly employees: Employee[];
  readonly tagOptions: ResolvedTagOption[];
  
  readonly onShowItems?: (order: SalesOrder) => void;
  
  readonly financeMode?: boolean;
  
  readonly onToggleBillingExempt?: (order: SalesOrder) => void;
  
  readonly showCheatMarker?: boolean;
  
  readonly vacuousCompletionIds?: ReadonlySet<string>;
};

function SalesOrderCardSkeleton() {
  return (
    <Card withBorder padding="md" radius="md">
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start">
          <Skeleton h={22} w="55%" />
          <Skeleton h={26} w={80} radius="xl" />
        </Group>
        <Stack gap={6}>
          <Skeleton h={14} w="75%" />
          <Skeleton h={14} w="65%" />
          <Skeleton h={14} w="80%" />
          <Skeleton h={14} w="55%" />
        </Stack>
      </Stack>
    </Card>
  );
}

function FieldRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Group gap="xs" wrap="nowrap" align="baseline">
      <Text size="sm" c="dimmed" style={{ flexShrink: 0 }}>
        {label}:
      </Text>
      <Text size="sm" fw={500} style={{ minWidth: 0, wordBreak: 'break-word' }}>
        {value}
      </Text>
    </Group>
  );
}

export function SalesOrderCardList({
  orders,
  isLoading,
  resolveStatus,
  resolveDeliveryMethod,
  employees,
  tagOptions,
  onShowItems,
  financeMode = false,
  onToggleBillingExempt,
  showCheatMarker = false,
  vacuousCompletionIds,
}: SalesOrderCardListProps) {
  const { t } = useTranslation();
  const vatRate = getPricingVatRate();
  const navigate = useNavigate();
  const getCustomerByCode = useCustomerStore((s) => s.getByCode);

  const employeeMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of employees) m.set(e.id, e.name);
    return m;
  }, [employees]);

  if (isLoading) {
    return (
      <Stack gap="sm">
        {Array.from({ length: 5 }, (_, i) => (
          <SalesOrderCardSkeleton key={i} />
        ))}
      </Stack>
    );
  }

  if (orders.length === 0) {
    return (
      <Text c="dimmed" ta="center" py="xl" size="sm">
        {t('salesOrders.noItems')}
      </Text>
    );
  }

  return (
    <Stack gap="sm">
      {orders.map((order) => {
        const extra = order.extra ?? {};
        const staffName = extra.assignedStaff ? employeeMap.get(extra.assignedStaff) : undefined;
        const createdByName = extra.createdBy ? employeeMap.get(extra.createdBy) : undefined;

        return (
          <Card
            key={order.id}
            withBorder
            radius="md"
            padding="md"
            bg={
              financeMode
                ? undefined
                : resolveSalesOrderRowBg(extra.isUrgent === true, resolveStatus(extra.status).stage)
            }
            onClick={() => navigate(ROUTES.SALES_ORDERS.DETAIL.replace(':id', order.id))}
            style={{ cursor: 'pointer' }}
          >
            <Stack gap="sm">
              <Group justify="space-between" wrap="nowrap" align="flex-start" gap="sm">
                <Group gap={6} wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                  <Text fw={700} size="lg" style={{ minWidth: 0, wordBreak: 'break-word' }}>
                    {order.orderNumber}
                  </Text>
                  {showCheatMarker && isCheatCompletedSalesOrder(order) && (
                    <Tooltip
                      label={t('salesOrders.cheatMarker.tooltip')}
                      withArrow
                      multiline
                      maw={260}
                    >
                      <Badge
                        color="grape"
                        variant="light"
                        size="xs"
                        leftSection={<IconRobot size={10} aria-hidden />}
                        style={{ flexShrink: 0 }}
                      >
                        {t('salesOrders.cheatMarker.label')}
                      </Badge>
                    </Tooltip>
                  )}
                  {vacuousCompletionIds?.has(order.id) && (
                    <Tooltip
                      label={t('salesOrders.vacuousCompletion.tooltip')}
                      withArrow
                      multiline
                      maw={280}
                    >
                      <Badge
                        color="red"
                        variant="light"
                        size="xs"
                        leftSection={<IconAlertTriangle size={10} aria-hidden />}
                        style={{ flexShrink: 0 }}
                      >
                        {t('salesOrders.vacuousCompletion.label')}
                      </Badge>
                    </Tooltip>
                  )}
                  {financeMode && isSalesOrderMissingMoneyInfo(order, vatRate) && (
                    <Badge
                      color="orange"
                      variant="light"
                      size="xs"
                      leftSection={<IconAlertTriangle size={10} aria-hidden />}
                      style={{ flexShrink: 0 }}
                    >
                      {t('salesOrders.finance.missingLabel')}
                    </Badge>
                  )}
                </Group>
                {onShowItems && (
                  <Tooltip label={t('salesOrders.detail.viewItems')} withArrow>
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      onClick={(e) => {
                        e.stopPropagation();
                        onShowItems(order);
                      }}
                    >
                      <IconListDetails size={18} />
                    </ActionIcon>
                  </Tooltip>
                )}
              </Group>

              <Stack gap={4}>
                <FieldRow
                  label={t('common.labels.customer')}
                  value={resolveSalesOrderCustomerName(order, getCustomerByCode) || '-'}
                />
                {staffName && (
                  <FieldRow label={t('salesOrders.detail.assignedStaff')} value={staffName} />
                )}
                {extra.orderDate && (
                  <FieldRow
                    label={t('salesOrders.form.orderDateLabel')}
                    value={formatDateTime(extra.orderDate)}
                  />
                )}
                {extra.deliveryDate && (
                  <FieldRow
                    label={t('salesOrders.detail.deliveryDate')}
                    value={formatDate(extra.deliveryDate)}
                  />
                )}
                {createdByName && (
                  <FieldRow label={t('salesOrders.detail.createdBy')} value={createdByName} />
                )}
                {financeMode &&
                  (() => {
                    const totals = computeSalesOrderTotals(order, vatRate);
                    return (
                      <>
                        <FieldRow
                          label={t('salesOrders.finance.subtotalLabel')}
                          value={totals.subtotal.toLocaleString()}
                        />
                        <FieldRow
                          label={t('salesOrders.finance.vatLabel')}
                          value={totals.vat.toLocaleString()}
                        />
                        <FieldRow
                          label={t('salesOrders.finance.grandTotalLabel')}
                          value={totals.grandTotal.toLocaleString()}
                        />
                        <FieldRow
                          label={t('salesOrders.billing.invoiceLabel')}
                          value={
                            order.extra?.invoiceIssued
                              ? t('salesOrders.billing.invoiceIssued')
                              : '—'
                          }
                        />
                        {onToggleBillingExempt && (
                          <Checkbox
                            mt={4}
                            size="sm"
                            label={t('salesOrders.finance.exemptLabel')}
                            checked={isSalesOrderBillingExempt(extra)}
                            onChange={() => onToggleBillingExempt(order)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                      </>
                    );
                  })()}
                <Divider variant="dashed" my="xs" />
                {isNKTU ? (
                  <NKTUSalesOrderStatusBadge
                    extra={extra}
                    resolveStatus={resolveStatus}
                    resolveDeliveryMethod={resolveDeliveryMethod}
                  />
                ) : (
                  <SalesOrderStatusBadge
                    extra={extra}
                    resolveStatus={resolveStatus}
                    resolveDeliveryMethod={resolveDeliveryMethod}
                    tagOptions={tagOptions}
                    size="sm"
                  />
                )}
              </Stack>
            </Stack>
          </Card>
        );
      })}
    </Stack>
  );
}
