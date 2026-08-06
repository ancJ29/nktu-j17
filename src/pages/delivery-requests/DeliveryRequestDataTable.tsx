import { useCallback, useMemo, type Ref } from 'react';
import { useNavigate } from 'react-router';
import { Badge, Group, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import { useCustomerStore } from '@/stores/useCustomerStore';
import { useVendorStore } from '@/stores/useVendorStore';
import type { DeliveryRequest, DeliveryRequestExtra } from '@/types';
import { DeliveryRequestKindBadge } from './DeliveryRequestKindBadge';
import { deliveryRequestPartyIsCustomer } from './deliveryRequestParty';
import { DataTable } from '@credo/base-ui/components';
import { createCustomerShortNameResolver } from '@/utils/customerDisplay';
import { formatDate, formatDateTime } from '@/utils/dateFormat';
import { tableDensity, type ResolvedStatusOption } from '@/utils/permission';
import { resolveDeliveryRequestRowBg } from './urgencyRowBg';

type DeliveryRequestDataTableProps = {
  readonly requests: DeliveryRequest[];
  readonly isLoading?: boolean;
  readonly resolveStatus: (value: string | undefined | null) => ResolvedStatusOption;
  readonly viewportRef?: Ref<HTMLDivElement>;
};

export function DeliveryRequestDataTable({
  requests,
  isLoading,
  resolveStatus,
  viewportRef,
}: DeliveryRequestDataTableProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const customers = useCustomerStore((s) => s.items);
  const getVendorByCode = useVendorStore((s) => s.getByCode);
  const resolveCustomerShortName = useMemo(
    () => createCustomerShortNameResolver(customers),
    [customers],
  );

  const columns = useMemo(
    () => [
      {
        key: 'requestNumber',
        header: t('deliveryRequests.columns.requestNumber'),
        width: '250px',
        render: (item: DeliveryRequest) => {
          return (
            <Group gap="xs">
              <Text fz="md" fw={500}>
                {item.requestNumber}
              </Text>
            </Group>
          );
        },
      },
      {
        key: 'party',
        header: t('deliveryRequests.columns.party'),

        render: (item: DeliveryRequest) => {
          if (!deliveryRequestPartyIsCustomer(item)) {
            const vendor = item.vendorCode ? getVendorByCode(item.vendorCode) : undefined;
            const display =
              vendor?.extra?.shortName?.trim() || vendor?.name || item.vendorName || '-';
            return <Text fz="md">{display}</Text>;
          }

          const drExtra = (item.extra ?? {}) as DeliveryRequestExtra;
          const display = resolveCustomerShortName(item.customerName, drExtra.customerCode) || '-';
          return <Text fz="md">{display}</Text>;
        },
      },
      {
        key: 'scheduledDate',
        header: t('deliveryRequests.columns.scheduledDate'),
        render: (item: DeliveryRequest) => (
          <Text fz="sm">{item.scheduledDate ? formatDate(item.scheduledDate) : '-'}</Text>
        ),
      },
      {
        key: 'completedDate',
        header: t('deliveryRequests.columns.completedDate'),
        render: (item: DeliveryRequest) => {
          const extra = (item.extra ?? {}) as DeliveryRequestExtra;
          return (
            <Text fz="sm">
              {extra.deliveryTimestamp ? formatDateTime(extra.deliveryTimestamp) : '-'}
            </Text>
          );
        },
      },

      {
        key: 'driver',
        header: t('deliveryRequests.detail.driverLabel'),
        render: (item: DeliveryRequest) => {
          const extra = (item.extra ?? {}) as DeliveryRequestExtra;
          return <Text fz="sm">{extra.assignedDriverName || '-'}</Text>;
        },
      },
      {
        key: 'status',
        header: t('__new__.01-common.labels.status'),
        width: '250px',
        render: (item: DeliveryRequest) => {
          const status = resolveStatus((item.extra as { status?: string })?.status);
          const isUrgent = (item.extra as DeliveryRequestExtra | undefined)?.isUrgent === true;
          return (
            <Group>
              <DeliveryRequestKindBadge dr={item} variant="filled" size="sm" radius="lg" />
              {isUrgent && (
                <Badge color="red" variant="filled" size="sm" radius="lg">
                  {t('deliveryRequests.urgent')}
                </Badge>
              )}
              <Badge color={status.color} variant="filled" size="sm" radius="lg">
                {status.label}
              </Badge>
            </Group>
          );
        },
      },
    ],
    [t, resolveStatus, resolveCustomerShortName, getVendorByCode],
  );

  const handleRowClick = (item: DeliveryRequest) => {
    navigate(ROUTES.DELIVERY.DETAIL.replace(':id', item.id));
  };

  const getRowBg = useCallback(
    (item: DeliveryRequest & Record<string, unknown>) =>
      resolveDeliveryRequestRowBg(
        (item.extra as DeliveryRequestExtra | undefined)?.isUrgent === true,
        resolveStatus((item.extra as { status?: string })?.status).stage,
      ),
    [resolveStatus],
  );

  return (
    <DataTable
      withIndex
      noActions
      density={tableDensity()}
      maxHeight="calc(100vh - 250px)"
      viewportRef={viewportRef}
      data={requests as (DeliveryRequest & Record<string, unknown>)[]}
      columns={columns}
      isLoading={isLoading}
      emptyMessage={t('deliveryRequests.noItems')}
      onRowClick={handleRowClick}
      getRowBg={getRowBg}
    />
  );
}
