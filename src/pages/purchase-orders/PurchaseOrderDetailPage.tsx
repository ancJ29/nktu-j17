import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Divider,
  Grid,
  Group,
  Modal,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconCash,
  IconCheck,
  IconClipboardList,
  IconCopy,
  IconEdit,
  IconFileText,
  IconHistory,
  IconNote,
  IconPaperclip,
  IconPhoto,
  IconPrinter,
  IconArrowBackUp,
  IconPackageImport,
  IconSend,
  IconTruckDelivery,
  IconX,
} from '@tabler/icons-react';
import { useCallback, useState } from 'react';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { ROUTES } from '@/constants/routes';
import { CodeLabel, FieldLabel, Tabs } from '@credo/base-ui/components';
import { device } from '@credo/base-ui/utils';
import { ActivityByTargetPanel } from '@/components/activity/ActivityByTargetPanel';
import { EmployeeLink } from '@/components/EmployeeLink';
import { SectionCard } from '@/components/SectionCard';
import { ImageUploadPanel } from '@/components/ImageUploadPanel';
import { AttachmentPanel } from '@/components/AttachmentPanel';
import { ArrivalText } from './ArrivalText';
import { PurchaseOrderPaymentForm } from './PurchaseOrderPaymentForm';
import { CustomerLink } from '@/components/CustomerLink';
import { VendorLink } from '@/components/VendorLink';
import { useLookupV2Labels } from '@/hooks';
import { formatDate, formatDateTime } from '@/utils/dateFormat';
import { getCompanyInfo } from '@/config/companyInfo';
import { PURCHASE_ORDER_PALETTE } from '@/config/printDefaults';
import { useProductStore } from '@/stores/useProductStore';
import { poAttachments, poPhotos } from './purchaseOrderModel';
import { useVendorStore } from '@/stores/useVendorStore';
import { lookupLabelOf, useProductPhotoByCode } from '@/hooks';
import { indexProductsByCode } from '@/utils/productByCode';
import type { Orientation, PaperSize } from '@/utils/printDocument';
import {
  DEFAULT_PURCHASE_ORDER_PRINT_OPTIONS,
  printPurchaseOrder,
  toPurchaseOrderPrintDataFromOrder,
} from '@/pages/goods-receipts/purchaseOrderPrint';
import { isoToVnDateString } from '@/utils/dateTimeField';
import {
  hasImagesForProducts,
  isActivityLoggingEnabled,
  isLocationsEnabled,
} from '@/utils/permission';
import { businessDateString } from '@/utils/code';
import { PurchaseOrderReceiptsInfo } from './PurchaseOrderReceiptsInfo';
import { PurchaseOrderStatusStrip } from './PurchaseOrderStatusStrip';
import {
  PurchaseOrderItemsListMobile,
  PurchaseOrderItemsTableDesktop,
} from './PurchaseOrderItemsTable';
import { usePurchaseOrderDetail, type ConfirmAction } from './usePurchaseOrderDetail';
import { showPurchaseOrderVendor } from './purchaseOrderVendorAccess';
import { printOffered } from './purchaseOrderStatuses';
import {
  formatMoney,
  isOverdue,
  orderTotal,
  poCurrency,
  poExtra,
  poIsPaid,
  poItems,
  plannedArrivalDay,
  poCustomer,
  plannedArrivalIso,
  poLeadTime,
  leadTimeLabel,
  poOrderDateIso,
  poPayment,
  poPaymentUntracked,
  poVendorNote,
} from './purchaseOrderModel';

const isMobile = device.isMobile;

const CONFIRM_TEXT = {
  ready: {
    title: 'purchaseOrders.confirm.readyTitle',
    message: 'purchaseOrders.confirm.readyMessage',
    button: 'purchaseOrders.actions.markReady',
    color: 'blue',
  },
  cancel: {
    title: 'purchaseOrders.confirm.cancelTitle',
    message: 'purchaseOrders.confirm.cancelMessage',
    button: 'purchaseOrders.actions.cancel',
    color: 'red',
  },
  received: {
    title: 'purchaseOrders.confirm.receivedTitle',
    message: 'purchaseOrders.confirm.receivedMessage',
    button: 'purchaseOrders.actions.markReceived',
    color: 'green',
  },
  unreceive: {
    title: 'purchaseOrders.confirm.unreceiveTitle',
    message: 'purchaseOrders.confirm.unreceiveMessage',
    button: 'purchaseOrders.actions.undoReceived',
    color: 'blue',
  },
} as const satisfies Record<
  ConfirmAction,
  { title: string; message: string; button: string; color: string }
>;
const locationsEnabled = isLocationsEnabled();
const showProductPhoto = hasImagesForProducts();
const showVendor = showPurchaseOrderVendor();

