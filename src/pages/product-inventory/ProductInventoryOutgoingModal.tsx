import { useEffect, useMemo } from 'react';
import { Badge, Group, Loader, Stack, Table, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';

import { ResponsiveModal } from '@/components/ResponsiveModal';
import { SalesOrderLink } from '@/components/SalesOrderLink';
import { lookupLabelOf, useLookupLabels } from '@/hooks';
import { useCustomerStore } from '@/stores/useCustomerStore';
import { setSalesOrderQueryRange, useSalesOrderStore } from '@/stores/useSalesOrderStore';
import type { Product, SalesOrderExtra } from '@/types';
import { createCustomerShortNameResolver } from '@/utils/customerDisplay';
import { defaultLastNDaysRange } from '@/utils/listFilterDateRange';
import { salesOrderFieldOptions } from '@/pages/sales-orders/useSalesOrderFieldOptions';
import { getCancellationTargetStatusValue } from '@/pages/sales-orders/transitionEngine';
import type { ReservationRollup } from './productInventoryReservations';

const SO_FETCH_DAYS = 90;

type Props = {
  readonly opened: boolean;
  readonly onClose: () => void;

  readonly product: Product | null;
  readonly reservations: readonly ReservationRollup[];
};

export function ProductInventoryOutgoingModal({ opened, onClose, product, reservations }: Props) {
  const { t } = useTranslation();
  const unitLabels = useLookupLabels('unit');

  const salesOrders = useSalesOrderStore((s) => s.items);
  const salesOrdersInitialized = useSalesOrderStore((s) => s.initialized);
  const salesOrdersLoading = useSalesOrderStore((s) => s.loading);
  const loadSalesOrders = useSalesOrderStore((s) => s.loadAll);
  const refreshSalesOrders = useSalesOrderStore((s) => s.forceRefresh);

  const customers = useCustomerStore((s) => s.items);
  const customersInitialized = useCustomerStore((s) => s.initialized);
  const loadCustomers = useCustomerStore((s) => s.loadAll);

  const soFetchRange = useMemo(() => defaultLastNDaysRange(SO_FETCH_DAYS), []);

  useEffect(() => {
    if (!opened) return;
    if (!customersInitialized) loadCustomers();
    setSalesOrderQueryRange(soFetchRange.from, soFetchRange.to);

    if (salesOrdersInitialized) refreshSalesOrders();
    else loadSalesOrders();
  }, [
    opened,
    customersInitialized,
    salesOrdersInitialized,
    loadCustomers,
    loadSalesOrders,
    refreshSalesOrders,
    soFetchRange,
  ]);

  const orderById = useMemo(() => {
    const m = new Map<string, (typeof salesOrders)[number]>();
    for (const so of salesOrders) m.set(so.id, so);
    return m;
  }, [salesOrders]);

  const resolveCustomerName = useMemo(
    () => createCustomerShortNameResolver(customers),
    [customers],
  );

  const rows = useMemo(
    () =>
      reservations.map((r) => {
        const order = orderById.get(r.id);
        const extra = (order?.extra ?? {}) as SalesOrderExtra;

        const customer =
          resolveCustomerName(
            extra.customerName ?? r.customerName,
            extra.customerCode ?? r.customerCode,
          ) ?? undefined;

        const cancelled = order ? extra.cancellation != null : false;
        const statusValue = cancelled
          ? (getCancellationTargetStatusValue() ?? extra.status)
          : extra.status;
        const status = statusValue ? salesOrderFieldOptions.resolveStatus(statusValue) : undefined;
        const quantity = Object.entries(r.byUnit)
          .filter(([, q]) => q !== 0)
          .map(([u, q]) => `${q.toLocaleString()} ${lookupLabelOf(unitLabels, u)}`)
          .join(' + ');
        return { ...r, customer, status, cancelled, quantity };
      }),
    [reservations, orderById, resolveCustomerName, unitLabels],
  );

  const showLoader = salesOrdersLoading && !salesOrdersInitialized;

  return (
    <ResponsiveModal
      opened={opened}
      onClose={onClose}

      size="xl"
      title={
        <Stack gap={0}>
          <Text fw={600}>{t('productInventory.outgoing.modalTitle')}</Text>
          {product && (
            <Text size="xs" c="dimmed">
              {product.name}
            </Text>
          )}
        </Stack>
      }
    >
      {showLoader ? (
        <Group justify="center" py="xl">
          <Loader size="sm" />
        </Group>
      ) : (
        <Table.ScrollContainer minWidth={560} type="native">
          <Table highlightOnHover verticalSpacing="xs" fz="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('productInventory.outgoing.colOrder')}</Table.Th>
                <Table.Th ta="right">{t('productInventory.outgoing.colQuantity')}</Table.Th>
                <Table.Th>{t('productInventory.outgoing.colStatus')}</Table.Th>
                <Table.Th>{t('productInventory.outgoing.colCustomer')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((r) => (
                <Table.Tr key={r.id}>
                  <Table.Td>
                    <SalesOrderLink id={r.id} fallbackLabel={r.orderNumber} size="xs" />
                  </Table.Td>
                  <Table.Td ta="right">
                    <Text size="sm" fw={600} c="orange">
                      {r.quantity}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    {r.status ? (
                      <Badge
                        size="sm"
                        variant={r.cancelled ? 'filled' : 'light'}
                        color={r.cancelled ? 'red' : r.status.color}
                        tt="none"
                      >
                        {r.status.label || t('salesOrders.cancel.statusBadge')}
                      </Badge>
                    ) : r.cancelled ? (
                      <Badge size="sm" variant="filled" color="red" tt="none">
                        {t('salesOrders.cancel.statusBadge')}
                      </Badge>
                    ) : (
                      <Text size="sm" c="dimmed">
                        —
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" lineClamp={1}>
                      {r.customer ?? '—'}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
    </ResponsiveModal>
  );
}
