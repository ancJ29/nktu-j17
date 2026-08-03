import {
  Accordion,
  ActionIcon,
  Affix,
  Badge,
  Box,
  Button,
  Card,
  CopyButton,
  Divider,
  Grid,
  Group,
  NumberInput,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconCamera,
  IconCheck,
  IconCopy,
  IconEdit,
  IconHistory,
  IconPackage,
  IconPhoto,
  IconTrash,
} from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { ROUTES } from '@/constants/routes';
import { device } from '@credo/base-ui/utils';
import {
  FieldLabel,
  InlineEditField,
  InlineSelectField,
  InlineTextareaField,
  Tabs,
} from '@credo/base-ui/components';
import type { InlineEditLabels } from '@credo/base-ui/components';
import { ActivityTimeline } from '@/components/ActivityTimeline';
import { ActivityByTargetPanel } from '@/components/activity/ActivityByTargetPanel';
import { AddressWithMapLink } from '@/components/AddressWithMapLink';
import { DateField } from '@/components/DateField';
import { DetailField } from '@/components/DetailField';
import { EmployeeLink } from '@/components/EmployeeLink';
import { ImageUploadPanel, CameraCapture } from '@/components/ImageUploadPanel';
import { SalesOrderLink } from '@/components/SalesOrderLink';
import { TitledCard } from '@/components/TitledCard';
import { VendorLink } from '@/components/VendorLink';
import { useCustomerStore } from '@/stores/useCustomerStore';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import { useProductStore } from '@/stores/useProductStore';
import { useVendorStore } from '@/stores/useVendorStore';
import { formatDate, formatDateTime } from '@/utils/dateFormat';
import {
  getDeliveryRequestDriverDepartments,
  isActivityLoggingEnabled,
  isPricingManagementEnabled,
  makeEmployeeDepartmentFilter,
  perms,
} from '@/utils/permission';
import type { DeliveryRequestExtra } from '@/types';
import { deliveryRequestStatusOptions } from './useDeliveryRequestStatusOptions';
import { useDeliveryRequestDetail } from './useDeliveryRequestDetail';
import { StatusChangeModal } from './StatusChangeModal';
import { ConfirmModal } from '@/components/ConfirmModal';
import { EditDeliveryRequestModal } from './EditDeliveryRequestModal';
import { DeliveryRequestKindBadge } from './DeliveryRequestKindBadge';
import type { DeliveryRequestVariant } from './deliveryRequestVariant';

const isMobile = device.isMobile;
const canEdit = perms.deliveryRequest.canEdit();
const canManagePhotos = perms.deliveryRequest.canManagePhotos();
const pricingEnabled = isPricingManagementEnabled();

const activityLogTabVisible = !isMobile && isActivityLoggingEnabled();
const driverEmployeeFilter = makeEmployeeDepartmentFilter(getDeliveryRequestDriverDepartments());
const { resolveStatus } = deliveryRequestStatusOptions;

type DeliveryRequestDetailProps = {
  readonly variant: DeliveryRequestVariant;
};