const activityLogTabVisible = isActivityLoggingEnabled();

export function PurchaseOrderDetailPage() {
  const { t } = useTranslation();
  const d = usePurchaseOrderDetail(t);
  const { order, loading, status, statusOption } = d;
  const unitLabels = useLookupV2Labels('product-unit');
  const products = useProductStore((s) => s.items);
  const photoByCode = useProductPhotoByCode();

  const [printOpened, printHandlers] = useDisclosure(false);
  const [paperSize, setPaperSize] = useState<PaperSize>(
    DEFAULT_PURCHASE_ORDER_PRINT_OPTIONS.paperSize,
  );
  const [orientation, setOrientation] = useState<Orientation>(
    DEFAULT_PURCHASE_ORDER_PRINT_OPTIONS.orientation,
  );
  const [includePrice, setIncludePrice] = useState(true);

  const [activeTab, setActiveTab] = useState<string | null>('items');
  const [visitedTabs, setVisitedTabs] = useState<ReadonlySet<string>>(() => new Set(['items']));
  const selectTab = useCallback((value: string | null) => {
    setActiveTab(value);
    if (value === null) return;
    setVisitedTabs((prev) => (prev.has(value) ? prev : new Set(prev).add(value)));
  }, []);

  if (loading || !order || !status || !statusOption) return null;

  const pricesOnSheet = d.showPrice && includePrice;

  const handlePrint = () => {
    const ok = printPurchaseOrder(
      toPurchaseOrderPrintDataFromOrder({
        order,
        vendor: useVendorStore.getState().getByCode(order.vendorCode),
        buyer: getCompanyInfo(),
        unitLabelOf: (unit) => lookupLabelOf(unitLabels, unit),
        photoByCode,
        productByCode: indexProductsByCode(products),
        showPhoto: showProductPhoto,
      }),
      {
        paperSize,
        orientation: pricesOnSheet ? 'landscape' : orientation,

        includeExpectedDelivery: !!plannedArrivalDay(order),
        includePrice: pricesOnSheet,
        palette: PURCHASE_ORDER_PALETTE,
      },
    );
    printHandlers.close();
    if (!ok) {
      notifications.show({
        color: 'red',
        message: t('goodsReceipts.print.popupBlocked'),
        autoClose: 8000,
      });
    }
  };

  const currency = poCurrency(order);
  const overdue = isOverdue(order, businessDateString());
  const extra = poExtra(order);
  const headerColor = statusOption.color;

  const titleBlock = (
    <Group
      gap={isMobile ? 'sm' : 'md'}
      wrap="nowrap"
      align="flex-start"
      style={{ minWidth: 0, flex: 1 }}
    >
      <ThemeIcon size={isMobile ? 56 : 72} radius={12} variant="light" color={headerColor}>
        <IconFileText size={isMobile ? 28 : 32} />
      </ThemeIcon>
      <Stack gap={6} style={{ minWidth: 0, flex: 1 }}>
        <Stack gap={2} style={{ minWidth: 0 }}>
          <Title order={isMobile ? 5 : 3} lh={1.2}>
            {t('purchaseOrders.detailTitle')}
          </Title>
          <CodeLabel code={order.orderNumber || '—'} size={isMobile ? 'xs' : 'sm'} />
        </Stack>
        <Group gap={6} wrap="wrap" align="center">
          <Badge
            color={statusOption.color}
            variant="filled"
            size={isMobile ? 'sm' : 'md'}
            radius="sm"
          >
            {t(statusOption.labelKey)}
          </Badge>
          <Badge
            variant="light"
            size={isMobile ? 'sm' : 'md'}
            radius="sm"
            color={poIsPaid(order) ? 'green' : overdue ? 'red' : 'orange'}
          >
            {poIsPaid(order)
              ? t('purchaseOrders.payment.paid')
              : overdue
                ? t('purchaseOrders.payment.overdue')
                : poPayment(order).state === 'partial'
                  ? t('purchaseOrders.payment.partial')
                  : t('purchaseOrders.payment.unpaid')}
          </Badge>
          {showVendor && (
            <>
              <Text span size="sm" c="dimmed" fs="italic">
                {t('purchaseOrders.detail.to')}
              </Text>
              <VendorLink code={order.vendorCode} name={order.vendorName} size="sm" />
            </>
          )}
          {locationsEnabled && order.locationName && (
            <Text span size="sm" fw={600}>
              · {order.locationName}
            </Text>
          )}
        </Group>
      </Stack>
    </Group>
  );

  const hero = d.showPrice ? (
    <Stack gap={4} align={isMobile ? 'flex-start' : 'flex-end'} style={{ flexShrink: 0 }}>
      <FieldLabel>{t('purchaseOrders.detail.totalLabel')}</FieldLabel>
      <Group gap={6} wrap="nowrap" align="baseline">
        <Text size={isMobile ? 'lg' : '28px'} fw={800} lh={1.1}>
          {formatMoney(orderTotal(order), currency)}
        </Text>
        <Text size="sm" c="dimmed">
          {currency}
        </Text>
      </Group>
    </Stack>
  ) : null;

  const buttons = (size: 'compact-sm' | 'sm') => ({
    print:
      !isMobile && printOffered(status, showVendor) ? (
        <Button
          variant="subtle"
          size={size}
          leftSection={<IconPrinter size={14} />}
          onClick={printHandlers.open}
        >
          {t('goodsReceipts.print.action')}
        </Button>
      ) : null,
    copy: d.showCopyCta ? (
      <Button
        variant="subtle"
        size={size}
        leftSection={<IconCopy size={14} />}
        onClick={d.handleCopy}
      >
        {t('common.actions.copy')}
      </Button>
    ) : null,
    makeReceipt: d.showMakeReceiptCta ? (
      <Button
        size={size}
        leftSection={<IconPackageImport size={14} />}
        onClick={d.handleMakeReceipt}
      >
        {t('purchaseOrders.actions.makeReceipt')}
      </Button>
    ) : null,
    edit: d.showEditCta ? (
      <Button
        component={Link}
        to={ROUTES.PURCHASE_ORDERS.EDIT.replace(':id', order.id)}
        variant="default"
        size={size}
        leftSection={<IconEdit size={14} />}
      >
        {t('common.actions.edit')}
      </Button>
    ) : null,
    cancel: d.showCancelCta ? (
      <Button
        variant="light"
        color="red"
        size={size}
        leftSection={<IconX size={14} />}
        onClick={() => d.openConfirm('cancel')}
      >
        {t('purchaseOrders.actions.cancel')}
      </Button>
    ) : null,
    markReady: d.showReadyCta ? (
      <Button
        color="blue"
        size={size}
        leftSection={<IconSend size={14} />}
        onClick={() => d.openConfirm('ready')}
      >
        {t('purchaseOrders.actions.markReady')}
      </Button>
    ) : null,
    markReceived:
      d.receivedOffer === 'mark' ? (
        <Button
          color="green"
          size={size}
          leftSection={<IconTruckDelivery size={14} />}
          onClick={() => d.openConfirm('received')}
        >
          {t('purchaseOrders.actions.markReceived')}
        </Button>
      ) : null,

    undoReceived:
      d.receivedOffer === 'undo' ? (
        <Button
          variant="default"
          size={size}
          leftSection={<IconArrowBackUp size={14} />}
          onClick={() => d.openConfirm('unreceive')}
        >
          {t('purchaseOrders.actions.undoReceived')}
        </Button>
      ) : null,
  });

  const phoneButtons = buttons('compact-sm');
  const actions = (
    <Group gap="xs" wrap="wrap">
      {phoneButtons.print}
      {phoneButtons.copy}
      {phoneButtons.makeReceipt}
      {phoneButtons.edit}
      {phoneButtons.cancel}
      {phoneButtons.undoReceived}
      {phoneButtons.markReady}
      {phoneButtons.markReceived}
    </Group>
  );

  const leadTime = poLeadTime(order);
  const generalCard = (
    <SectionCard
      icon={<IconClipboardList size={14} />}
      title={t('purchaseOrders.detail.cardGeneral')}
    >
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        {showVendor && (
          <Stack gap={4}>
            <FieldLabel>{t('common.labels.vendor')}</FieldLabel>
            <VendorLink code={order.vendorCode} name={order.vendorName} size="sm" />
          </Stack>
        )}
        <Field label={t('purchaseOrders.form.currencyLabel')} value={currency} />
        <Stack gap={4}>
          <FieldLabel>{t('purchaseOrders.form.customerLabel')}</FieldLabel>
          <CustomerLink
            code={poCustomer(order)?.code}
            name={poCustomer(order)?.code ? undefined : poCustomer(order)?.name}
            fallbackLabel={poCustomer(order)?.name}
            size="sm"
          />
        </Stack>
        <Field
          label={t('purchaseOrders.form.orderDateLabel')}
          value={formatDate(poOrderDateIso(order)) || '—'}
        />
        <Field
          label={t('purchaseOrders.form.leadTimeLabel')}
          value={
            leadTime
              ? leadTimeLabel(leadTime, (min, max) =>
                  t('purchaseOrders.leadTime.range', { min, max }),
                )
              : '—'
          }
        />
        <Stack gap={4}>
          <FieldLabel>{t('purchaseOrders.form.actualArrivalLabel')}</FieldLabel>
          <ArrivalText arrival={d.arrival} />
        </Stack>
        <Field
          label={t('purchaseOrders.form.plannedArrivalLabel')}
          value={plannedArrivalIso(order) ? formatDate(plannedArrivalIso(order)) : '—'}
        />
        {order.reference?.trim() && (
          <Field label={t('purchaseOrders.form.referenceLabel')} value={order.reference} mono />
        )}
        <Stack gap={4}>
          <FieldLabel>{t('common.labels.assignedTo')}</FieldLabel>
          {extra.assignedTo ? (
            <EmployeeLink id={extra.assignedTo} size="sm" />
          ) : (
            <Text size="sm" c="dimmed" fs="italic">
              {t('purchaseOrders.detail.noAssignedTo')}
            </Text>
          )}
        </Stack>
        <Stack gap={4}>
          <FieldLabel>{t('purchaseOrders.form.requestedByLabel')}</FieldLabel>
          {extra.requestedBy ? (
            <EmployeeLink id={extra.requestedBy} size="sm" />
          ) : (
            <Text size="sm" c="dimmed" fs="italic">
              {t('purchaseOrders.detail.noRequestedBy')}
            </Text>
          )}
        </Stack>
      </SimpleGrid>
    </SectionCard>
  );

  const paymentCard = (
    <SectionCard
      icon={<IconCash size={14} />}
      title={t('purchaseOrders.detail.cardPayment')}
      padding="md"
      actions={
        d.canMarkPaid ? (
          <Tooltip label={t('purchaseOrders.payment.edit')}>
            <ActionIcon
              variant="light"
              size="md"
              onClick={d.openPayment}
              aria-label={t('purchaseOrders.payment.edit')}
            >
              <IconEdit size={14} />
            </ActionIcon>
          </Tooltip>
        ) : undefined
      }
    >
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <Stack gap={4}>
          <FieldLabel>{t('purchaseOrders.columns.payment')}</FieldLabel>
          <Group gap={6}>
            <Badge
              variant="light"
              color={
                poPaymentUntracked(order)
                  ? 'gray'
                  : poIsPaid(order)
                    ? 'green'
                    : overdue
                      ? 'red'
                      : 'orange'
              }
            >
              {poPaymentUntracked(order)
                ? t('purchaseOrders.payment.untracked')
                : poIsPaid(order)
                  ? t('purchaseOrders.payment.paid')
                  : overdue
                    ? t('purchaseOrders.payment.overdue')
                    : poPayment(order).state === 'partial'
                      ? t('purchaseOrders.payment.partial')
                      : t('purchaseOrders.payment.unpaid')}
            </Badge>
            {poPaymentUntracked(order) && d.canMarkPaid && (
              <Button variant="light" size="compact-sm" onClick={() => void d.trackAgain()}>
                {t('purchaseOrders.payment.trackAgain')}
              </Button>
            )}
            {d.showPrice && poPayment(order).state === 'partial' && (
              <Text size="xs" c="dimmed">
                {t('purchaseOrders.payment.paidRemaining', {
                  paid: formatMoney(poPayment(order).paid, currency),
                  remaining: formatMoney(poPayment(order).remaining, currency),
                  currency,
                })}
              </Text>
            )}
            {poIsPaid(order) && order.paidAt && (
              <Text size="xs" c="dimmed">
                {formatDateTime(order.paidAt)}
              </Text>
            )}
          </Group>
        </Stack>
        <Stack gap={4}>
          <FieldLabel>{t('purchaseOrders.form.paymentDeadlineLabel')}</FieldLabel>
          <Text size="sm" fw={500} c={overdue ? 'red' : undefined}>
            {order.paymentDeadline ? formatDate(order.paymentDeadline) : '-'}
          </Text>
        </Stack>
      </SimpleGrid>
    </SectionCard>
  );

  const showReceiptsCard = status !== 'draft' || (order.receiptIds ?? []).length > 0;
  const receiptRows = d.receipts?.kind === 'ok' ? d.receipts.receipts : [];
  const receiptsCard = showReceiptsCard ? (
    <SectionCard
      icon={<IconPackageImport size={14} />}
      title={t('purchaseOrders.detail.cardReceipts')}
      padding="md"
    >
      <Stack gap="xs">
        {d.receiptsUnreadable && (
          <Alert color="red" variant="light" icon={<IconAlertTriangle size={16} />}>
            {t('purchaseOrders.detail.receiptsUnreadable')}
          </Alert>
        )}
        {d.receipts === null && !d.receiptsUnreadable && (
          <Text size="sm" c="dimmed">
            …
          </Text>
        )}
        {d.receipts?.kind === 'ok' && receiptRows.length === 0 && (
          <Text size="sm" c="dimmed" fs="italic">
            {t('purchaseOrders.detail.noReceipt')}
          </Text>
        )}
        <PurchaseOrderReceiptsInfo receipts={receiptRows} />
      </Stack>
    </SectionCard>
  ) : null;

  const itemsCard = (
    <SectionCard
      icon={<IconPackageImport size={14} />}
      title={t('purchaseOrders.detail.cardItems')}
      padding="md"
    >
      {poItems(order).length === 0 ? (
        <Text size="sm" c="dimmed" fs="italic">
          —
        </Text>
      ) : isMobile ? (
        <PurchaseOrderItemsListMobile
          order={order}
          unitLabels={unitLabels}
          showPrice={d.showPrice}
        />
      ) : (
        <PurchaseOrderItemsTableDesktop
          order={order}
          unitLabels={unitLabels}
          showPrice={d.showPrice}
        />
      )}
    </SectionCard>
  );

  const notesCard = (
    <SectionCard
      icon={<IconNote size={14} />}
      title={t('__new__.01-common.labels.note')}
      padding="md"
    >
      <Stack gap="sm">
        <Stack gap={4}>
          <FieldLabel>{t('purchaseOrders.form.vendorNoteLabel')}</FieldLabel>
          {poVendorNote(order).trim() ? (
            <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
              {poVendorNote(order)}
            </Text>
          ) : (
            <Text size="sm" c="dimmed" fs="italic">
              {t('purchaseOrders.detail.noNotes')}
            </Text>
          )}
        </Stack>
        <Stack gap={4}>
          <FieldLabel>{t('__new__.01-common.labels.note')}</FieldLabel>
          {order.notes?.trim() ? (
            <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
              {order.notes}
            </Text>
          ) : (
            <Text size="sm" c="dimmed" fs="italic">
              {t('purchaseOrders.detail.noNotes')}
            </Text>
          )}
        </Stack>
      </Stack>
    </SectionCard>
  );

  const photosCard = (
    <div data-testid="po-photos-card">
      <SectionCard
        icon={<IconPhoto size={14} />}
        title={t('purchaseOrders.detail.cardPhotos')}
        padding="md"
      >
        <ImageUploadPanel
          images={poPhotos(order)}
          onChange={d.handlePhotosChange}
          imageDirectory={d.mediaDirectory}
          editable={d.canChangeMedia}
          marker={order.orderNumber ?? ''}
          currentUserId={d.currentEmployee?.id}
          currentUserName={d.currentEmployee?.name}
          uploadControl={isMobile ? 'button' : 'auto'}
        />
      </SectionCard>
    </div>
  );

  const filesCard = (
    <div data-testid="po-files-card">
      <SectionCard icon={<IconPaperclip size={14} />} title={t('attachments.title')} padding="md">
        <AttachmentPanel
          attachments={poAttachments(order)}
          onChange={d.handleAttachmentsChange}
          imageDirectory={d.mediaDirectory}
          editable={d.canChangeMedia}
          currentUserId={d.currentEmployee?.id}
          currentUserName={d.currentEmployee?.name}
        />
      </SectionCard>
    </div>
  );

  const body = (
    <Stack gap={isMobile ? 'md' : 'lg'}>
      {generalCard}
      {paymentCard}
      {receiptsCard}
      {itemsCard}
      {notesCard}
      {d.showMedia && photosCard}
      {d.showMedia && filesCard}
    </Stack>
  );

  const phonePage = (
    <Stack gap={isMobile ? 'md' : 'lg'}>
      {!isMobile && (
        <Group justify="space-between">
          <Button
            onClick={() => window.history.back()}
            variant="subtle"
            size="compact-sm"
            leftSection={<IconArrowLeft size={16} />}
          >
            {t('common.actions.back')}
          </Button>
          {actions}
        </Group>
      )}
      <Group
        align="flex-start"
        justify="space-between"
        wrap={isMobile ? 'wrap' : 'nowrap'}
        gap="lg"
      >
        {titleBlock}
        {hero}
      </Group>
      {isMobile && actions}
      <PurchaseOrderStatusStrip order={order} compact={isMobile} />
      {activityLogTabVisible ? (
        <Tabs defaultValue="order" keepMounted={false}>
          <Tabs.List>
            <Tabs.Tab value="order" leftSection={<IconClipboardList size={16} />}>
              {t('purchaseOrders.detail.tabOrder')}
            </Tabs.Tab>
            <Tabs.Tab value="activityLog" leftSection={<IconHistory size={16} />}>
              {t('purchaseOrders.detail.tabActivityLog')}
            </Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="order" pt="md">
            {body}
          </Tabs.Panel>
          {/* `keepMounted={false}` lazy-mounts this: the panel fetches on mount. */}
          <Tabs.Panel value="activityLog" pt="md">
            <ActivityByTargetPanel targetId={order.id} i18nNamespace="purchaseOrders.detail" />
          </Tabs.Panel>
        </Tabs>
      ) : (
        body
      )}
    </Stack>
  );

  const desk = buttons('sm');
  const back = buttons('compact-sm');
  const hasActionRow = !!(
    desk.markReady ||
    desk.markReceived ||
    desk.undoReceived ||
    desk.makeReceipt ||
    desk.cancel
  );
  const paymentBadgeColor = poPaymentUntracked(order)
    ? 'gray'
    : poIsPaid(order)
      ? 'green'
      : overdue
        ? 'red'
        : 'orange';
  const paymentBadgeLabel = poPaymentUntracked(order)
    ? t('purchaseOrders.payment.untracked')
    : poIsPaid(order)
      ? t('purchaseOrders.payment.paid')
      : overdue
        ? t('purchaseOrders.payment.overdue')
        : poPayment(order).state === 'partial'
          ? t('purchaseOrders.payment.partial')
          : t('purchaseOrders.payment.unpaid');

  const infoCard = (
    <Card withBorder padding="md">
      <Stack gap="md">
        <Group justify="flex-start" align="flex-start" wrap="wrap" gap="xl">
          {showVendor && (
            <Stack gap={2} style={{ minWidth: 0 }}>
              <FieldLabel>{t('common.labels.vendor')}</FieldLabel>
              <Text size="md" fw={600} component="div">
                <VendorLink code={order.vendorCode} name={order.vendorName} />
                {locationsEnabled && order.locationName && (
                  <Text span size="sm" fw={600}>
                    {' '}
                    · {order.locationName}
                  </Text>
                )}
              </Text>
            </Stack>
          )}
          <Stack gap={2} style={{ minWidth: 0 }}>
            <FieldLabel>{t('purchaseOrders.form.customerLabel')}</FieldLabel>
            <Text size="md" fw={600} component="div">
              <CustomerLink
                code={poCustomer(order)?.code}
                name={poCustomer(order)?.code ? undefined : poCustomer(order)?.name}
                fallbackLabel={poCustomer(order)?.name}
              />
            </Text>
          </Stack>
        </Group>

        <Divider variant="dashed" />

        <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
          <Stack gap={4}>
            <FieldLabel>{t('common.labels.assignedTo')}</FieldLabel>
            {extra.assignedTo ? (
              <EmployeeLink id={extra.assignedTo} size="sm" />
            ) : (
              <Text size="sm" c="dimmed" fs="italic">
                {t('purchaseOrders.detail.noAssignedTo')}
              </Text>
            )}
          </Stack>
          <Stack gap={4}>
            <FieldLabel>{t('purchaseOrders.form.requestedByLabel')}</FieldLabel>
            {extra.requestedBy ? (
              <EmployeeLink id={extra.requestedBy} size="sm" />
            ) : (
              <Text size="sm" c="dimmed" fs="italic">
                {t('purchaseOrders.detail.noRequestedBy')}
              </Text>
            )}
          </Stack>
          <Field
            label={t('purchaseOrders.form.leadTimeLabel')}
            value={
              leadTime
                ? leadTimeLabel(leadTime, (min, max) =>
                    t('purchaseOrders.leadTime.range', { min, max }),
                  )
                : '—'
            }
          />
          <Field
            label={t('purchaseOrders.form.plannedArrivalLabel')}
            value={plannedArrivalIso(order) ? formatDate(plannedArrivalIso(order)) : '—'}
          />
          <Stack gap={4}>
            <FieldLabel>{t('purchaseOrders.form.actualArrivalLabel')}</FieldLabel>
            <ArrivalText arrival={d.arrival} />
          </Stack>
        </SimpleGrid>

        <Grid gutter="md">
          {order.reference?.trim() && (
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Field label={t('purchaseOrders.form.referenceLabel')} value={order.reference} mono />
            </Grid.Col>
          )}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Stack gap={4}>
              <FieldLabel>{t('purchaseOrders.form.vendorNoteLabel')}</FieldLabel>
              {poVendorNote(order).trim() ? (
                <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                  {poVendorNote(order)}
                </Text>
              ) : (
                <Text size="sm" c="dimmed" fs="italic">
                  {t('purchaseOrders.detail.noNotes')}
                </Text>
              )}
            </Stack>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Stack gap={4}>
              <FieldLabel>{t('__new__.01-common.labels.note')}</FieldLabel>
              {order.notes?.trim() ? (
                <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                  {order.notes}
                </Text>
              ) : (
                <Text size="sm" c="dimmed" fs="italic">
                  {t('purchaseOrders.detail.noNotes')}
                </Text>
              )}
            </Stack>
          </Grid.Col>
        </Grid>

        <Divider variant="dashed" />

        <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
          <Field label={t('purchaseOrders.form.currencyLabel')} value={currency} />
          {d.showPrice && (
            <Stack gap={4}>
              <FieldLabel>{t('purchaseOrders.detail.totalLabel')}</FieldLabel>
              <Text size="sm" fw={600}>
                {formatMoney(orderTotal(order), currency)}
              </Text>
            </Stack>
          )}
          <Stack gap={4}>
            <FieldLabel>{t('purchaseOrders.columns.payment')}</FieldLabel>
            <Group gap={6}>
              <Badge variant="light" color={paymentBadgeColor}>
                {paymentBadgeLabel}
              </Badge>
              {d.canMarkPaid && (
                <Tooltip label={t('purchaseOrders.payment.edit')}>
                  <ActionIcon
                    variant="light"
                    size="md"
                    onClick={d.openPayment}
                    aria-label={t('purchaseOrders.payment.edit')}
                  >
                    <IconEdit size={14} />
                  </ActionIcon>
                </Tooltip>
              )}
              {poPaymentUntracked(order) && d.canMarkPaid && (
                <Button variant="light" size="compact-sm" onClick={() => void d.trackAgain()}>
                  {t('purchaseOrders.payment.trackAgain')}
                </Button>
              )}
              {d.showPrice && poPayment(order).state === 'partial' && (
                <Text size="xs" c="dimmed">
                  {t('purchaseOrders.payment.paidRemaining', {
                    paid: formatMoney(poPayment(order).paid, currency),
                    remaining: formatMoney(poPayment(order).remaining, currency),
                    currency,
                  })}
                </Text>
              )}
              {poIsPaid(order) && order.paidAt && (
                <Text size="xs" c="dimmed">
                  {formatDateTime(order.paidAt)}
                </Text>
              )}
            </Group>
          </Stack>
          <Stack gap={4}>
            <FieldLabel>{t('purchaseOrders.form.paymentDeadlineLabel')}</FieldLabel>
            <Text size="sm" fw={500} c={overdue ? 'red' : undefined}>
              {order.paymentDeadline ? formatDate(order.paymentDeadline) : '-'}
            </Text>
          </Stack>
        </SimpleGrid>
      </Stack>
    </Card>
  );

  const deskTabs = (
    <Tabs value={activeTab} onChange={selectTab}>
      <Tabs.List>
        <Tabs.Tab value="items" leftSection={<IconPackageImport size={16} />}>
          {t('purchaseOrders.detail.cardItems')}
        </Tabs.Tab>
        {showReceiptsCard && (
          <Tabs.Tab value="receipts" leftSection={<IconPackageImport size={16} />}>
            {t('purchaseOrders.detail.cardReceipts')}
          </Tabs.Tab>
        )}
        {activityLogTabVisible && (
          <Tabs.Tab value="activityLog" leftSection={<IconHistory size={16} />}>
            {t('purchaseOrders.detail.tabActivityLog')}
          </Tabs.Tab>
        )}
        {d.showMedia && (
          <Tabs.Tab value="photos" leftSection={<IconPhoto size={16} />}>
            {t('purchaseOrders.detail.cardPhotos')}
          </Tabs.Tab>
        )}
        {d.showMedia && (
          <Tabs.Tab value="files" leftSection={<IconPaperclip size={16} />}>
            {t('attachments.title')}
          </Tabs.Tab>
        )}
      </Tabs.List>

      <Tabs.Panel value="items" pt="md">
        {itemsCard}
      </Tabs.Panel>
      {showReceiptsCard && (
        <Tabs.Panel value="receipts" pt="md">
          {receiptsCard}
        </Tabs.Panel>
      )}
      {activityLogTabVisible && (
        <Tabs.Panel value="activityLog" pt="md">
          {activeTab === 'activityLog' && (
            <ActivityByTargetPanel targetId={order.id} i18nNamespace="purchaseOrders.detail" />
          )}
        </Tabs.Panel>
      )}
      {d.showMedia && (
        <Tabs.Panel value="photos" pt="md">
          {visitedTabs.has('photos') && photosCard}
        </Tabs.Panel>
      )}
      {d.showMedia && (
        <Tabs.Panel value="files" pt="md">
          {filesCard}
        </Tabs.Panel>
      )}
    </Tabs>
  );

  const desktopPage = (
    <Stack gap="lg">
      <Group justify="space-between">
        <Button
          onClick={() => window.history.back()}
          variant="subtle"
          size="compact-sm"
          leftSection={<IconArrowLeft size={16} />}
        >
          {t('common.actions.back')}
        </Button>
        <Group gap="xs" wrap="wrap">
          {back.print}
          {back.copy}
          {back.edit}
        </Group>
      </Group>

      <Group justify="space-between" wrap="nowrap" align="center">
        <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
          <Title order={3} ff="monospace" style={{ letterSpacing: '0.3px' }}>
            {order.orderNumber || '—'}
          </Title>
          <Badge color={statusOption.color} variant="filled" size="md">
            {t(statusOption.labelKey)}
          </Badge>
        </Group>
        <Text size="sm" c="dimmed">
          {t('purchaseOrders.form.orderDateLabel')} · {formatDate(poOrderDateIso(order)) || '—'}
        </Text>
      </Group>

      {hasActionRow && (
        <Group gap="xs" wrap="wrap">
          <FieldLabel>{t('purchaseOrders.detail.availableActions')}</FieldLabel>
          {desk.markReady}
          {desk.markReceived}
          {desk.makeReceipt}
          {desk.undoReceived}
          {desk.cancel}
        </Group>
      )}

      <PurchaseOrderStatusStrip order={order} compact={false} />

      {infoCard}

      {deskTabs}
    </Stack>
  );

  return (
    <>
      {isMobile ? phonePage : desktopPage}

      <Modal
        opened={d.confirmOpened}
        onClose={() => {
          if (!d.actionLoading) d.closeConfirm();
        }}
        title={t(CONFIRM_TEXT[d.confirmAction].title)}
        centered
      >
        <Stack gap="md">
          <Text size="sm">{t(CONFIRM_TEXT[d.confirmAction].message)}</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={d.closeConfirm} disabled={d.actionLoading}>
              {t('common.actions.cancel')}
            </Button>
            <Button
              color={CONFIRM_TEXT[d.confirmAction].color}
              loading={d.actionLoading}
              leftSection={
                d.confirmAction === 'cancel' ? <IconX size={14} /> : <IconCheck size={14} />
              }
              onClick={d.runAction}
            >
              {t(CONFIRM_TEXT[d.confirmAction].button)}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={printOpened}
        onClose={printHandlers.close}
        title={t('goodsReceipts.print.optionsTitle')}
        size="sm"
      >
        <Stack gap="md">
          <Stack gap={6}>
            <Text size="sm" fw={500}>
              {t('goodsReceipts.print.paperSize')}
            </Text>
            <SegmentedControl
              fullWidth
              value={paperSize}
              onChange={(v) => setPaperSize(v as PaperSize)}
              data={[
                { value: 'A4', label: 'A4' },
                { value: 'A5', label: 'A5' },
              ]}
            />
          </Stack>
          <Stack gap={6}>
            <Text size="sm" fw={500}>
              {t('goodsReceipts.print.orientation')}
            </Text>
            <SegmentedControl
              fullWidth
              disabled={pricesOnSheet}
              value={pricesOnSheet ? 'landscape' : orientation}
              onChange={(v) => setOrientation(v as Orientation)}
              data={[
                { value: 'portrait', label: t('goodsReceipts.print.portrait') },
                { value: 'landscape', label: t('goodsReceipts.print.landscape') },
              ]}
            />
          </Stack>
          {d.showPrice && (
            <Stack gap={4}>
              <Switch
                label={t('purchaseOrders.print.includePrice')}
                checked={includePrice}
                onChange={(e) => setIncludePrice(e.currentTarget.checked)}
              />
              {includePrice && (
                <Text size="xs" c="dimmed">
                  {t('purchaseOrders.print.landscapeNote')}
                </Text>
              )}
            </Stack>
          )}
          <Group justify="flex-end" gap="sm">
            <Button variant="default" size="sm" onClick={printHandlers.close}>
              {t('common.actions.cancel')}
            </Button>
            <Button size="sm" leftSection={<IconPrinter size={14} />} onClick={handlePrint}>
              {t('goodsReceipts.print.submit')}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={d.paymentOpened}
        onClose={d.closePayment}
        title={t('purchaseOrders.payment.editTitle')}
        centered
      >
        <PurchaseOrderPaymentForm
          initialState={poPayment(order).state}
          initialAmount={poPayment(order).paid || undefined}
          total={orderTotal(order)}
          currency={currency}
          showPrice={d.showPrice}
          initialDeadline={isoToVnDateString(order.paymentDeadline)}
          loading={d.actionLoading}
          onCancel={d.closePayment}
          onSave={d.savePayment}
        />
      </Modal>
    </>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  readonly label: string;
  readonly value: string;
  readonly mono?: boolean;
}) {
  return (
    <Stack gap={4}>
      <FieldLabel>{label}</FieldLabel>
      <Text size="sm" fw={500} ff={mono ? 'monospace' : undefined}>
        {value || '-'}
      </Text>
    </Stack>
  );
}
