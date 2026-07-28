import { useState, type ReactNode } from 'react';
import {
  Accordion,
  ActionIcon,
  Affix,
  Alert,
  Autocomplete,
  Badge,
  Box,
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
  Textarea,
  Title,
  Tooltip,
} from '@mantine/core';
import { DateField } from '@/components/DateField';
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconBan,
  IconCamera,
  IconCopy,
  IconEdit,
  IconFileInvoice,
  IconFileSpreadsheet,
  IconHistory,
  IconLock,
  IconRobot,
  IconLockOpen,
  IconMessageCircle,
  IconPackage,
  IconPaperclip,
  IconPhoto,
  IconPhotoScan,
  IconPrinter,
  IconRotate,
  IconShare,
  IconTrash,
  IconTruck,
  IconTruckDelivery,
  IconArrowBackUp,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { Link } from 'react-router';
import { ROUTES } from '@/constants/routes';
import { device } from '@credo/base-ui/utils';
import { useAuthStore } from '@/stores/useAuthStore';
import { isCheatCompletedSalesOrder } from '@/utils/salesOrderCheatMarker';
import { isVacuouslyCompletedSalesOrder } from './vacuousCompletionMarker';
import { formatDate, formatDateTime } from '@/utils/dateFormat';
import { getSalesOrderReadyDate } from '@/utils/salesOrderReadyDate';
import {
  canTransitionToStatus,
  getDeliveryRequestDriverDepartments,
  getPricingVatRate,
  getSalesOrderDeliveryPackageSizeOptions,
  getSalesOrderPicDepartments,
  isPdfSharingEnabled,
  isPricingManagementEnabled,
  makeEmployeeDepartmentFilter,
  perms,
} from '@/utils/permission';
import {
  computeSalesOrderTotals,
  orderNeedsVAT,
  resolveOrderVatRate,
  resolveSalesOrderPaymentState,
} from '@/utils/salesOrderPricing';
import { useCustomerStore } from '@/stores/useCustomerStore';
import { useLookupLabels, lookupLabelOf } from '@/hooks';
import { getCompanyInfo } from '@/config/companyInfo';
import type { SalesOrderDetailVariant } from './salesOrderDetailVariant';
import {
  printSalesOrderDeliveryNote,
  DEFAULT_PRINT_OPTIONS,
  type DeliveryNoteData,
  type DeliveryNoteLine,
  type DeliveryNotePaperSize,
  type DeliveryNoteOrientation,
} from '@/utils/salesOrderDeliveryNote';
import { exportSalesOrderDeliveryNoteToExcel } from '@/utils/salesOrderDeliveryNoteExcel';
import { copyDeliveryNoteImageToClipboard } from '@/utils/salesOrderDeliveryNoteImage';
import { shareDeliveryNotePdf } from '@/utils/salesOrderDeliveryNotePdf';
import { readVietnameseMoney } from '@/utils/vietnameseNumberToWords';
import { ChatPanel } from '@/components/ChatPanel';
import { CustomerLink } from '@/components/CustomerLink';
import { EmployeeLink } from '@/components/EmployeeLink';
import { DetailField } from '@/components/DetailField';
import { TitledCard } from '@/components/TitledCard';
import { ImageUploadPanel, CameraCapture } from '@/components/ImageUploadPanel';
import { AttachmentPanel } from '@/components/AttachmentPanel';
import { ConfirmModal } from '@/components/ConfirmModal';
import { ActivityTimeline } from '@/components/ActivityTimeline';
import { ActivityByTargetPanel } from '@/components/activity/ActivityByTargetPanel';
import { isActivityLoggingEnabled } from '@/utils/permission';
import { AddressWithMapLink } from '@/components/AddressWithMapLink';
import { MobileScrollPillTabs } from '@/components/MobileScrollPillTabs';
import {
  FieldLabel,
  Tabs,
  InlineEditField,
  InlineSelectField,
  InlineTextareaField,
} from '@credo/base-ui/components';
import type { InlineEditLabels } from '@credo/base-ui/components';
import { useSalesOrderDetail } from './useSalesOrderDetail';
import { getCancellationTargetStatusValue } from './transitionEngine';
import { StatusChangeModal } from './StatusChangeModal';
import { CreateDeliveryRequestModal } from '@/pages/delivery-requests/CreateDeliveryRequestModal';
import { CreateReturnShipmentModal } from '@/pages/delivery-requests/CreateReturnShipmentModal';
import { OrderItemsTable } from './OrderItemsTable';
import { resolveSalesOrderRowBg } from './urgencyRowBg';
import { LinkedDRPhotosSection } from './LinkedDRPhotosSection';
import { SalesOrderDeliveryRequestInfo } from './SalesOrderDeliveryRequestInfo';
import { OrderProductPhotosSection } from './OrderProductPhotosSection';
const isMobile = device.isMobile;
const pricingEnabled = isPricingManagementEnabled();

const showPrice = pricingEnabled && perms.salesOrder.canViewPrice();
const vatRate = getPricingVatRate();
const canEdit = perms.salesOrder.canEdit();

const canTakePhoto = perms.salesOrder.canTakePhoto();
const canManageOrderPhotos = canEdit || canTakePhoto;
const canCreate = perms.salesOrder.canCreate();
const canTransitionStatus = perms.salesOrder.canTransitionStatus();
const canCancelPerm = perms.salesOrder.canCancel();
const canManualReleasePerm = perms.salesOrder.canManualRelease();
const canCreateDRPerm = perms.deliveryRequest.canCreate();

const canEditDeliveryPackageSize = perms.salesOrder.canEditDeliveryPackageSize();
const deliveryPackageSizeOptions = getSalesOrderDeliveryPackageSizeOptions();

const activityLogTabVisible = !isMobile && isActivityLoggingEnabled();
const picEmployeeFilter = makeEmployeeDepartmentFilter(getSalesOrderPicDepartments());

const soDriverDepartments = getDeliveryRequestDriverDepartments();

type SalesOrderDetailProps = {
  readonly variant: SalesOrderDetailVariant;
};

