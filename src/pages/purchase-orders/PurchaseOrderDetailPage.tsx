import {
  ActionIcon,
  Alert,
  Badge,
  Button,
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
  IconPrinter,
  IconPackageImport,
  IconSend,
  IconX,
} from '@tabler/icons-react';
import { useState } from 'react';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { ROUTES } from '@/constants/routes';
import { GoodsReceiptLink } from '@/components/GoodsReceiptLink';
import { findStatus as findReceiptStatus } from '@/pages/goods-receipts/goodsReceiptStatuses';
import { CodeLabel, FieldLabel, Tabs } from '@credo/base-ui/components';
import { device } from '@credo/base-ui/utils';
import { ActivityByTargetPanel } from '@/components/activity/ActivityByTargetPanel';
import { DateField } from '@/components/DateField';
import { EmployeeLink } from '@/components/EmployeeLink';
import { SectionCard } from '@/components/SectionCard';
import { ArrivalText } from './ArrivalText';
import { CustomerLink } from '@/components/CustomerLink';
import { VendorLink } from '@/components/VendorLink';
import { useLookupV2Labels } from '@/hooks';
import { formatDate, formatDateTime } from '@/utils/dateFormat';
import { getCompanyInfo } from '@/config/companyInfo';
import { PURCHASE_ORDER_PALETTE } from '@/config/printDefaults';
import { useProductStore } from '@/stores/useProductStore';
import { useVendorStore } from '@/stores/useVendorStore';
import { lookupLabelOf, useProductPhotoByCode } from '@/hooks';
import { indexProductsByCode } from '@/utils/productByCode';
import type { Orientation, PaperSize } from '@/utils/printDocument';
import {
  DEFAULT_PURCHASE_ORDER_PRINT_OPTIONS,
  printPurchaseOrder,
  toPurchaseOrderPrintDataFromOrder,
} from '@/pages/goods-receipts/purchaseOrderPrint';
import { isoToVnDateString, vnDateStringToIso } from '@/utils/dateTimeField';
import { NumberField } from '@/components/NumberField';
import type { PurchaseOrderCurrency } from '@/types';
import {
  hasImagesForProducts,
  isActivityLoggingEnabled,
  isLocationsEnabled,
} from '@/utils/permission';
import { businessDateString } from '@/utils/code';
import { PurchaseOrderStatusStrip } from './PurchaseOrderStatusStrip';
import {
  PurchaseOrderItemsListMobile,
  PurchaseOrderItemsTableDesktop,
} from './PurchaseOrderItemsTable';
import { usePurchaseOrderDetail } from './usePurchaseOrderDetail';
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
} from './purchaseOrderModel';
import {
  salesOrderPaymentAdviceOf,
  type PaymentDraftState,
} from '@/pages/sales-orders/salesOrderPaymentAdvice';

