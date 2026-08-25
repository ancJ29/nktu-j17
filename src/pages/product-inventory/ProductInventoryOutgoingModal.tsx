import { useEffect, useMemo } from 'react';
import { Group, Loader, Stack, Table, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';

import { ResponsiveModal } from '@/components/ResponsiveModal';
import { SalesOrderLink } from '@/components/SalesOrderLink';
import { lookupLabelOf, useLookupV2Labels } from '@/hooks';
import { useCustomerStore } from '@/stores/useCustomerStore';
import type { Product, SalesOrderExtra } from '@/types';
import { createCustomerShortNameResolver } from '@/utils/customerDisplay';
import type { ReservationRollup } from './productInventoryReservations';
import { ReservationStatusBadge } from './ReservationStatusBadge';
import type { ReservationOrderStatusSource } from './useReservationOrderStatus';

type Props = {
  readonly opened: boolean;
  readonly onClose: () => void;

  readonly product: Product | null;
  readonly reservations: readonly ReservationRollup[];

  readonly orderStatus: ReservationOrderStatusSource;
};

export function ProductInventoryOutgoingModal({
  opened,
  onClose,
  product,
  reservations,
  orderStatus,
}: Props) {
  const { t } = useTranslation();
  const unitLabels = useLookupV2Labels('unit');

  const customers = useCustomerStore((s) => s.items);
  const customersInitialized = useCustomerStore((s) => s.initialized);
  const loadCustomers = useCustomerStore((s) => s.loadAll);

  const hydrateOrders = orderStatus.hydrate;
  useEffect(() => {
    if (!opened) return;
    if (!customersInitialized) loadCustomers();

    hydrateOrders(true);
  }, [opened, customersInitialized, loadCustomers, hydrateOrders]);

  const resolveCustomerName = useMemo(
    () => createCustomerShortNameResolver(customers),
    [customers],
  );

  const rows = useMemo(
    () =>
      reservations.map((r) => {
        const state = orderStatus.resolve(r.id);
        const extra = (state.order?.extra ?? {}) as SalesOrderExtra;

        const customer =
          resolveCustomerName(
            extra.customerName ?? r.customerName,
            extra.customerCode ?? r.customerCode,
          ) ?? undefined;
        const quantity = Object.entries(r.byUnit)
          .filter(([, q]) => q !== 0)
          .map(([u, q]) => `${q.toLocaleString()} ${lookupLabelOf(unitLabels, u)}`)
          .join(' + ');
        return { ...r, customer, state, quantity };
      }),
    [reservations, orderStatus, resolveCustomerName, unitLabels],
  );

  const showLoader = orderStatus.firstLoad;

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
                    <ReservationStatusBadge
                      state={r.state}

                      fallback={
                        <Text size="sm" c="dimmed">
                          —
                        </Text>
                      }
                    />
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
