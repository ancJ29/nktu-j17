import {
  Anchor,
  Card,
  Divider,
  Drawer,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
} from '@mantine/core';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { device } from '@credo/base-ui/utils';
import { ROUTES } from '@/constants/routes';
import { AddressWithMapLink } from '@/components/AddressWithMapLink';
import { DetailField } from '@/components/DetailField';
import { EmployeeLink } from '@/components/EmployeeLink';
import { SalesOrderStatusBadgeBase } from '@/components/sales-orders/SalesOrderStatusBadgeBase';
import type { SalesOrderStatusBadgeVariant } from '@/components/sales-orders/salesOrderStatusBadgeVariant';
import type { DeliveryRequest, SalesOrder } from '@/types';
import { formatDate, formatDateTime } from '@/utils/dateFormat';
import { isDeliveryRequestsEnabled } from '@/utils/permission';
import { getSalesOrderReadyDate } from '@/utils/salesOrderReadyDate';
import { OrderItemsTable } from './OrderItemsTable';
import { SalesOrderDeliveryRequestInfo } from './SalesOrderDeliveryRequestInfo';
import { salesOrderFieldOptions } from './useSalesOrderFieldOptions';

const isMobile = device.isMobile;
const deliveryEnabled = isDeliveryRequestsEnabled();
const { resolveStatus, resolveDeliveryMethod, tagOptions } = salesOrderFieldOptions;

type SalesOrderItemsPreviewDrawerProps = {
  readonly order: SalesOrder | null;
  readonly onClose: () => void;

  readonly customerName: string | undefined;

  readonly linkedDRs: readonly DeliveryRequest[];

  readonly drsLoaded: boolean;

  readonly statusBadgeVariant: SalesOrderStatusBadgeVariant;
};

export function SalesOrderItemsPreviewDrawer({
  order,
  onClose,
  customerName,
  linkedDRs,
  drsLoaded,
  statusBadgeVariant,
}: SalesOrderItemsPreviewDrawerProps) {
  const { t } = useTranslation();

  const extra = order?.extra ?? {};
  const deliveryDate = extra.deliveryDate;

  return (
    <Drawer
      opened={order !== null}
      onClose={onClose}
      position="bottom"
      size={isMobile ? '85%' : '75%'}
      title={
        order && (
          <Group gap="xs" wrap="nowrap">
            <Text fw={700}>{t('salesOrders.detail.itemsTitle')}</Text>
            {/* The order number links through to the detail page — the drawer
                is a preview, so the escape hatch to the full record is the one
                navigation affordance it should offer. */}
            <Anchor
              component={Link}
              to={ROUTES.SALES_ORDERS.DETAIL.replace(':id', order.id)}
              fw={600}
            >
              {order.orderNumber}
            </Anchor>
            <Text c="dimmed">{customerName ?? ''}</Text>
          </Group>
        )
      }
    >
      {order && (
        <Stack gap="md">
          <Card withBorder radius="md" padding="md">
            <Stack gap="sm">
              <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="sm">
                {extra.customerPONumber && (
                  <DetailField label={t('salesOrders.form.customerPONumberLabel')}>
                    {extra.customerPONumber}
                  </DetailField>
                )}
                <DetailField label={t('__new__.01-common.labels.status')}>
                  <SalesOrderStatusBadgeBase
                    extra={extra}
                    resolveStatus={resolveStatus}
                    resolveDeliveryMethod={resolveDeliveryMethod}
                    tagOptions={tagOptions}
                    variant={statusBadgeVariant}
                  />
                </DetailField>
                <DetailField label={t('salesOrders.detail.assignedStaff')}>
                  {extra.assignedStaff ? <EmployeeLink id={extra.assignedStaff} /> : null}
                </DetailField>
                {/* Ready date, not `createdAt` — the list sorts and filters by
                    it, so the drawer must show the same date the row does. */}
                <DetailField label={t('__new__.01-common.labels.orderDate')}>
                  {formatDateTime(getSalesOrderReadyDate(order))}
                </DetailField>
                <DetailField label={t('salesOrders.columns.deliveryDate')}>
                  {deliveryDate ? formatDate(deliveryDate) : null}
                </DetailField>
                <DetailField label={t('salesOrders.detail.deliveryMethod')}>
                  {extra.deliveryMethod ? resolveDeliveryMethod(extra.deliveryMethod) : null}
                </DetailField>
              </SimpleGrid>

              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
                <DetailField label={t('common.labels.deliveryAddress')}>
                  <AddressWithMapLink
                    address={extra.deliveryAddress}
                    googleMapUrl={extra.googleMapUrl}
                  />
                </DetailField>
                <DetailField label={t('__new__.01-common.labels.note')}>{order.notes}</DetailField>
              </SimpleGrid>
            </Stack>
          </Card>

          {deliveryEnabled &&
            (!drsLoaded ? (
              <Group gap="xs">
                <Loader size="xs" />
                <Text size="sm" c="dimmed">
                  {t('salesOrders.detail.linkedDRsLoading')}
                </Text>
              </Group>
            ) : linkedDRs.length > 0 ? (
              <SalesOrderDeliveryRequestInfo requests={[...linkedDRs]} compact={isMobile} />
            ) : (
              <Text size="sm" c="dimmed" fs="italic">
                {t('salesOrders.detail.noDRsReadonly')}
              </Text>
            ))}

          <Divider variant="dashed" />

          <OrderItemsTable
            items={order.items}
            totalAmount={order.totalAmount}
            showShortageAlert={false}
          />
        </Stack>
      )}
    </Drawer>
  );
}