const isMobile = device.isMobile;
const locationsEnabled = isLocationsEnabled();
const showProductPhoto = hasImagesForProducts();

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
  const headerColor = status === 'cancelled' ? 'red' : status === 'ready' ? 'blue' : 'gray';

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
          <Text span size="sm" c="dimmed" fs="italic">
            {t('purchaseOrders.detail.to')}
          </Text>
          <VendorLink code={order.vendorCode} name={order.vendorName} size="sm" />
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

  const actions = (
    <Group gap="xs" wrap="wrap">
      {!isMobile && (status === 'draft' || status === 'ready') && (
        <Button
          variant="subtle"
          size="compact-sm"
          leftSection={<IconPrinter size={14} />}
          onClick={printHandlers.open}
        >
          {t('goodsReceipts.print.action')}
        </Button>
      )}
      {d.showCopyCta && (
        <Button
          variant="subtle"
          size="compact-sm"
          leftSection={<IconCopy size={14} />}
          onClick={d.handleCopy}
        >
          {t('common.actions.copy')}
        </Button>
      )}
      {d.showMakeReceiptCta && (
        <Button
          size="compact-sm"
          leftSection={<IconPackageImport size={14} />}
          onClick={d.handleMakeReceipt}
        >
          {t('purchaseOrders.actions.makeReceipt')}
        </Button>
      )}
      {d.showEditCta && (
        <Button
          component={Link}
          to={ROUTES.PURCHASE_ORDERS.EDIT.replace(':id', order.id)}
          variant="default"
          size="compact-sm"
          leftSection={<IconEdit size={14} />}
        >
          {t('common.actions.edit')}
        </Button>
      )}
      {d.showCancelCta && (
        <Button
          variant="light"
          color="red"
          size="compact-sm"
          leftSection={<IconX size={14} />}
          onClick={() => d.openConfirm('cancel')}
        >
          {t('purchaseOrders.actions.cancel')}
        </Button>
      )}
      {d.showReadyCta && (
        <Button
          color="blue"
          size="compact-sm"
          leftSection={<IconSend size={14} />}
          onClick={() => d.openConfirm('ready')}
        >
          {t('purchaseOrders.actions.markReady')}
        </Button>
      )}
    </Group>
  );

  const leadTime = poLeadTime(order);
  const generalCard = (
    <SectionCard
      icon={<IconClipboardList size={14} />}
      title={t('purchaseOrders.detail.cardGeneral')}
    >
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <Stack gap={4}>
          <FieldLabel>{t('common.labels.vendor')}</FieldLabel>
          <VendorLink code={order.vendorCode} name={order.vendorName} size="sm" />
        </Stack>
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
            <Badge variant="light" color={poIsPaid(order) ? 'green' : overdue ? 'red' : 'orange'}>
              {poIsPaid(order)
                ? t('purchaseOrders.payment.paid')
                : overdue
                  ? t('purchaseOrders.payment.overdue')
                  : poPayment(order).state === 'partial'
                    ? t('purchaseOrders.payment.partial')
                    : t('purchaseOrders.payment.unpaid')}
            </Badge>
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
        {d.liveCount > 1 && (
          <Alert color="orange" variant="light" icon={<IconAlertTriangle size={16} />}>
            {t('purchaseOrders.detail.severalLiveReceipts')}
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
        {receiptRows.map((r) => {
          const st = findReceiptStatus(r.status);
          return (
            <Group key={r.id} gap="sm">
              <GoodsReceiptLink id={r.id} fallbackLabel={r.receiptNumber} />
              <Badge variant="light" color={st.color}>
                {t(st.labelKey)}
              </Badge>
            </Group>
          );
        })}
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
      {order.notes?.trim() ? (
        <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
          {order.notes}
        </Text>
      ) : (
        <Text size="sm" c="dimmed" fs="italic">
          {t('purchaseOrders.detail.noNotes')}
        </Text>
      )}
    </SectionCard>
  );

  const body = (
    <Stack gap={isMobile ? 'md' : 'lg'}>
      {generalCard}
      {paymentCard}
      {receiptsCard}
      {itemsCard}
      {notesCard}
    </Stack>
  );

  return (
    <>
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

      <Modal
        opened={d.confirmOpened}
        onClose={() => {
          if (!d.actionLoading) d.closeConfirm();
        }}
        title={
          d.confirmAction === 'ready'
            ? t('purchaseOrders.confirm.readyTitle')
            : t('purchaseOrders.confirm.cancelTitle')
        }
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            {d.confirmAction === 'ready'
              ? t('purchaseOrders.confirm.readyMessage')
              : t('purchaseOrders.confirm.cancelMessage')}
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={d.closeConfirm} disabled={d.actionLoading}>
              {t('common.actions.cancel')}
            </Button>
            <Button
              color={d.confirmAction === 'ready' ? 'blue' : 'red'}
              loading={d.actionLoading}
              leftSection={
                d.confirmAction === 'ready' ? <IconCheck size={14} /> : <IconX size={14} />
              }
              onClick={d.runAction}
            >
              {d.confirmAction === 'ready'
                ? t('purchaseOrders.actions.markReady')
                : t('purchaseOrders.actions.cancel')}
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
        <PaymentForm
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

function PaymentForm({
  initialState,
  initialAmount,
  total,
  currency,
  showPrice,
  initialDeadline,
  loading,
  onCancel,
  onSave,
}: {
  readonly initialState: PaymentDraftState;
  readonly initialAmount: number | undefined;
  readonly total: number;
  readonly currency: PurchaseOrderCurrency;

  readonly showPrice: boolean;
  readonly initialDeadline: string | null;
  readonly loading: boolean;
  readonly onCancel: () => void;
  readonly onSave: (next: { isPaid: boolean; paidAmount: number; paymentDeadline: string }) => void;
}) {
  const { t } = useTranslation();

  const [state, setState] = useState<PaymentDraftState>(
    !showPrice && initialState === 'partial' ? 'unpaid' : initialState,
  );
  const [amount, setAmount] = useState<number | undefined>(initialAmount);
  const [deadline, setDeadline] = useState<string | null>(initialDeadline);
  const [error, setError] = useState<string | null>(null);
  const advice = salesOrderPaymentAdviceOf({ state, amount, total });
  const submit = () => {
    if (advice.kind === 'blocked') {
      setError(
        t(
          advice.reason === 'amountRequired'
            ? 'purchaseOrders.payment.amountRequired'
            : 'purchaseOrders.payment.amountNonNegative',
        ),
      );
      return;
    }
    onSave({
      isPaid: state === 'paid',
      paidAmount: state === 'partial' ? (amount ?? 0) : 0,
      paymentDeadline: deadline ? vnDateStringToIso(deadline) : '',
    });
  };
  return (
    <Stack gap="md">
      <SegmentedControl
        fullWidth
        value={state}
        onChange={(next) => {
          setState(next as PaymentDraftState);
          setError(null);
        }}
        data={[
          { value: 'unpaid', label: t('purchaseOrders.payment.unpaid') },
          ...(showPrice ? [{ value: 'partial', label: t('purchaseOrders.payment.partial') }] : []),
          { value: 'paid', label: t('purchaseOrders.payment.paid') },
        ]}
      />
      {state === 'paid' && (
        <Text size="xs" c="dimmed">
          {t('purchaseOrders.payment.paidInFullHint')}
        </Text>
      )}
      {state === 'partial' && (
        <NumberField
          label={`${t('purchaseOrders.payment.amount')} (${currency})`}
          value={amount}
          onChange={(next) => {
            setAmount(next);
            setError(null);
          }}
          min={0}
        />
      )}
      {advice.kind === 'warn' && (
        <Text size="sm" c="orange">
          {t(
            advice.reason === 'exceedsTotal'
              ? 'purchaseOrders.payment.warnExceedsTotal'
              : 'purchaseOrders.payment.warnSettlesOrder',
          )}
        </Text>
      )}
      <DateField
        label={t('purchaseOrders.form.paymentDeadlineLabel')}
        value={deadline}
        onChange={setDeadline}
      />
      {error && (
        <Text size="sm" c="red">
          {error}
        </Text>
      )}
      <Group justify="flex-end">
        <Button variant="default" onClick={onCancel} disabled={loading}>
          {t('common.actions.cancel')}
        </Button>
        <Button loading={loading} onClick={submit}>
          {t('common.actions.save')}
        </Button>
      </Group>
    </Stack>
  );
}