export function DeliveryRequestDetail({ variant }: DeliveryRequestDetailProps) {
  const shouldShowListItems = variant.showListItems;
  const { t } = useTranslation();
  const detail = useDeliveryRequestDetail(t, {
    skipViewScopeGuard: variant.skipViewScopeGuard,
  });
  const {
    request,
    loading,
    actionLoading,
    currentStatus,
    allowedTransitions,
    statusFlowOrder,
    currentFlowIndex,
    activityByStatus,
    currentEmployee,
    deliveredQty,
    setLineDeliveredQty,
    pending,
    pendingIsCompletion,
    note,
    setNote,
    requestStatusChange,
    cancelStatusChange,
    confirmStatusChange,
    handleMetaPatch,
    applyUpdatedRequest,
    showDelete,
    deleteOpened,
    openDelete,
    closeDelete,
    handleDelete,
    imageDirectory,
    handlePhotosChange,
    cameraOpened,
    openCamera,
    openCompletionCamera,
    closeCamera,
    cameraUploading,
    handleMobileCameraCapture,
    completionPhotos,
  } = detail;

  const products = useProductStore((s) => s.items);
  const employees = useEmployeeStore((s) => s.items);
  const customers = useCustomerStore((s) => s.items);
  const getVendorByCode = useVendorStore((s) => s.getByCode);

  const [activeTab, setActiveTab] = useState<string | null>('photos');

  const [editOpen, setEditOpen] = useState(false);

  const skuByCode = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of products) {
      const sku = p.extra?.sku;
      if (sku) m.set(p.code, sku);
    }
    return m;
  }, [products]);

  const driverSelectData = useMemo(() => {
    const pickable = employees.filter(driverEmployeeFilter);
    const currentDriverId = (request?.extra as { assignedDriverId?: string } | undefined)
      ?.assignedDriverId;
    if (currentDriverId && !pickable.some((e) => e.id === currentDriverId)) {
      const current = employees.find((e) => e.id === currentDriverId);
      if (current) pickable.push(current);
    }
    return pickable.map((e) => ({ value: e.id, label: e.name }));
  }, [employees, request]);

  if (loading || !request) return null;

  const isInbound = request.direction === 'inbound';
  const drExtra = (request.extra ?? {}) as DeliveryRequestExtra;

  const inboundKind = drExtra.inboundKind ?? 'vendor';
  const isReturn = isInbound && inboundKind === 'customer-return';
  const isSample = isInbound && inboundKind === 'customer-sample';
  const partyIsCustomer = !isInbound || isReturn || isSample;
  const showsSalesOrderLink = !isInbound || isReturn;
  const canEditMeta = canEdit && !request.isClosed;

  const resolvedVendor =
    !partyIsCustomer && request.vendorCode ? getVendorByCode(request.vendorCode) : undefined;
  const resolvedCustomer = !partyIsCustomer
    ? undefined
    : drExtra.customerCode
      ? customers.find((c) => c.code === drExtra.customerCode)
      : request.customerName
        ? customers.find(
            (c) => c.name === request.customerName || c.extra?.shortName === request.customerName,
          )
        : undefined;

  const customerDisplayName =
    resolvedCustomer?.extra?.shortName?.trim() || resolvedCustomer?.name || request.customerName;
  const contactName = partyIsCustomer
    ? customerDisplayName || ''
    : resolvedVendor?.extra?.shortName?.trim() || resolvedVendor?.name || request.vendorName || '';
  const contactPhone = (partyIsCustomer ? resolvedCustomer?.phone : resolvedVendor?.phone) ?? '';
  const contactCopyText = [contactName, drExtra.deliveryAddress, drExtra.googleMapUrl, contactPhone]
    .map((s) => s?.trim())
    .filter(Boolean)
    .join('\n');

  const itemsSectionTitle = isInbound
    ? t('deliveryRequests.detail.itemsTitleReceive')
    : t('deliveryRequests.detail.itemsTitle');
  const photosSectionTitle = isInbound
    ? t('deliveryRequests.detail.photosTitleReceive')
    : t('deliveryRequests.detail.photosTitle');
  const noItemsLabel = isInbound
    ? t('deliveryRequests.detail.noItemsReceive')
    : t('deliveryRequests.detail.noItems');
  const deliveredColumnHeader = isInbound
    ? t('deliveryRequests.detail.received')
    : t('deliveryRequests.detail.delivered');
  const addressLabel = isInbound
    ? t('deliveryRequests.detail.pickupAddressLabel')
    : t('common.labels.deliveryAddress');

  const inlineEditLabels: InlineEditLabels = {
    edit: t('__new__.01-common.actions.edit'),
    save: t('__new__.01-common.actions.save'),
    cancel: t('__new__.01-common.actions.cancel'),
  };

  const driverField = (
    <InlineSelectField
      canEdit={canEditMeta}
      value={drExtra.assignedDriverId ?? ''}
      onSave={async (next) => {
        const picked = next ? employees.find((e) => e.id === next) : undefined;
        await handleMetaPatch({
          extra: {
            assignedDriverId: next || undefined,
            assignedDriverName: picked?.name || undefined,
          },
        });
      }}
      data={driverSelectData}
      placeholder={t('deliveryRequests.detail.noDriverAssigned')}
      labels={inlineEditLabels}
      renderValueDisplay={(v) => <EmployeeLink id={v} />}
    />
  );

  const scheduledDateForEditor: string | null = request.scheduledDate
    ? new Date(request.scheduledDate).toISOString().slice(0, 10)
    : null;
  const scheduledDateField = (
    <InlineEditField<string | null>
      canEdit={canEditMeta}
      value={scheduledDateForEditor}
      onSave={async (next) =>
        handleMetaPatch({ scheduledDate: next ? new Date(next).toISOString() : undefined })
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
          onChange={(nextVal) => onChange(nextVal || null)}
          placeholder={t('deliveryRequests.columns.scheduledDate')}
          autoFocus
        />
      )}
    />
  );

  const notesField = (
    <InlineTextareaField
      canEdit={canEditMeta}
      value={request.notes ?? ''}
      onSave={async (next) => handleMetaPatch({ notes: next })}
      placeholder={t('deliveryRequests.form.notesPlaceholder')}
      emptyPlaceholder={t('__new__.01-common.empty.noNote')}
      labels={inlineEditLabels}
    />
  );

  const deliveryAddressMobile = (
    <AddressWithMapLink
      address={drExtra.deliveryAddress}
      googleMapUrl={drExtra.googleMapUrl}
      size="xs"
    />
  );
  const deliveryAddressDesktop = (
    <AddressWithMapLink
      address={drExtra.deliveryAddress}
      googleMapUrl={drExtra.googleMapUrl}
      fw={500}
    />
  );

  const showTransitions = canEdit && allowedTransitions.length > 0;
  const actionButtons =
    showTransitions || showDelete ? (
      <Group gap={isMobile ? 'xs' : 'sm'} wrap="wrap">
        {showTransitions &&
          allowedTransitions.map((next) => (
            <Button
              key={next.value}
              size="sm"
              color={next.color}
              variant="light"
              loading={actionLoading}
              onClick={(e) => {
                e.stopPropagation();
                requestStatusChange(next.value);
              }}
            >
              {next.actionLabel}
            </Button>
          ))}
        {showDelete && (
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
            {t('deliveryRequests.delete.actionButton')}
          </Button>
        )}
      </Group>
    ) : null;

  const partyLabel = partyIsCustomer
    ? t('common.labels.customer')
    : t('deliveryRequests.detail.vendorLabel');
  const partyContent = !partyIsCustomer ? (
    <VendorLink code={request.vendorCode} name={request.vendorName} />
  ) : customerDisplayName ? (
    <Text size="md" fw={600}>
      {customerDisplayName}
    </Text>
  ) : (
    <Text size="md" fw={600} c="dimmed">
      —
    </Text>
  );

  const directionBadge = <DeliveryRequestKindBadge dr={request} size="sm" />;

  const copyContactButton = contactCopyText ? (
    <CopyButton value={contactCopyText} timeout={1500}>
      {({ copied, copy }) => (
        <Tooltip
          label={copied ? t('common.labels.copied') : t('deliveryRequests.detail.copyContact')}
          withArrow
        >
          <ActionIcon variant="light" color={copied ? 'teal' : 'gray'} onClick={copy}>
            {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
          </ActionIcon>
        </Tooltip>
      )}
    </CopyButton>
  ) : null;

  const partyHeaderDesktop = (
    <Group justify="space-between" align="flex-start" wrap="nowrap" gap="md">
      <Stack gap={2} style={{ minWidth: 0, flex: 1 }}>
        <FieldLabel>{partyLabel}</FieldLabel>
        <Box>{partyContent}</Box>
      </Stack>
      <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
        {directionBadge}
        {copyContactButton}
      </Group>
    </Group>
  );

  const partyHeaderMobile = (
    <Group justify="space-between" align="flex-start" wrap="wrap" gap="xs">
      <Stack gap={2} style={{ minWidth: 0 }}>
        <FieldLabel>{partyLabel}</FieldLabel>
        <Box>{partyContent}</Box>
      </Stack>
      <Group gap="xs" wrap="nowrap">
        {directionBadge}
        {copyContactButton}
      </Group>
    </Group>
  );

  const salesOrderLinkContent = showsSalesOrderLink ? (
    <SalesOrderLink id={request.salesOrderId} fallbackLabel={request.salesOrderNumber} />
  ) : null;

  const metadataFooter = (
    <Group justify="flex-end" gap="md" wrap="nowrap">
      <Text size="xs" c="dimmed">
        {t('common.labels.createdAt')} · {formatDateTime(request.createdAt)}
      </Text>
      <Text size="xs" c="dimmed">
        {t('common.labels.updatedAt')} · {formatDateTime(request.updatedAt)}
      </Text>
      {request.closedAt && (
        <Text size="xs" c="dimmed">
          {t('deliveryRequests.detail.closedAt')} · {formatDateTime(request.closedAt)}
        </Text>
      )}
    </Group>
  );

  const mobileInfoFields = (
    <Stack gap="sm">
      {partyHeaderMobile}

      <Divider variant="dashed" />

      <SimpleGrid cols={1} spacing="xs">
        <DetailField label={t('deliveryRequests.detail.driverLabel')}>{driverField}</DetailField>
        <DetailField label={t('deliveryRequests.columns.scheduledDate')}>
          {scheduledDateField}
        </DetailField>
        {salesOrderLinkContent && (
          <DetailField label={t('common.labels.salesOrder')}>{salesOrderLinkContent}</DetailField>
        )}
        {pricingEnabled && (
          <DetailField label={t('common.columns.totalAmount')}>
            <Text size="sm" fw={500}>
              {request.totalAmount?.toLocaleString() ?? '-'}
            </Text>
          </DetailField>
        )}
      </SimpleGrid>

      <DetailField label={addressLabel}>{deliveryAddressMobile}</DetailField>
      <DetailField label={t('__new__.01-common.labels.note')}>{notesField}</DetailField>

      {metadataFooter}
    </Stack>
  );

  const desktopInfoFields = (
    <Stack gap="md">
      {partyHeaderDesktop}

      <Divider variant="dashed" />

      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
        <DetailField label={t('deliveryRequests.detail.driverLabel')}>{driverField}</DetailField>
        <DetailField label={t('deliveryRequests.columns.scheduledDate')}>
          {scheduledDateField}
        </DetailField>
        {salesOrderLinkContent && (
          <DetailField label={t('common.labels.salesOrder')}>{salesOrderLinkContent}</DetailField>
        )}
        {pricingEnabled && (
          <DetailField label={t('common.columns.totalAmount')}>
            <Text size="sm" fw={500}>
              {request.totalAmount?.toLocaleString() ?? '-'}
            </Text>
          </DetailField>
        )}
      </SimpleGrid>

      <Grid gutter="md">
        <Grid.Col span={{ base: 12, md: 6 }}>
          <DetailField label={addressLabel}>{deliveryAddressDesktop}</DetailField>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <DetailField label={t('__new__.01-common.labels.note')}>{notesField}</DetailField>
        </Grid.Col>
      </Grid>

      {metadataFooter}
    </Stack>
  );

  const itemsContent =
    request.items.length === 0 ? (
      <Text size="sm" c="dimmed" ta="center" py="md">
        {noItemsLabel}
      </Text>
    ) : (
      <Table striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>#</Table.Th>
            <Table.Th>{t('common.labels.sku')}</Table.Th>
            <Table.Th>{t('common.labels.productName')}</Table.Th>
            <Table.Th style={{ textAlign: 'right' }}>{t('common.labels.quantity')}</Table.Th>
            <Table.Th>{t('common.labels.unit')}</Table.Th>
            <Table.Th style={{ textAlign: 'right', width: 140 }}>{deliveredColumnHeader}</Table.Th>
            {pricingEnabled && (
              <>
                <Table.Th style={{ textAlign: 'right' }}>{t('common.labels.unitPrice')}</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>{t('common.detail.lineTotal')}</Table.Th>
              </>
            )}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {request.items.map((item, idx) => {
            const key = `${item.productCode}::${item.unit}`;
            const delivered = deliveredQty.get(key) ?? 0;
            return (
              <Table.Tr key={idx}>
                <Table.Td>{idx + 1}</Table.Td>
                <Table.Td>{skuByCode.get(item.productCode) || '—'}</Table.Td>
                <Table.Td>{item.productName}</Table.Td>
                <Table.Td style={{ textAlign: 'right' }}>{item.quantity.toLocaleString()}</Table.Td>
                <Table.Td>{item.unit}</Table.Td>
                <Table.Td style={{ textAlign: 'right' }}>
                  {request.isClosed ? (
                    <Text size="sm">{delivered.toLocaleString()}</Text>
                  ) : (
                    <NumberInput
                      size="xs"
                      min={0}

                      {...(isInbound ? {} : { max: item.quantity })}
                      hideControls
                      value={delivered}
                      onChange={(v) =>
                        setLineDeliveredQty(key, typeof v === 'number' ? v : Number(v) || 0)
                      }
                    />
                  )}
                </Table.Td>
                {pricingEnabled && (
                  <>
                    <Table.Td style={{ textAlign: 'right' }}>
                      {item.unitPrice.toLocaleString()}
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      {(item.quantity * item.unitPrice).toLocaleString()}
                    </Table.Td>
                  </>
                )}
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    );

  const activityContent = (
    <ActivityTimeline
      statusFlowOrder={statusFlowOrder}
      currentFlowIndex={currentFlowIndex}
      currentStatusValue={currentStatus.value}
      activityByStatus={activityByStatus}
      resolveStatus={resolveStatus}
      expectedDeliveryAtStatus={null}
      showNotes={false}
    />
  );

  const photosContent = (
    <ImageUploadPanel
      images={drExtra.photos ?? []}
      onChange={handlePhotosChange}
      imageDirectory={imageDirectory}
      editable={canManagePhotos}
      marker={request.requestNumber ?? ''}
      currentUserId={currentEmployee?.id}
      currentUserName={currentEmployee?.name}
      externalCamera={isMobile}
    />
  );

  const statusChangeModal = (
    <StatusChangeModal
      opened={pending != null}
      onClose={cancelStatusChange}
      targetStatus={
        pending
          ? { value: pending.toValue, label: pending.toLabel, actionLabel: pending.actionLabel }
          : null
      }
      currentStatus={currentStatus}
      note={note}
      onNoteChange={setNote}
      onConfirm={confirmStatusChange}
      loading={actionLoading}

      requirePhotoCapture={isMobile && pendingIsCompletion}
      capturedPhotos={completionPhotos}
      onCapturePhoto={openCompletionCamera}
      capturing={cameraUploading}
      t={t}
    />
  );

  const deleteRequestModal = (
    <ConfirmModal
      opened={deleteOpened}
      onClose={closeDelete}
      onConfirm={handleDelete}
      title={t('deliveryRequests.delete.confirmTitle')}
      message={t('deliveryRequests.delete.confirmMessage')}
      confirmLabel={t('deliveryRequests.delete.actionButton')}
      confirmColor="red"
      loading={actionLoading}
    />
  );

  if (isMobile) {
    return (
      <Stack gap={0}>
        <Tabs defaultValue="overview">
          <Tabs.List>
            <Tabs.Tab value="overview" leftSection={<IconPackage size={14} />}>
              {t('salesOrders.detail.tabOverview')}
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="overview">
            <Stack gap="sm" p="sm">
              <Accordion defaultValue="info" variant="separated">
                <Accordion.Item value="info">
                  <Accordion.Control>
                    <Group gap={4} wrap="wrap">
                      <Text size="sm" fw={500}>
                        {request.requestNumber}
                      </Text>
                      <Badge
                        color={currentStatus.color}
                        variant="filled"
                        size="xs"
                        style={{ flexShrink: 0 }}
                      >
                        {currentStatus.label}
                      </Badge>
                      <DeliveryRequestKindBadge
                        dr={request}
                        variant="filled"
                        size="xs"
                        style={{ flexShrink: 0 }}
                      />
                    </Group>
                  </Accordion.Control>
                  <Accordion.Panel>{mobileInfoFields}</Accordion.Panel>
                </Accordion.Item>
                <Accordion.Item value="items">
                  <Accordion.Control>{itemsSectionTitle}</Accordion.Control>
                  <Accordion.Panel>
                    <Box mx={-16}>{itemsContent}</Box>
                  </Accordion.Panel>
                </Accordion.Item>
                <Accordion.Item value="photos">
                  <Accordion.Control>{t('deliveryRequests.detail.tabPhotos')}</Accordion.Control>
                  <Accordion.Panel>{photosContent}</Accordion.Panel>
                </Accordion.Item>
                <Accordion.Item value="activity">
                  <Accordion.Control>{t('deliveryRequests.detail.tabActivity')}</Accordion.Control>
                  <Accordion.Panel>
                    <Box mx={-16}>{activityContent}</Box>
                  </Accordion.Panel>
                </Accordion.Item>
              </Accordion>
              {actionButtons}
            </Stack>
          </Tabs.Panel>
        </Tabs>

        {/* Floating camera FAB — placed outside Tabs so it stays visible
            regardless of which accordion section is open. Mirrors the SO
            mobile detail page. */}
        {canManagePhotos && (
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
          marker={request.requestNumber ?? ''}
          userName={currentEmployee?.name}
          t={t}
        />

        {statusChangeModal}
        {deleteRequestModal}
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
          {canEdit &&
            !request.isClosed &&
            (variant.editMode === 'modal' ? (
              <Button
                onClick={() => setEditOpen(true)}
                variant="light"
                size="compact-sm"
                leftSection={<IconEdit size={14} />}
              >
                {t('__new__.01-common.actions.edit')}
              </Button>
            ) : (
              <Button
                component={Link}
                to={ROUTES.DELIVERY.EDIT.replace(':id', request.id)}
                variant="light"
                size="compact-sm"
                leftSection={<IconEdit size={14} />}
              >
                {t('__new__.01-common.actions.edit')}
              </Button>
            ))}
        </Group>
      </Group>

      {/* Header — request number + status + direction + createdAt */}
      <Group justify="space-between" wrap="nowrap" align="center">
        <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
          <Title order={3} ff="monospace" style={{ letterSpacing: '0.3px' }}>
            {request.requestNumber}
          </Title>
          <Badge color={currentStatus.color} variant="filled" size="md">
            {currentStatus.label}
          </Badge>
          <DeliveryRequestKindBadge dr={request} variant="filled" size="sm" />
        </Group>
        <Text size="sm" c="dimmed">
          {formatDateTime(request.createdAt)}
        </Text>
      </Group>

      {/* Action buttons (transitions) */}
      {actionButtons && (
        <Group gap="xs" wrap="wrap">
          <FieldLabel>{t('salesOrders.detail.availableActions')}</FieldLabel>
          {actionButtons}
        </Group>
      )}

      {/* Info card */}
      <Card withBorder padding="md">
        {desktopInfoFields}
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          {shouldShowListItems && (
            <Tabs.Tab value="items" leftSection={<IconPackage size={16} />}>
              {itemsSectionTitle}
            </Tabs.Tab>
          )}
          <Tabs.Tab value="photos" leftSection={<IconPhoto size={16} />}>
            {t('deliveryRequests.detail.tabPhotos')}
          </Tabs.Tab>
          <Tabs.Tab value="activity" leftSection={<IconHistory size={16} />}>
            {t('deliveryRequests.detail.tabActivity')}
          </Tabs.Tab>
          {activityLogTabVisible && (
            <Tabs.Tab value="activityLog" leftSection={<IconHistory size={16} />}>
              {t('deliveryRequests.detail.tabActivityLog')}
            </Tabs.Tab>
          )}
        </Tabs.List>

        <Tabs.PanelCard value="items">
          <TitledCard title={itemsSectionTitle} p="sm">
            {itemsContent}
          </TitledCard>
        </Tabs.PanelCard>

        <Tabs.PanelCard value="photos">
          <TitledCard title={photosSectionTitle} p="sm">
            {photosContent}
          </TitledCard>
        </Tabs.PanelCard>

        <Tabs.PanelCard value="activity">{activityContent}</Tabs.PanelCard>

        {activityLogTabVisible && (
          <Tabs.Panel value="activityLog" pt="md">
            {/* Lazy-mount — the by-target panel fires `getByTarget` on mount,
                so only mount it once the tab is selected. Matches the SO /
                product / material detail pages. */}
            {activeTab === 'activityLog' && (
              <ActivityByTargetPanel
                targetId={request.id}
                i18nNamespace="deliveryRequests.detail"
              />
            )}
          </Tabs.Panel>
        )}
      </Tabs>

      {statusChangeModal}
      {deleteRequestModal}
      {variant.editMode === 'modal' && (
        <EditDeliveryRequestModal
          opened={editOpen}
          onClose={() => setEditOpen(false)}
          request={request}
          onUpdated={applyUpdatedRequest}
        />
      )}
    </Stack>
  );
}
