import {
  Anchor,
  Badge,
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
import { DetailField } from '@/components/DetailField';
import { useLookupV2Labels } from '@/hooks';
import type { PurchaseOrder } from '@/types';
import { formatDate } from '@/utils/dateFormat';
import { isLocationsEnabled, isPricingManagementEnabled, perms } from '@/utils/permission';
import { ArrivalText } from './ArrivalText';
import {
  PurchaseOrderItemsListMobile,
  PurchaseOrderItemsTableDesktop,
} from './PurchaseOrderItemsTable';
import { PurchaseOrderPaymentState, NO_CLAMP } from './PurchaseOrderPaymentState';
import { PurchaseOrderReceiptsInfo } from './PurchaseOrderReceiptsInfo';
import { arrivalFor, receiptsFor, type ArrivalsState } from './purchaseOrderArrivals';
import {
  leadTimeLabel,
  plannedArrivalIso,
  poCustomer,
  poExtra,
  poLeadTime,
  poOrderDateIso,
  poReceiptIds,
  poStatus,
  poVendorNote,
} from './purchaseOrderModel';
import { findPurchaseOrderStatus } from './purchaseOrderStatuses';
import { showPurchaseOrderVendor } from './purchaseOrderVendorAccess';

const isMobile = device.isMobile;
const locationsEnabled = isLocationsEnabled();
const showPrice = isPricingManagementEnabled() && perms.purchaseOrder.canViewPrice();
const showVendor = showPurchaseOrderVendor();

type Props = {
  readonly order: PurchaseOrder | null;
  readonly onClose: () => void;

  readonly arrivals: ArrivalsState;
  readonly employeeNameById: ReadonlyMap<string, string>;
};

export function PurchaseOrderPreviewDrawer({ order, onClose, arrivals, employeeNameById }: Props) {
  const { t } = useTranslation();
  const unitLabels = useLookupV2Labels('product-unit');

  const body =
    order &&
    (() => {
      const status = findPurchaseOrderStatus(poStatus(order));
      const customer = poCustomer(order);
      const leadTime = poLeadTime(order);
      const assignedTo = poExtra(order).assignedTo;
      const requestedBy = poExtra(order).requestedBy;
      const receipts = receiptsFor(arrivals, order);

      const showReceipts = poStatus(order) !== 'draft' || poReceiptIds(order).length > 0;
      const reference = typeof order.reference === 'string' ? order.reference.trim() : '';
      const notes = typeof order.notes === 'string' ? order.notes : '';
      const vendorNote = poVendorNote(order);
      return (
        <Stack gap="md">
          <Card withBorder radius="md" padding="md">
            <Stack gap="sm">
              <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="sm">
                <DetailField label={t('__new__.01-common.labels.status')}>
                  <Badge color={status.color} variant="light" styles={NO_CLAMP}>
                    {t(status.labelKey)}
                  </Badge>
                </DetailField>
                <DetailField label={t('common.labels.assignedTo')}>
                  {(assignedTo && employeeNameById.get(assignedTo)) || null}
                </DetailField>
                <DetailField label={t('purchaseOrders.form.requestedByLabel')}>
                  {(requestedBy && employeeNameById.get(requestedBy)) || null}
                </DetailField>
                <DetailField label={t('purchaseOrders.form.customerLabel')}>
                  {customer?.name || customer?.code || null}
                </DetailField>
                <DetailField label={t('purchaseOrders.columns.payment')}>
                  <PurchaseOrderPaymentState order={order} />
                </DetailField>
                <DetailField label={t('purchaseOrders.form.orderDateLabel')}>
                  {poOrderDateIso(order) ? formatDate(poOrderDateIso(order)) : null}
                </DetailField>
                <DetailField label={t('purchaseOrders.form.leadTimeLabel')}>
                  {leadTime
                    ? leadTimeLabel(leadTime, (min, max) =>
                        t('purchaseOrders.leadTime.range', { min, max }),
                      )
                    : null}
                </DetailField>
                <DetailField label={t('purchaseOrders.form.plannedArrivalLabel')}>
                  {plannedArrivalIso(order) ? formatDate(plannedArrivalIso(order)) : null}
                </DetailField>
                <DetailField label={t('purchaseOrders.form.actualArrivalLabel')}>
                  <ArrivalText arrival={arrivalFor(arrivals, order)} />
                </DetailField>
              </SimpleGrid>

              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
                {reference && (
                  <DetailField label={t('purchaseOrders.form.referenceLabel')}>
                    {reference}
                  </DetailField>
                )}
                {locationsEnabled && order.locationName && (
                  <DetailField label={t('purchaseOrders.form.locationLabel')}>
                    {order.locationName}
                  </DetailField>
                )}
                <DetailField label={t('purchaseOrders.form.vendorNoteLabel')}>
                  {vendorNote}
                </DetailField>
                <DetailField label={t('__new__.01-common.labels.note')}>{notes}</DetailField>
              </SimpleGrid>
            </Stack>
          </Card>

          {showReceipts &&
            (receipts === null ? (
              <Group gap="xs">
                <Loader size="xs" />
                <Text size="sm" c="dimmed">
                  {t('purchaseOrders.list.receiptsLoading')}
                </Text>
              </Group>
            ) : receipts.kind === 'unreadable' ? (
              <Text size="sm" c="dimmed">
                {t('purchaseOrders.list.receiptsUnreadable')}
              </Text>
            ) : receipts.receipts.length === 0 ? (
              <Text size="sm" c="dimmed" fs="italic">
                {t('purchaseOrders.detail.noReceipt')}
              </Text>
            ) : (
              <PurchaseOrderReceiptsInfo receipts={receipts.receipts} />
            ))}

          <Divider variant="dashed" />

          {isMobile ? (
            <PurchaseOrderItemsListMobile
              order={order}
              unitLabels={unitLabels}
              showPrice={showPrice}
            />
          ) : (
            <PurchaseOrderItemsTableDesktop
              order={order}
              unitLabels={unitLabels}
              showPrice={showPrice}
            />
          )}
        </Stack>
      );
    })();

  return (
    <Drawer
      opened={order !== null}
      onClose={onClose}
      position="bottom"
      size={isMobile ? '85%' : '75%'}
      title={
        order && (
          <Group gap="xs" wrap="nowrap">
            <Text fw={700}>{t('purchaseOrders.detailTitle')}</Text>
            {/* The order number links through to the detail page: the drawer is a preview, so the
                one way to the full record is the one navigation it offers. */}
            <Anchor
              component={Link}
              to={ROUTES.PURCHASE_ORDERS.DETAIL.replace(':id', order.id)}
              fw={600}
            >
              {order.orderNumber}
            </Anchor>
            {showVendor && <Text c="dimmed">{order.vendorName || '—'}</Text>}
          </Group>
        )
      }
    >
      {body}
    </Drawer>
  );
}