export function SalesOrderDetail({ variant }: SalesOrderDetailProps) {
  const showDeliveryNotePrint = variant.showDeliveryNotePrint && showPrice;

  const canSharePdf = isPdfSharingEnabled();
  const shouldDisplayShippingFee = variant.showShippingFee;
  const shouldDisplayVatTag = variant.showVatTag;

  const isRootUser = useAuthStore((s) => s.user?.isRoot ?? false);
  const {
    order,
    loading,
    extra,
    currentStatus,
    isUrgent,
    isCancelled,
    currentEmployee,
    fieldOptions,
    allowedNextStatuses,
    statusFlowOrder,
    currentFlowIndex,
    activityByStatus,
    statusChangeOpened,
    openStatusChange,
    closeStatusChange,
    targetStatus,
    setTargetStatus,
    statusNote,
    setStatusNote,
    actionLoading,
    handleStatusChange,
    cancelOpened,
    openCancel,
    closeCancel,
    cancelReason,
    setCancelReason,
    canCancel,
    handleCancel,
    cancelTargetStatusValue,
    canManualRelease,
    manualReleaseOpened,
    openManualRelease,
    closeManualRelease,
    handleManualRelease,
    reconcileIssues,
    reconcileOpened,
    openReconcile,
    closeReconcile,
    handleReconcileRepair,
    showDelete,
    deleteOpened,
    openDelete,
    closeDelete,
    handleDelete,
    handleCopyOrder,
    handleCreateDR,
    canCreateDR,
    canCreateAdditionalDR,
    createDROpened,
    closeCreateDR,
    handleCreateReturn,
    canCreateReturnShipment,
    createReturnOpened,
    closeCreateReturn,
    refreshLinkedDRs,
    linkedDRs,
    drsInit,
    handleSendChat,
    imageDirectory,
    handlePhotosChange,
    handleAttachmentsChange,
    cameraOpened,
    openCamera,
    closeCamera,
    cameraUploading,
    handleMobileCameraCapture,
    handleMetaPatch,
    handleItemMemoPatch,
    handleToggleDeliveryMethod,
    isExternalDelivery,
    employees,
    t,
  } = useSalesOrderDetail({
    clientSpecific: variant.clientSpecific?.NKTU?.deliveryMethodDrivesInternalDelivery
      ? {
          NKTU: {
            deliveryToggleEnabled:
              variant.clientSpecific?.NKTU?.deliveryMethodDrivesInternalDelivery,
            internalDeliveryMethodCode: variant.clientSpecific?.NKTU?.internalDeliveryMethodCode,
            externalDeliveryMethodCode: variant.clientSpecific?.NKTU?.externalDeliveryMethodCode,
          },
        }
      : undefined,
  });

  const [mobileTab, setMobileTab] = useState<string>('overview');

  const [activeTab, setActiveTab] = useState<string | null>('items');

  const [togglingDelivery, setTogglingDelivery] = useState(false);

  const [printOptionsOpened, setPrintOptionsOpened] = useState(false);
  const [paperSize, setPaperSize] = useState<DeliveryNotePaperSize>(
    DEFAULT_PRINT_OPTIONS.paperSize,
  );
  const [orientation, setOrientation] = useState<DeliveryNoteOrientation>(
    DEFAULT_PRINT_OPTIONS.orientation,
  );

  const [includePrice, setIncludePrice] = useState<boolean>(DEFAULT_PRINT_OPTIONS.includePrice);

  const [copyingImage, setCopyingImage] = useState(false);

  const [sharingPdf, setSharingPdf] = useState(false);

  const customers = useCustomerStore((s) => s.items);
  const unitLabels = useLookupLabels('unit');

  if (loading || !order || !currentStatus) return null;

  const { resolveStatus, tagOptions, deliveryMethodOptions } = fieldOptions;

  const buildDeliveryNoteData = (): DeliveryNoteData => {
    const cust = extra.customerCode
      ? customers.find((c) => c.code === extra.customerCode)
      : undefined;
    const lines: DeliveryNoteLine[] = order.items
      .filter((it) => it.role !== 'set-component')
      .map((it) => {
        let name = it.productName || it.productCode;
        if (it.memo) {
          name += ` (${it.memo})`;
        }
        return {
          name,
          unit: lookupLabelOf(unitLabels, it.unit),
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          lineTotal: it.quantity * it.unitPrice,
        };
      });
    const totals = computeSalesOrderTotals(order, vatRate);
    const vatPercent = orderNeedsVAT(extra)
      ? +(resolveOrderVatRate(extra, vatRate) * 100).toFixed(2)
      : 0;
    const dateSource = extra.deliveryDate ?? extra.orderDate ?? order.createdAt;
    const d = new Date(dateSource as string | number);
    const dateText = `Ngày ${String(d.getDate()).padStart(2, '0')} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}`;

    return {
      seller: getCompanyInfo(),
      payment: resolveSalesOrderPaymentState(extra, totals.grandTotal),
      orderNumber: order.orderNumber,
      dateText,
      customer: {
        name: cust?.name || extra.customerName || '',
        address: cust?.address || extra.deliveryAddress || '',
        taxCode: cust?.extra?.taxCode ?? '',
        phone: cust?.phone ?? '',
      },
      customerPONumber: extra.customerPONumber ?? '',
      lines,
      subtotal: totals.subtotal,
      vatPercent,
      vatAmount: totals.vat,
      shippingFee: totals.shipping,
      grandTotal: totals.grandTotal,
      amountInWords: readVietnameseMoney(totals.grandTotal),
    };
  };

  const handlePrintDeliveryNote = () => {
    const ok = printSalesOrderDeliveryNote(buildDeliveryNoteData(), {
      paperSize,
      orientation,
      includePrice,
    });
    setPrintOptionsOpened(false);
    if (!ok) {
      notifications.show({ color: 'red', message: t('salesOrders.detail.printPopupBlocked') });
    }
  };

  const handleExportDeliveryNoteExcel = () => {
    exportSalesOrderDeliveryNoteToExcel(
      buildDeliveryNoteData(),
      { paperSize, orientation, includePrice },
      `delivery_note_${order.orderNumber}.xlsx`,
    );
    setPrintOptionsOpened(false);
  };

  const handleCopyDeliveryNoteImage = async () => {
    setCopyingImage(true);
    try {
      const result = await copyDeliveryNoteImageToClipboard(buildDeliveryNoteData(), {
        paperSize,
        orientation,
        includePrice,
      });
      setPrintOptionsOpened(false);
      notifications.show({
        color: result === 'copied' ? 'teal' : 'blue',
        message:
          result === 'copied'
            ? t('salesOrders.detail.copyImageCopied')
            : t('salesOrders.detail.copyImageDownloaded'),
      });
    } catch {
      notifications.show({ color: 'red', message: t('salesOrders.detail.copyImageFailed') });
    } finally {
      setCopyingImage(false);
    }
  };

  const handleShareDeliveryNotePdf = async () => {
    setSharingPdf(true);
    try {
      const result = await shareDeliveryNotePdf(buildDeliveryNoteData(), {
        paperSize,
        orientation,
        includePrice,
      });
      setPrintOptionsOpened(false);
      if (result === 'downloaded') {
        notifications.show({ color: 'blue', message: t('salesOrders.detail.sharePdfDownloaded') });
      }
    } catch {
      notifications.show({ color: 'red', message: t('salesOrders.detail.sharePdfFailed') });
    } finally {
      setSharingPdf(false);
    }
  };

  const cancelTargetValue = isCancelled ? getCancellationTargetStatusValue() : undefined;
  const headerStatus =
    isCancelled && cancelTargetValue ? resolveStatus(cancelTargetValue) : currentStatus;

  const renderTagsRow = (tags: ReadonlyArray<string>) => (
    <Group gap={4}>
      {tags.map((tag) => {
        const opt = tagOptions.find((o) => o.value === tag);
        return (
          <Badge key={tag} color={opt?.color} variant="light" size="sm">
            {opt?.label ?? tag}
          </Badge>
        );
      })}
    </Group>
  );

  const tagsRow = extra.tags && extra.tags.length > 0 ? renderTagsRow(extra.tags) : null;

  const canEditMeta = canEdit && !order.isClosed && !isCancelled;

  const canEditNotes = variant.notesAlwaysEditable ? canEdit : canEditMeta;
  const canEditItemMemo = variant.itemMemoEditable && canEdit;

  const canEditPackageSize = canEditDeliveryPackageSize && !order.isClosed && !isCancelled;
  const showPackageSize =
    canEditDeliveryPackageSize ||
    deliveryPackageSizeOptions.length > 0 ||
    Boolean(extra.deliveryPackageSize);

  const inlineEditLabels: InlineEditLabels = {
    edit: t('__new__.01-common.actions.edit'),
    save: t('__new__.01-common.actions.save'),
    cancel: t('__new__.01-common.actions.cancel'),
  };

  const pickableEmployees = employees.filter(picEmployeeFilter);
  const currentStaffId = extra.assignedStaff;
  if (currentStaffId && !pickableEmployees.some((e) => e.id === currentStaffId)) {
    const current = employees.find((e) => e.id === currentStaffId);
    if (current) pickableEmployees.push(current);
  }
  const employeeSelectData = pickableEmployees.map((e) => ({ value: e.id, label: e.name }));
  const deliveryMethodSelectData = deliveryMethodOptions.map((o) => ({
    value: o.value,
    label: o.label,
  }));

  const assignedStaffField = (
    <InlineSelectField
      canEdit={canEditMeta}
      value={extra.assignedStaff ?? ''}
      onSave={async (next) =>
        handleMetaPatch({ extra: { assignedStaff: next === '' ? undefined : next } })
      }
      data={employeeSelectData}
      placeholder={t('salesOrders.detail.assignedStaff')}
      labels={inlineEditLabels}
      renderValueDisplay={(v) => <EmployeeLink id={v} />}
    />
  );

  const deliveryMethodField = (
    <InlineSelectField
      canEdit={canEditMeta}
      value={extra.deliveryMethod ?? ''}
      onSave={async (next) => {
        if (variant.clientSpecific?.NKTU?.deliveryMethodDrivesInternalDelivery) {
          if (next === 'internal' || next === 'freight') {
            handleMetaPatch({
              extra: {
                deliveryMethod: next,
                isInternalDelivery: true,
              },
            });
          } else {
            handleMetaPatch({
              extra: {
                deliveryMethod: next === '' ? undefined : next,
                isInternalDelivery: false,
              },
            });
          }
          return;
        }
        handleMetaPatch({ extra: { deliveryMethod: next === '' ? undefined : next } });
      }}
      data={deliveryMethodSelectData}
      placeholder={t('salesOrders.detail.deliveryMethod')}
      labels={inlineEditLabels}
    />
  );

  const deliveryDateForEditor: string | null = extra.deliveryDate
    ? new Date(extra.deliveryDate).toISOString().slice(0, 10)
    : null;
  const deliveryDateField = (
    <InlineEditField<string | null>
      canEdit={canEditMeta}
      value={deliveryDateForEditor}
      onSave={async (next) =>
        handleMetaPatch({
          extra: { deliveryDate: next ? new Date(next).getTime() : undefined },
        })
      }
      labels={inlineEditLabels}
      renderDisplay={(v) =>
        v ? (
          <Text size="sm">{formatDate(v)}</Text>
        ) : (
          <Text size="sm" c="dimmed" fs="italic">
            —
          </Text>
        )
      }
      renderEditor={({ value: v, onChange }) => (
        <DateField
          futureOnly
          value={v}
          onChange={(next) => onChange(next || null)}
          placeholder={t('salesOrders.detail.deliveryDate')}
          autoFocus
        />
      )}
    />
  );

  const deliveryPackageSizeField = (
    <InlineEditField<string>
      canEdit={canEditPackageSize}
      value={extra.deliveryPackageSize ?? ''}
      onSave={async (next) =>
        handleMetaPatch({ extra: { deliveryPackageSize: next.trim() || undefined } })
      }
      labels={inlineEditLabels}
      renderDisplay={(v) =>
        v ? (
          <Text size="sm">{v}</Text>
        ) : (
          <Text size="sm" c="dimmed" fs="italic">
            —
          </Text>
        )
      }
      renderEditor={({ value: v, onChange }) => (
        <Autocomplete
          data={deliveryPackageSizeOptions}
          value={v}
          onChange={onChange}
          placeholder={t('salesOrders.detail.deliveryPackageSizePlaceholder')}
          autoFocus
        />
      )}
    />
  );

  const deliveryAddressMobile = (
    <AddressWithMapLink
      address={extra.deliveryAddress}
      googleMapUrl={extra.googleMapUrl}
      size="xs"
    />
  );
  const deliveryAddressDesktop = (
    <AddressWithMapLink
      address={extra.deliveryAddress}
      googleMapUrl={extra.googleMapUrl}
      fw={500}
    />
  );

  const notesField = (
    <InlineTextareaField
      canEdit={canEditNotes}
      value={order.notes ?? ''}
      onSave={async (next) => handleMetaPatch({ notes: next })}
      placeholder={t('salesOrders.form.notesPlaceholder')}
      emptyPlaceholder={t('__new__.01-common.empty.noNote')}
      labels={inlineEditLabels}
    />
  );

  const splitNotesCfg = variant.clientSpecific?.NKTU?.splitNotes;
  const myNoteDept = currentEmployee?.department ?? null;
  const isDriverDept = myNoteDept != null && soDriverDepartments.includes(myNoteDept);
  const isWarehouseDept =
    myNoteDept != null && myNoteDept === splitNotesCfg?.warehouseDepartmentCode;

  const saveSplitNote = (key: 'warehouseNote' | 'driverNote', next: string) => {
    const nktu = { ...(extra.clientSpecific?.NKTU ?? {}) };
    if (next.trim()) nktu[key] = next.trim();
    else delete nktu[key];
    return handleMetaPatch({
      extra: { clientSpecific: { ...(extra.clientSpecific ?? {}), NKTU: nktu } },
    });
  };

  const splitNoteFields: { label: string; visible: boolean; node: ReactNode }[] = splitNotesCfg
    ? [
        {
          label: t('salesOrders.detail.warehouseNote'),
          visible: !isDriverDept,
          node: (
            <InlineTextareaField
              canEdit={canEditNotes}
              value={extra.clientSpecific?.NKTU?.warehouseNote ?? ''}
              onSave={async (next) => saveSplitNote('warehouseNote', next)}
              placeholder={t('salesOrders.form.warehouseNotePlaceholder')}
              emptyPlaceholder={t('__new__.01-common.empty.noNote')}
              labels={inlineEditLabels}
            />
          ),
        },
        {
          label: t('salesOrders.detail.driverNote'),
          visible: !isWarehouseDept,
          node: (
            <InlineTextareaField
              canEdit={canEditNotes}
              value={extra.clientSpecific?.NKTU?.driverNote ?? ''}
              onSave={async (next) => saveSplitNote('driverNote', next)}
              placeholder={t('salesOrders.form.driverNotePlaceholder')}
              emptyPlaceholder={t('__new__.01-common.empty.noNote')}
              labels={inlineEditLabels}
            />
          ),
        },
      ].filter((f) => f.visible)
    : [];

  const notesDetailContent = splitNotesCfg ? (
    <Stack gap="md">
      <DetailField label={t('__new__.01-common.labels.note')}>{notesField}</DetailField>
      {splitNoteFields.map((f) => (
        <DetailField key={f.label} label={f.label}>
          {f.node}
        </DetailField>
      ))}
    </Stack>
  ) : (
    <DetailField label={t('__new__.01-common.labels.note')}>{notesField}</DetailField>
  );

  const linkedDRIds = Array.from(
    new Set([...(extra.deliveryRequestIds ?? []), ...linkedDRs.map((d) => d.id)]),
  );

  const photosContent = (
    <Stack gap="lg">
      <Stack gap="xs">
        <FieldLabel size="sm" lts={0.5}>
          {t('salesOrders.detail.photosOfOrder')}
        </FieldLabel>
        <ImageUploadPanel
          images={extra.photos ?? []}
          onChange={handlePhotosChange}
          imageDirectory={imageDirectory}
          editable={canManageOrderPhotos}
          marker={order.orderNumber ?? ''}
          currentUserId={currentEmployee?.id}
          currentUserName={currentEmployee?.name}
          externalCamera={isMobile}
        />
      </Stack>
      {linkedDRIds.length > 0 && (
        <Stack gap="xs">
          <Divider />
          <FieldLabel size="sm" lts={0.5}>
            {t('salesOrders.detail.photosFromDR')}
          </FieldLabel>
          <LinkedDRPhotosSection ids={linkedDRIds} />
        </Stack>
      )}
    </Stack>
  );

  const productPhotosContent = <OrderProductPhotosSection items={order.items} />;

  const attachmentsContent = (
    <AttachmentPanel
      attachments={extra.attachments ?? []}
      onChange={handleAttachmentsChange}
      imageDirectory={imageDirectory}
      editable={canEdit}
      currentUserId={currentEmployee?.id}
      currentUserName={currentEmployee?.name}
    />
  );

  const activityContent = (
    <ActivityTimeline
      statusFlowOrder={statusFlowOrder}
      currentFlowIndex={currentFlowIndex}
      currentStatusValue={extra.status ?? ''}
      activityByStatus={activityByStatus}
      resolveStatus={resolveStatus}
      deliveryDate={extra.deliveryDate}
      showNotes={false}
    />
  );

  const linkage = extra.inventoryLinkage;
  const linkageState = linkage?.state ?? 'none';
  const reservedRowCount = linkage?.reservedSnapshot?.length ?? 0;
  const linkageBadge =
    linkageState === 'reserved' ? (
      <Tooltip
        label={t('salesOrders.inventoryLinkage.tooltipReserved', { count: reservedRowCount })}
        withArrow
        multiline
        maw={260}
      >
        <Badge
          color="orange"
          variant="light"
          size="md"
          leftSection={<IconLock size={12} aria-hidden />}
        >
          {t('salesOrders.inventoryLinkage.stateReserved')}
        </Badge>
      </Tooltip>
    ) : linkageState === 'shipped' ? (
      <Tooltip
        label={t('salesOrders.inventoryLinkage.tooltipShipped', {
          at: linkage?.lastTransition?.at ? formatDateTime(linkage.lastTransition.at) : '-',
          status:
            linkage?.lastTransition?.via.kind === 'capability'
              ? linkage.lastTransition.via.statusValue
              : '-',
        })}
        withArrow
        multiline
        maw={260}
      >
        <Badge
          color="teal"
          variant="light"
          size="md"
          leftSection={<IconTruck size={12} aria-hidden />}
        >
          {t('salesOrders.inventoryLinkage.stateShipped')}
        </Badge>
      </Tooltip>
    ) : linkageState === 'released' ? (
      <Tooltip
        label={t('salesOrders.inventoryLinkage.tooltipReleased', {
          at: linkage?.lastTransition?.at ? formatDateTime(linkage.lastTransition.at) : '-',
        })}
        withArrow
        multiline
        maw={260}
      >
        <Badge
          color="gray"
          variant="light"
          size="md"
          leftSection={<IconLockOpen size={12} aria-hidden />}
        >
          {t('salesOrders.inventoryLinkage.stateReleased')}
        </Badge>
      </Tooltip>
    ) : null;

  const cheatBadge =
    isRootUser && isCheatCompletedSalesOrder(order) ? (
      <Tooltip label={t('salesOrders.cheatMarker.tooltip')} withArrow multiline maw={260}>
        <Badge
          color="grape"
          variant="light"
          size="md"
          leftSection={<IconRobot size={12} aria-hidden />}
        >
          {t('salesOrders.cheatMarker.label')}
        </Badge>
      </Tooltip>
    ) : null;

  const vacuousCompletionBadge =
    isRootUser && drsInit && isVacuouslyCompletedSalesOrder(order, linkedDRs.length > 0) ? (
      <Tooltip label={t('salesOrders.vacuousCompletion.tooltip')} withArrow multiline maw={280}>
        <Badge
          color="red"
          variant="light"
          size="md"
          leftSection={<IconAlertTriangle size={12} aria-hidden />}
        >
          {t('salesOrders.vacuousCompletion.label')}
        </Badge>
      </Tooltip>
    ) : null;

  const stuckReservationBanner =
    canManualReleasePerm && canManualRelease ? (
      <Alert
        icon={<IconAlertTriangle size={16} />}
        color="yellow"
        variant="light"
        title={t('salesOrders.manualRelease.stuckBannerTitle')}
      >
        <Stack gap="sm">
          <Text size="sm">{t('salesOrders.manualRelease.stuckBannerMessage')}</Text>
          <Group justify="flex-end">
            <Button
              color="yellow"
              size="xs"
              leftSection={<IconLockOpen size={14} />}
              onClick={openManualRelease}
            >
              {t('salesOrders.manualRelease.actionButton')}
            </Button>
          </Group>
        </Stack>
      </Alert>
    ) : null;

  const reconcileBanner =
    isRootUser && canEdit && reconcileIssues.length > 0 ? (
      <Alert
        icon={<IconAlertTriangle size={16} />}
        color="orange"
        variant="light"
        title={t('salesOrders.reconcile.bannerTitle')}
      >
        <Stack gap="sm">
          {reconcileIssues.map((issue) => {
            switch (issue.kind) {
              case 'so-behind-deliveries':
                return (
                  <Text size="sm" key={issue.kind}>
                    {issue.blockedByMatrix
                      ? t('salesOrders.reconcile.behindBlocked', { count: issue.closedDrCount })
                      : t('salesOrders.reconcile.behind', { count: issue.closedDrCount })}
                  </Text>
                );
              case 'completed-not-deducted':
                return (
                  <Text size="sm" key={issue.kind}>
                    {issue.reason === 'still-reserved'
                      ? t('salesOrders.reconcile.notDeductedReserved')
                      : t('salesOrders.reconcile.notDeductedMissing')}
                  </Text>
                );
              case 'reservation-drift':
                return (
                  <Box key={issue.kind}>
                    <Text size="sm">
                      {t('salesOrders.reconcile.drift', { count: issue.lines.length })}
                    </Text>
                    <Stack gap={2} mt={4}>
                      {issue.lines.slice(0, 5).map((l, idx) => (
                        <Text size="xs" ff="monospace" c="dimmed" key={idx}>
                          {l.itemCode} @ {l.locationCode} · {l.unit}:{' '}
                          {t('salesOrders.reconcile.driftLine', {
                            snapshot: l.snapshotQty.toLocaleString(),
                            row: l.rowHoldQty.toLocaleString(),
                          })}
                        </Text>
                      ))}
                    </Stack>
                  </Box>
                );
              case 'orphaned-holds':
                return (
                  <Box key={issue.kind}>
                    <Text size="sm">
                      {t('salesOrders.reconcile.orphans', { count: issue.lines.length })}
                    </Text>
                    <Stack gap={2} mt={4}>
                      {issue.lines.slice(0, 5).map((l, idx) => (
                        <Text size="xs" ff="monospace" c="dimmed" key={idx}>
                          {l.itemCode} @ {l.locationCode} · {l.unit}:{' '}
                          {l.rowHoldQty.toLocaleString()}
                        </Text>
                      ))}
                    </Stack>
                  </Box>
                );
            }
          })}
          {!reconcileIssues.some((i) => i.kind === 'so-behind-deliveries' && i.blockedByMatrix) ? (
            <Group justify="flex-end">
              <Button
                color="orange"
                size="xs"
                leftSection={<IconAlertTriangle size={14} />}
                onClick={openReconcile}
              >
                {t('salesOrders.reconcile.repairButton')}
              </Button>
            </Group>
          ) : (
            <Text size="xs" c="dimmed">
              {t('salesOrders.reconcile.blockedHint')}
            </Text>
          )}
        </Stack>
      </Alert>
    ) : null;

  const reconcileModal = (
    <ConfirmModal
      opened={reconcileOpened}
      onClose={closeReconcile}
      onConfirm={handleReconcileRepair}
      title={t('salesOrders.reconcile.confirmTitle')}
      message={
        reconcileIssues.some(
          (i) => i.kind === 'completed-not-deducted' && i.reason === 'no-deduction-recorded',
        )
          ? t('salesOrders.reconcile.confirmMessageShip')
          : t('salesOrders.reconcile.confirmMessage')
      }
      confirmLabel={t('salesOrders.reconcile.repairButton')}
      confirmColor="orange"
      loading={actionLoading}
    />
  );

  const showCreateDR = canCreateDRPerm && (canCreateDR || canCreateAdditionalDR);
  const createDRButton = showCreateDR ? (
    <Button
      size="sm"
      variant="filled"
      leftSection={<IconTruckDelivery size={14} />}
      onClick={handleCreateDR}
    >
      {t(
        linkedDRs.length > 0
          ? '__new__.07-entities.salesOrders.actions.createAdditionalDR'
          : '__new__.07-entities.salesOrders.actions.createDR',
      )}
    </Button>
  ) : null;

  const showCreateReturn = canCreateDRPerm && canCreateReturnShipment;
  const createReturnButton = showCreateReturn ? (
    <Button
      size="sm"
      variant="light"
      color="orange"
      leftSection={<IconArrowBackUp size={14} />}
      onClick={handleCreateReturn}
    >
      {t('__new__.07-entities.salesOrders.actions.createReturnShipment')}
    </Button>
  ) : null;

  const showDeliveryToggle =
    variant.clientSpecific?.NKTU?.deliveryMethodDrivesInternalDelivery &&
    canEdit &&
    order != null &&
    !isCancelled;
  const deliveryToggleButton = showDeliveryToggle ? (
    <Button
      size="sm"
      variant="light"
      color={isExternalDelivery ? 'orange' : 'blue'}
      loading={togglingDelivery}
      leftSection={<IconRotate size={14} />}
      onClick={async (e) => {
        e.stopPropagation();
        setTogglingDelivery(true);
        try {
          await handleToggleDeliveryMethod();
        } catch {
          // handleMetaPatch already surfaced the conflict / error toast.
        } finally {
          setTogglingDelivery(false);
        }
      }}
    >
      {t(
        isExternalDelivery
          ? '__new__.07-entities.salesOrders.actions.switchToInternalDelivery'
          : '__new__.07-entities.salesOrders.actions.switchToExternalDelivery',
      )}
    </Button>
  ) : null;

  const myDepartment = currentEmployee?.department ?? null;

  const hideDeliveredCfg = variant.clientSpecific?.NKTU?.hideDeliveredActionForWarehouse;
  const visibleNextStatuses = allowedNextStatuses.filter((next) => {
    if (next.value === cancelTargetStatusValue) return canCancelPerm;
    if (!canTransitionStatus) return false;
    if (!canTransitionToStatus(next, myDepartment)) return false;
    if (
      hideDeliveredCfg &&
      next.value === hideDeliveredCfg.deliveredStatusValue &&
      myDepartment === hideDeliveredCfg.warehouseDepartmentCode &&
      hideDeliveredCfg.deliveryMethods.includes(extra.deliveryMethod ?? '')
    ) {
      return false;
    }
    return true;
  });
  const showCancel = canCancelPerm && canCancel;
  const actionButtons =
    showCreateDR ||
    showCreateReturn ||
    showDeliveryToggle ||
    visibleNextStatuses.length > 0 ||
    showCancel ||
    showDelete ? (
      <Group gap={isMobile ? 'xs' : 'sm'} wrap="wrap">
        {createDRButton}
        {createReturnButton}
        {deliveryToggleButton}
        {visibleNextStatuses.map((next) => (
          <Button
            key={next.value}
            size="sm"
            color={next.color}
            variant={
              next.stage === 'COMPLETED' || next.stage === 'EXCEPTIONAL' ? 'outline' : 'light'
            }
            onClick={(e) => {
              e.stopPropagation();
              setTargetStatus(next);
              openStatusChange();
            }}
          >
            {next.actionLabel}
          </Button>
        ))}
        {showCancel && (
          <Button
            size="sm"
            color="red"
            variant="outline"
            leftSection={<IconBan size={14} />}
            onClick={(e) => {
              e.stopPropagation();
              openCancel();
            }}
          >
            {t('salesOrders.cancel.actionButton')}
          </Button>
        )}
        {!isMobile && showDelete && (
          <Button
            size="sm"
            color="red"
            variant="outline"
            leftSection={<IconTrash size={14} />}
            onClick={(e) => {
              e.stopPropagation();
              openDelete();
            }}
          >
            {t('salesOrders.delete.actionButton')}
          </Button>
        )}
      </Group>
    ) : null;

  const handleStatusChangeConfirm = async () => {
    if (!targetStatus) return;
    if (cancelTargetStatusValue && targetStatus.value === cancelTargetStatusValue) {
      try {
        await handleCancel(statusNote || undefined);
      } finally {
        closeStatusChange();
        setStatusNote('');
        setTargetStatus(null);
      }
      return;
    }
    await handleStatusChange(targetStatus.value, statusNote);
  };

  const statusChangeModal = (
    <StatusChangeModal
      opened={statusChangeOpened}
      onClose={closeStatusChange}
      targetStatus={targetStatus}
      currentStatus={currentStatus}
      note={statusNote}
      onNoteChange={setStatusNote}
      onConfirm={handleStatusChangeConfirm}
      loading={actionLoading}
      t={t}
    />
  );

  const cancelOrderModal = (
    <Modal
      opened={cancelOpened}
      onClose={closeCancel}
      title={t('salesOrders.cancel.confirmTitle')}
      size="sm"
    >
      <Stack gap="md">
        <Text size="sm">
          {t('salesOrders.cancel.confirmMessage', { status: currentStatus.label })}
        </Text>
        {linkageState === 'reserved' && reservedRowCount > 0 && (
          <Alert color="green" variant="light" icon={<IconLockOpen size={16} />}>
            {t('salesOrders.cancel.previewReleaseReserved', { count: reservedRowCount })}
          </Alert>
        )}
        {linkageState === 'shipped' && (
          <Alert color="yellow" variant="light" icon={<IconAlertTriangle size={16} />}>
            {t('salesOrders.cancel.previewAfterShip')}
          </Alert>
        )}
        <Textarea
          label={t('salesOrders.cancel.reasonLabel')}
          placeholder={t('salesOrders.cancel.reasonPlaceholder')}
          value={cancelReason}
          onChange={(e) => setCancelReason(e.currentTarget.value)}
          autosize
          minRows={2}
        />
        <Group justify="flex-end" gap="sm">
          <Button variant="default" size="sm" onClick={closeCancel} disabled={actionLoading}>
            {t('__new__.01-common.actions.cancel')}
          </Button>
          <Button
            size="sm"
            color="red"
            loading={actionLoading}
            onClick={() => handleCancel(cancelReason || undefined)}
          >
            {t('salesOrders.cancel.actionButton')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );

  const manualReleaseModal = (
    <Modal
      opened={manualReleaseOpened}
      onClose={closeManualRelease}
      title={t('salesOrders.manualRelease.confirmTitle')}
      size="md"
    >
      <Stack gap="md">
        <Text size="sm">{t('salesOrders.manualRelease.confirmMessage')}</Text>
        {linkage?.reservedSnapshot && linkage.reservedSnapshot.length > 0 && (
          <Box>
            <FieldLabel mb={6}>{t('salesOrders.manualRelease.snapshotHeading')}</FieldLabel>
            <Stack gap={4}>
              {linkage.reservedSnapshot.map((entry, idx) => {
                const parts = Object.entries(entry.byUnit)
                  .filter(([, q]) => q > 0)
                  .map(([u, q]) => `${q.toLocaleString()} ${u}`);
                return (
                  <Group key={`${entry.rowId}-${idx}`} gap={6} wrap="nowrap">
                    <IconPackage size={14} color="var(--mantine-color-dimmed)" />
                    <Text size="xs" ff="monospace">
                      {entry.itemCode}
                    </Text>
                    <Text size="xs" c="dimmed">
                      @ {entry.locationCode}
                    </Text>
                    <Text size="xs" fw={600}>
                      {parts.join(' + ')}
                    </Text>
                  </Group>
                );
              })}
            </Stack>
          </Box>
        )}
        <Group justify="flex-end" gap="sm">
          <Button variant="default" size="sm" onClick={closeManualRelease} disabled={actionLoading}>
            {t('__new__.01-common.actions.cancel')}
          </Button>
          <Button
            size="sm"
            color="yellow"
            loading={actionLoading}
            leftSection={<IconLockOpen size={14} />}
            onClick={handleManualRelease}
          >
            {t('salesOrders.manualRelease.actionButton')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );

  const deleteOrderModal = (
    <ConfirmModal
      opened={deleteOpened}
      onClose={closeDelete}
      onConfirm={handleDelete}
      title={t('salesOrders.delete.confirmTitle')}
      message={t('salesOrders.delete.confirmMessage')}
      confirmLabel={t('salesOrders.delete.actionButton')}
      confirmColor="red"
      loading={actionLoading}
    />
  );

  const printOptionsModal = (
    <Modal
      opened={printOptionsOpened}
      onClose={() => setPrintOptionsOpened(false)}
      title={t('salesOrders.detail.printOptionsTitle')}
      size={canSharePdf ? 'lg' : 'md'}
    >
      <Stack gap="md">
        <Stack gap={6}>
          <FieldLabel>{t('salesOrders.detail.printPaperSize')}</FieldLabel>
          <SegmentedControl
            fullWidth
            value={paperSize}
            onChange={(v: string) => setPaperSize(v as DeliveryNotePaperSize)}
            data={[
              { value: 'A4', label: 'A4' },
              { value: 'A5', label: 'A5' },
            ]}
          />
        </Stack>
        <Stack gap={6}>
          <FieldLabel>{t('salesOrders.detail.printOrientation')}</FieldLabel>
          <SegmentedControl
            fullWidth
            value={orientation}
            onChange={(v: string) => setOrientation(v as DeliveryNoteOrientation)}
            data={[
              {
                value: 'portrait',
                label: t('salesOrders.detail.printOrientationPortrait'),
              },
              {
                value: 'landscape',
                label: t('salesOrders.detail.printOrientationLandscape'),
              },
            ]}
          />
        </Stack>
        <Switch
          label={t('salesOrders.detail.printIncludePrice')}
          checked={includePrice}
          onChange={(e) => setIncludePrice(e.currentTarget.checked)}
        />
        <Group justify="flex-end" gap="sm">
          <Button
            variant="subtle"
            size="sm"
            color="primary"
            leftSection={<IconFileSpreadsheet size={14} />}
            onClick={handleExportDeliveryNoteExcel}
          >
            {t('__new__.01-common.actions.exportExcel')}
          </Button>
          <Button
            variant="subtle"
            color="orange"
            size="sm"
            loading={copyingImage}
            leftSection={<IconCopy size={14} />}
            onClick={handleCopyDeliveryNoteImage}
          >
            {t('salesOrders.detail.copyDeliveryNoteImage')}
          </Button>
        </Group>
        <Group justify="flex-end" wrap="nowrap" gap="sm">
          <Button
            variant="light"
            color="red"
            size="sm"
            onClick={() => setPrintOptionsOpened(false)}
          >
            {t('__new__.01-common.actions.cancel')}
          </Button>
          <Button
            size="sm"
            color="primary"
            variant="outline"
            leftSection={<IconPrinter size={14} />}
            onClick={handlePrintDeliveryNote}
          >
            {t('salesOrders.detail.printDeliveryNote')}
          </Button>
          {canSharePdf && (
            <Button
              color="orange"
              variant="outline"
              size="sm"
              loading={sharingPdf}
              leftSection={<IconShare size={14} />}
              onClick={handleShareDeliveryNotePdf}
            >
              {t('salesOrders.detail.shareDeliveryNotePdf')}
            </Button>
          )}
        </Group>
      </Stack>
    </Modal>
  );

  const metadataFooter = (
    <Group justify="flex-end" gap="md" wrap="nowrap">
      <Text size="xs" c="dimmed">
        {t('common.labels.createdAt')} · {formatDateTime(getSalesOrderReadyDate(order))}
      </Text>
      <Text size="xs" c="dimmed">
        {t('common.labels.updatedAt')} · {formatDateTime(order.updatedAt)}
      </Text>
    </Group>
  );

  const quotationId = extra.quotationId ?? extra.clientSpecific?.NKTU?.quotationId;
  const quotationCode = extra.quotationCode ?? extra.clientSpecific?.NKTU?.quotationCode;
  const quotationLinkRow = quotationId ? (
    <Group justify="flex-start" wrap="nowrap" gap="xs">
      <IconFileInvoice size={14} color="var(--mantine-color-dimmed)" />
      <Text
        size="sm"
        fw={600}
        component={Link}
        to={ROUTES.QUOTATIONS.DETAIL.replace(':id', quotationId)}
        c="blue"
        style={{ textDecoration: 'none' }}
      >
        {quotationCode ?? t('quotations.fromQuotation')}
      </Text>
    </Group>
  ) : null;

  const customerHeaderDesktop = (
    <Group justify="space-between" align="flex-start" wrap="nowrap" gap="md">
      <Stack gap={2} style={{ minWidth: 0, flex: 1 }}>
        <FieldLabel>{t('common.labels.customer')}</FieldLabel>
        <Text size="md" fw={600} component="div">
          <CustomerLink code={extra.customerCode} name={extra.customerName} />
        </Text>
        {order.extra.customerPONumber && (
          <Group justify="flex-start" wrap="nowrap" gap="xs">
            <Text size="sm">{t('salesOrders.form.customerPONumberLabel')}:</Text>
            <Text size="sm" fw={600} ml="xs">
              {order.extra.customerPONumber}
            </Text>
          </Group>
        )}
        {quotationLinkRow}
      </Stack>
      {tagsRow && <Box style={{ flexShrink: 0 }}>{tagsRow}</Box>}
    </Group>
  );

  const customerHeaderMobile = (
    <Group justify="space-between" align="flex-start" wrap="wrap" gap="xs">
      <Stack gap={2} style={{ minWidth: 0 }}>
        <FieldLabel>{t('common.labels.customer')}</FieldLabel>
        <CustomerLink code={extra.customerCode} name={extra.customerName} size="xs" />
        {quotationLinkRow}
      </Stack>
      {tagsRow && <Box>{tagsRow}</Box>}
    </Group>
  );

  const salesOrderTotals = computeSalesOrderTotals(order, vatRate);
  const needVat = extra.needVAT !== false;

  const billingFields = showPrice ? (
    <>
      <Divider variant="dashed" />
      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
        {/* <DetailField label={t('salesOrders.billing.needVatLabel')}>
          <Badge
            variant="light"
            color={extra.needVAT !== false ? 'teal' : 'gray'}
            size="sm"
            radius="sm"
          >
            {extra.needVAT !== false ? t('salesOrders.billing.on') : t('salesOrders.billing.off')}
          </Badge>
        </DetailField> */}
        {shouldDisplayShippingFee && (
          <DetailField label={t('salesOrders.billing.needShippingFeeLabel')}>
            <Badge
              variant="light"
              color={extra.needShippingFee === true ? 'teal' : 'gray'}
              size="sm"
              radius="sm"
            >
              {extra.needShippingFee === true
                ? t('salesOrders.billing.on')
                : t('salesOrders.billing.off')}
            </Badge>
          </DetailField>
        )}
        {!needVat && (
          <DetailField label={t('salesOrders.billing.vatRateLabel')}>
            {needVat ? `${+(resolveOrderVatRate(extra, vatRate) * 100).toFixed(2)}%` : '—'}
          </DetailField>
        )}
        {shouldDisplayVatTag && (
          <DetailField label={t('salesOrders.billing.vatTag')}>{extra.vatTag || '—'}</DetailField>
        )}
        {shouldDisplayShippingFee && (
          <DetailField label={t('salesOrders.billing.shippingFeeLabel')}>
            {typeof extra.shippingFee === 'number' ? extra.shippingFee.toLocaleString() : '—'}
          </DetailField>
        )}
        {needVat && (
          <DetailField
            label={`${t('salesOrders.billing.vatAmountLabel')} (${+(resolveOrderVatRate(extra, vatRate) * 100).toFixed(2)}%)`}
          >
            <Text fw={600}>{salesOrderTotals.vat.toLocaleString()}</Text>
          </DetailField>
        )}
        <DetailField label={t('salesOrders.billing.totalInclLabel')}>
          <Text fw={600}>{salesOrderTotals.grandTotal.toLocaleString()}</Text>
        </DetailField>
        <DetailField label={t('salesOrders.billing.paidLabel')}>
          {(() => {
            const payment = resolveSalesOrderPaymentState(extra, salesOrderTotals.grandTotal);
            if (payment.state === 'partial') {
              return (
                <Stack gap={2}>
                  <Badge variant="light" color="orange" size="sm" radius="sm">
                    {t('salesOrders.billing.partial')}
                  </Badge>
                  <Text size="xs" c="dimmed">
                    {t('salesOrders.billing.paidRemaining', {
                      paid: payment.paidAmount.toLocaleString(),
                      remaining: payment.remaining.toLocaleString(),
                    })}
                  </Text>
                </Stack>
              );
            }
            return (
              <Badge
                variant="light"
                color={payment.state === 'paid' ? 'teal' : 'gray'}
                size="sm"
                radius="sm"
              >
                {payment.state === 'paid'
                  ? t('salesOrders.billing.paid')
                  : t('salesOrders.billing.unpaid')}
              </Badge>
            );
          })()}
        </DetailField>
        <DetailField label={t('salesOrders.billing.invoiceLabel')}>
          <Badge
            variant="light"
            color={extra.invoiceIssued ? 'teal' : 'gray'}
            size="sm"
            radius="sm"
          >
            {extra.invoiceIssued
              ? t('salesOrders.billing.invoiceIssued')
              : t('salesOrders.billing.invoiceNotIssued')}
          </Badge>
        </DetailField>
      </SimpleGrid>
      {/* Finance "no financial data needed" flag — set here + inline from the
          Finance list view (NOT the form). Suppresses the list's missing-amount
          mark. See modules/sales-orders.md → Finance view. */}
      {canEdit ? (
        <Switch
          size="sm"
          checked={extra.billingNotRequired === true}
          onChange={(e) =>
            handleMetaPatch({
              extra: { billingNotRequired: e.currentTarget.checked ? true : undefined },
            })
          }
          label={t('salesOrders.finance.exemptLabel')}
        />
      ) : (
        extra.billingNotRequired === true && (
          <Badge variant="light" color="gray" size="sm" radius="sm">
            {t('salesOrders.finance.exemptLabel')}
          </Badge>
        )
      )}
    </>
  ) : null;

  const mobileInfoFields = (
    <Stack gap="sm">
      {customerHeaderMobile}

      <Divider variant="dashed" />

      <SimpleGrid cols={1} spacing="xs">
        <DetailField label={t('salesOrders.detail.assignedStaff')}>
          {assignedStaffField}
        </DetailField>
        <DetailField label={t('salesOrders.detail.createdBy')}>
          <EmployeeLink id={extra.createdBy} size="xs" />
        </DetailField>
        <DetailField label={t('salesOrders.detail.deliveryDate')}>{deliveryDateField}</DetailField>
        <DetailField label={t('salesOrders.detail.deliveryMethod')}>
          {deliveryMethodField}
        </DetailField>
        {showPackageSize && (
          <DetailField label={t('salesOrders.detail.deliveryPackageSize')}>
            {deliveryPackageSizeField}
          </DetailField>
        )}
      </SimpleGrid>

      {linkedDRs.length > 0 && <SalesOrderDeliveryRequestInfo requests={linkedDRs} compact />}

      <DetailField label={t('common.labels.deliveryAddress')}>{deliveryAddressMobile}</DetailField>
      {notesDetailContent}

      {billingFields}

      {metadataFooter}
    </Stack>
  );

  const desktopInfoFields = (
    <Stack gap="md">
      {customerHeaderDesktop}

      <Divider variant="dashed" />

      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
        <DetailField label={t('salesOrders.detail.assignedStaff')}>
          {assignedStaffField}
        </DetailField>
        <DetailField label={t('salesOrders.detail.deliveryDate')}>{deliveryDateField}</DetailField>
        <DetailField label={t('salesOrders.detail.deliveryMethod')}>
          {deliveryMethodField}
        </DetailField>
        {showPackageSize && (
          <DetailField label={t('salesOrders.detail.deliveryPackageSize')}>
            {deliveryPackageSizeField}
          </DetailField>
        )}
        <DetailField label={t('salesOrders.detail.createdBy')}>
          <EmployeeLink id={extra.createdBy} />
        </DetailField>
      </SimpleGrid>

      <Grid gutter="md">
        <Grid.Col span={{ base: 12, md: 6 }}>
          <DetailField label={t('common.labels.deliveryAddress')}>
            {deliveryAddressDesktop}
          </DetailField>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>{notesDetailContent}</Grid.Col>
      </Grid>

      {billingFields}

      {metadataFooter}

      {linkedDRs.length > 0 && <SalesOrderDeliveryRequestInfo requests={linkedDRs} />}
    </Stack>
  );

  const mobileTabs: ReadonlyArray<{ value: string; label: string; icon: ReactNode }> = [
    {
      value: 'overview',
      label: t('salesOrders.detail.tabOverview'),
      icon: <IconPackage size={14} />,
    },
    { value: 'photos', label: t('salesOrders.detail.tabPhotos'), icon: <IconPhoto size={14} /> },
    {
      value: 'productPhotos',
      label: t('salesOrders.detail.tabProductPhotos'),
      icon: <IconPhotoScan size={14} />,
    },
    {
      value: 'chat',
      label: t('salesOrders.detail.tabChat'),
      icon: <IconMessageCircle size={14} />,
    },
  ];

  if (isMobile) {
    return (
      <Stack gap={0}>
        <Tabs value={mobileTab} onChange={(v) => setMobileTab(v ?? mobileTabs[0].value)}>
          <MobileScrollPillTabs tabs={mobileTabs} value={mobileTab} onChange={setMobileTab} />

          <Tabs.Panel value="overview">
            <Stack gap="sm" p="sm">
              {stuckReservationBanner}
              {reconcileBanner}
              {/* Info / Items / Activity / Attachments accordions */}
              <Accordion defaultValue="info" variant="separated">
                <Accordion.Item value="info">
                  <Accordion.Control>
                    <Group gap={4} wrap="wrap">
                      <Text size="sm" fw={500}>
                        {order.orderNumber}
                      </Text>
                      {headerStatus.label ? (
                        <Badge
                          color={headerStatus.color}
                          variant="filled"
                          size="xs"
                          style={{ flexShrink: 0 }}
                        >
                          {headerStatus.label}
                        </Badge>
                      ) : isCancelled ? (
                        <Badge color="red" variant="filled" size="xs" style={{ flexShrink: 0 }}>
                          {t('salesOrders.cancel.statusBadge')}
                        </Badge>
                      ) : null}
                      {isUrgent && (
                        <Badge color="red" variant="filled" size="xs" style={{ flexShrink: 0 }}>
                          {t('salesOrders.urgent')}
                        </Badge>
                      )}
                    </Group>
                  </Accordion.Control>
                  <Accordion.Panel>{mobileInfoFields}</Accordion.Panel>
                </Accordion.Item>
                <Accordion.Item value="items">
                  <Accordion.Control>{t('salesOrders.detail.itemsTitle')}</Accordion.Control>
                  <Accordion.Panel>
                    <Box mx={-16}>
                      <OrderItemsTable
                        items={order.items}
                        totalAmount={order.totalAmount}
                        ownReservedSnapshot={linkage?.reservedSnapshot}
                        inventoryLinkageState={linkage?.state}
                        canEditItemMemo={canEditItemMemo}
                        onItemMemoSave={handleItemMemoPatch}
                        productPhotoOnHover={variant.itemProductPhotoOnHover}
                        currentOrderNumber={order.orderNumber}
                      />
                    </Box>
                  </Accordion.Panel>
                </Accordion.Item>
                <Accordion.Item value="attachments">
                  <Accordion.Control>{t('salesOrders.detail.tabAttachments')}</Accordion.Control>
                  <Accordion.Panel>
                    <Box mx={-16}>{attachmentsContent}</Box>
                  </Accordion.Panel>
                </Accordion.Item>
                <Accordion.Item value="activity">
                  <Accordion.Control>{t('salesOrders.detail.tabActivity')}</Accordion.Control>
                  <Accordion.Panel>
                    <Box mx={-16}>{activityContent}</Box>
                  </Accordion.Panel>
                </Accordion.Item>
              </Accordion>
              {actionButtons}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="photos">{photosContent}</Tabs.Panel>

          <Tabs.Panel value="productPhotos">
            <Box p="sm">{productPhotosContent}</Box>
          </Tabs.Panel>

          <Tabs.Panel value="chat">
            <ChatPanel
              messages={extra.chatHistory ?? []}
              currentUserId={currentEmployee?.id}
              onSend={handleSendChat}
            />
          </Tabs.Panel>
        </Tabs>

        {/* Floating camera FAB */}
        {canManageOrderPhotos && (
          <Affix position={{ bottom: 80, right: 16 }} zIndex={100}>
            <ActionIcon
              size={48}
              radius="xl"
              variant="filled"
              onClick={openCamera}
              loading={cameraUploading}
              style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)' }}
            >
              <IconCamera size={20} />
            </ActionIcon>
          </Affix>
        )}

        <CameraCapture
          opened={cameraOpened}
          onClose={closeCamera}
          onCapture={handleMobileCameraCapture}
          uploading={cameraUploading}
          marker={order.orderNumber ?? ''}
          userName={currentEmployee?.name}
          t={t}
        />

        {statusChangeModal}
        {cancelOrderModal}
        {manualReleaseModal}
        {reconcileModal}
        {deleteOrderModal}
        {printOptionsModal}
      </Stack>
    );
  }

  return (
    <Stack gap="lg">
      {/* Back + Edit */}
      <Group justify="space-between">
        <Button
          onClick={() => window.history.back()}
          variant="subtle"
          size="compact-sm"
          leftSection={<IconArrowLeft size={16} />}
        >
          {t('__new__.01-common.actions.back')}
        </Button>
        <Group gap="xs">
          {showDeliveryNotePrint && (
            <Button
              variant="subtle"
              size="compact-sm"
              leftSection={<IconPrinter size={14} />}
              onClick={() => setPrintOptionsOpened(true)}
            >
              {t('salesOrders.detail.printDeliveryNote')}
            </Button>
          )}
          {showDeliveryNotePrint && canSharePdf && (
            <Button
              variant="subtle"
              color="teal"
              size="compact-sm"
              leftSection={<IconShare size={14} />}
              onClick={() => setPrintOptionsOpened(true)}
            >
              {t('salesOrders.detail.shareDeliveryNotePdf')}
            </Button>
          )}
          {canCreate && (
            <Button
              variant="subtle"
              size="compact-sm"
              leftSection={<IconCopy size={14} />}
              onClick={handleCopyOrder}
            >
              {t('__new__.07-entities.salesOrders.actions.copy')}
            </Button>
          )}
          {canEdit && !order.isClosed && !isCancelled && (
            <Button
              component={Link}
              to={ROUTES.SALES_ORDERS.EDIT.replace(':id', order.id)}
              variant="light"
              size="compact-sm"
              leftSection={<IconEdit size={14} />}
            >
              {t('__new__.01-common.actions.edit')}
            </Button>
          )}
        </Group>
      </Group>

      {stuckReservationBanner}
      {reconcileBanner}

      {/* Header — order number + status (configured cancelled status when cancelled) + urgent + linkage + created timestamp */}
      <Group justify="space-between" wrap="nowrap" align="center">
        <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
          <Title order={3} ff="monospace" style={{ letterSpacing: '0.3px' }}>
            {order.orderNumber}
          </Title>
          {headerStatus.label ? (
            <Badge color={headerStatus.color} variant="filled" size="md">
              {headerStatus.label}
            </Badge>
          ) : isCancelled ? (
            <Badge color="red" variant="filled" size="md">
              {t('salesOrders.cancel.statusBadge')}
            </Badge>
          ) : null}
          {isUrgent && (
            <Badge color="red" variant="filled" size="sm">
              {t('salesOrders.urgent')}
            </Badge>
          )}
          {linkageBadge}
          {cheatBadge}
          {vacuousCompletionBadge}
        </Group>
        <Text size="sm" c="dimmed">
          {formatDateTime(getSalesOrderReadyDate(order))}
        </Text>
      </Group>

      {/* Action buttons (transition + cancel) */}
      {actionButtons && (
        <Group gap="xs" wrap="wrap">
          <FieldLabel>{t('salesOrders.detail.availableActions')}</FieldLabel>
          {actionButtons}
        </Group>
      )}

      {/* Order metadata — always visible (replaces the legacy collapse). */}
      <Card withBorder padding="md" bg={resolveSalesOrderRowBg(isUrgent, currentStatus.stage)}>
        {desktopInfoFields}
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="items" leftSection={<IconPackage size={16} />}>
            {t('salesOrders.detail.itemsTitle')}
          </Tabs.Tab>
          <Tabs.Tab value="activity" leftSection={<IconHistory size={16} />}>
            {t('salesOrders.detail.tabActivity')}
          </Tabs.Tab>
          {activityLogTabVisible && (
            <Tabs.Tab value="activityLog" leftSection={<IconHistory size={16} />}>
              {t('salesOrders.detail.tabActivityLog')}
            </Tabs.Tab>
          )}
          <Tabs.Tab value="photos" leftSection={<IconPhoto size={16} />}>
            {t('salesOrders.detail.tabPhotos')}
          </Tabs.Tab>
          <Tabs.Tab value="productPhotos" leftSection={<IconPhotoScan size={16} />}>
            {t('salesOrders.detail.tabProductPhotos')}
          </Tabs.Tab>
          <Tabs.Tab value="attachments" leftSection={<IconPaperclip size={16} />}>
            {t('salesOrders.detail.tabAttachments')}
          </Tabs.Tab>
          <Tabs.Tab value="chat" leftSection={<IconMessageCircle size={16} />}>
            {t('salesOrders.detail.tabChat')}
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.PanelCard value="items">
          <TitledCard title={t('salesOrders.detail.itemsTitle')} p="sm">
            <OrderItemsTable
              showShortageAlert={variant.showShortageAlert}
              items={order.items}
              totalAmount={order.totalAmount}
              ownReservedSnapshot={linkage?.reservedSnapshot}
              inventoryLinkageState={linkage?.state}
              canEditItemMemo={canEditItemMemo}
              onItemMemoSave={handleItemMemoPatch}
              productPhotoOnHover={variant.itemProductPhotoOnHover}
              currentOrderNumber={order.orderNumber}
            />
          </TitledCard>
        </Tabs.PanelCard>

        <Tabs.PanelCard value="photos">{photosContent}</Tabs.PanelCard>

        <Tabs.PanelCard value="productPhotos">{productPhotosContent}</Tabs.PanelCard>

        <Tabs.PanelCard value="attachments">{attachmentsContent}</Tabs.PanelCard>

        <Tabs.Panel value="chat">
          <ChatPanel
            messages={extra.chatHistory ?? []}
            currentUserId={currentEmployee?.id}
            onSend={handleSendChat}
          />
        </Tabs.Panel>

        <Tabs.PanelCard value="activity">{activityContent}</Tabs.PanelCard>

        {activityLogTabVisible && (
          <Tabs.Panel value="activityLog" pt="md">
            {/* Lazy-mount: the by-target panel fires `getByTarget` on mount,
                so we only mount it when the tab is selected. Matches the
                product / material detail pages. */}
            {activeTab === 'activityLog' && (
              <ActivityByTargetPanel targetId={order.id} i18nNamespace="salesOrders.detail" />
            )}
          </Tabs.Panel>
        )}
      </Tabs>

      {statusChangeModal}
      {cancelOrderModal}
      {manualReleaseModal}
      {reconcileModal}
      {deleteOrderModal}
      {printOptionsModal}
      <CreateDeliveryRequestModal
        opened={createDROpened}
        onClose={closeCreateDR}
        salesOrder={order}
        onCreated={refreshLinkedDRs}
      />
      <CreateReturnShipmentModal
        opened={createReturnOpened}
        onClose={closeCreateReturn}
        salesOrder={order}
        onCreated={refreshLinkedDRs}
      />
    </Stack>
  );
}
