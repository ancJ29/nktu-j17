import {
  Badge,
  Button,
  Card,
  Grid,
  Group,
  Loader,
  Modal,
  SegmentedControl,
  Stack,
  Switch,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconArrowLeft,
  IconBan,
  IconCheck,
  IconCopy,
  IconEdit,
  IconFileInvoice,
  IconInfoCircle,
  IconListDetails,
  IconLock,
  IconPrinter,
  IconSend,
  IconShare,
  IconShoppingCartPlus,
  IconTrash,
} from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';
import { device } from '@credo/base-ui/utils';
import { ROUTES } from '@/constants/routes';
import { ConfirmModal } from '@/components/ConfirmModal';
import { CustomerLink } from '@/components/CustomerLink';
import { EmployeeLink } from '@/components/EmployeeLink';
import { SalesOrderLink } from '@/components/SalesOrderLink';
import { DangerAction } from '@/components/DangerAction';
import { DangerZoneCard } from '@/components/DangerZoneCard';
import { DetailField } from '@/components/DetailField';
import { NotFoundState } from '@/components/NotFoundState';
import { SectionCard } from '@/components/SectionCard';
import { getCompanyInfo, hasMultipleCompanies } from '@/config/companyInfo';
import { useCustomerStore } from '@/stores/useCustomerStore';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import { getCurrentEmployeeId } from '@/hooks/useCurrentEmployee';
import { useLookupV2Labels, lookupLabelOf, useProductPhotoByCode } from '@/hooks';
import { formatDateTime } from '@/utils/dateFormat';
import {
  getPricingVatRate,
  hasImagesForProducts,
  isPdfSharingEnabled,
  isQuotationTierPricingEnabled,
  perms,
} from '@/utils/permission';
import { EntityConflictError } from '@/stores/createEntityStore';
import {
  DEFAULT_QUOTATION_PRINT_OPTIONS,
  printQuotation,
  type QuotationPrintData,
  type QuotationPrintLine,
  type QuotationOrientation,
  type QuotationPaperSize,
} from './quotationPrint';
import { shareQuotationPdf } from './quotationPdf';
import { readVietnameseMoney } from '@/utils/vietnameseNumberToWords';
import { QuotationLinesTable } from './QuotationLinesTable';
import { quotationBundle, useQuotationStore } from './useQuotationStore';
import {
  canTransitionQuotation,
  isQuotationEditable,
  quotationBadgeProps,
  quotationTotal,
  type Quotation,
  type QuotationStatus,
} from './types';

const isMobile = device.isMobile;
const canCreate = perms.salesOrder.canCreate();
const canEdit = perms.salesOrder.canEdit();
const canDelete = perms.salesOrder.canDelete();
const canViewAll = perms.salesOrder.canViewAll();
const canViewSelf = perms.salesOrder.canViewSelf();

const canSharePdf = isPdfSharingEnabled();

const showPriceTiers = isQuotationTierPricingEnabled();

const showProductPhoto = hasImagesForProducts();

function canViewQuotation(q: Quotation): boolean {
  if (canViewAll) return true;
  if (!canViewSelf) return false;
  const me = getCurrentEmployeeId();
  return !!me && q.extra.assignedStaff === me;
}

function editRoute(id: string): string {
  return ROUTES.QUOTATIONS.EDIT.replace(':id', id);
}

export function QuotationDetail() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [sendModalOpened, { open: openSendModal, close: closeSendModal }] = useDisclosure(false);
  const [confirmModalOpened, { open: openConfirmModal, close: closeConfirmModal }] =
    useDisclosure(false);
  const [cancelModalOpened, { open: openCancelModal, close: closeCancelModal }] =
    useDisclosure(false);
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] =
    useDisclosure(false);
  const [printModalOpened, { open: openPrintModal, close: closePrintModal }] = useDisclosure(false);
  const [paperSize, setPaperSize] = useState<QuotationPaperSize>(
    DEFAULT_QUOTATION_PRINT_OPTIONS.paperSize,
  );
  const [orientation, setOrientation] = useState<QuotationOrientation>(
    DEFAULT_QUOTATION_PRINT_OPTIONS.orientation,
  );

  const [includeVat, setIncludeVat] = useState(true);

  const customers = useCustomerStore((s) => s.items);
  const customersInitialized = useCustomerStore((s) => s.initialized);
  const loadCustomers = useCustomerStore((s) => s.loadAll);
  const unitLabels = useLookupV2Labels('unit');
  useEffect(() => {
    if (!customersInitialized) loadCustomers();
  }, [customersInitialized, loadCustomers]);

  const photoByCode = useProductPhotoByCode();

  const employeesInitialized = useEmployeeStore((s) => s.initialized);
  const loadEmployees = useEmployeeStore((s) => s.loadAll);
  useEffect(() => {
    if (!employeesInitialized) loadEmployees();
  }, [employeesInitialized, loadEmployees]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const cached = useQuotationStore.getState().getById(id) as Quotation | undefined;
      const target = cached ?? (await quotationBundle.fetchById(id)).item;
      const visible = !!target && !target.extra.isDeleted && canViewQuotation(target);
      setQuotation(visible ? target : null);
    } catch {
      setQuotation(null);
      notifications.show({ color: 'red', message: t('quotations.notifications.fetchError') });
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    load();
  }, [load]);

  const status: QuotationStatus = quotation?.extra.status ?? 'draft';
  const isReady = status === 'sent';
  const isConfirmed = status === 'confirmed';
  const isCancelled = status === 'cancelled';
  const isConverted = status === 'converted';
  const isDraft = status === 'draft';

  const isEditable = isQuotationEditable(status);

  const isIssued = isReady || isConfirmed;
  const lines = useMemo(() => quotation?.extra.lines ?? [], [quotation]);

  const flipStatus = useCallback(
    async (next: QuotationStatus): Promise<Quotation> => {
      const write = (target: Quotation) =>
        quotationBundle.updateSafely({
          id: target.id,
          version: target.version,

          patch: {
            extra: {
              ...target.extra,
              status: next,
              ...(next === 'sent' && { sentAt: Date.now() }),
              ...(next === 'confirmed' && { confirmedAt: Date.now() }),
            },
          },
        }) as Promise<Quotation>;
      try {
        return await write(quotation!);
      } catch (err) {
        if (err instanceof EntityConflictError && err.latest) {
          const latest = err.latest as Quotation;
          const from = latest.extra.status ?? 'draft';
          if (from === next) return latest;
          if (canTransitionQuotation(from, next)) return await write(latest);
          setQuotation(latest);
        }
        throw err;
      }
    },
    [quotation],
  );

  const handleSend = useCallback(async () => {
    if (!quotation) return;
    setSending(true);
    try {
      setQuotation(await flipStatus('sent'));
      notifications.show({
        color: 'green',
        message: t('quotations.notifications.sendSuccess'),
      });
      closeSendModal();
    } catch (err) {
      if (err instanceof EntityConflictError) {
        notifications.show({
          color: 'yellow',
          title: t('common.conflict.title'),
          message: t('common.conflict.message'),
          autoClose: 8000,
        });
        closeSendModal();
      } else {
        notifications.show({
          color: 'red',
          message: t('quotations.notifications.sendError'),
          autoClose: 8000,
        });
      }
    } finally {
      setSending(false);
    }
  }, [quotation, flipStatus, t, closeSendModal]);

  const handleConfirmAgreement = useCallback(async () => {
    if (!quotation) return;
    setConfirming(true);
    try {
      setQuotation(await flipStatus('confirmed'));
      notifications.show({
        color: 'green',
        message: t('quotations.notifications.confirmSuccess'),
      });
      closeConfirmModal();
    } catch (err) {
      if (err instanceof EntityConflictError) {
        notifications.show({
          color: 'yellow',
          title: t('common.conflict.title'),
          message: t('common.conflict.message'),
          autoClose: 8000,
        });
        closeConfirmModal();
      } else {
        notifications.show({
          color: 'red',
          message: t('quotations.notifications.confirmError'),
          autoClose: 8000,
        });
      }
    } finally {
      setConfirming(false);
    }
  }, [quotation, flipStatus, t, closeConfirmModal]);

  const handleCancel = useCallback(async () => {
    if (!quotation) return;
    setCancelling(true);
    try {
      setQuotation(await flipStatus('cancelled'));
      notifications.show({
        color: 'green',
        message: t('quotations.notifications.cancelSuccess'),
      });
      closeCancelModal();
    } catch (err) {
      if (err instanceof EntityConflictError) {
        notifications.show({
          color: 'yellow',
          title: t('common.conflict.title'),
          message: t('common.conflict.message'),
          autoClose: 8000,
        });
        closeCancelModal();
      } else {
        notifications.show({
          color: 'red',
          message: t('quotations.notifications.cancelError'),
          autoClose: 8000,
        });
      }
    } finally {
      setCancelling(false);
    }
  }, [quotation, flipStatus, t, closeCancelModal]);

  const handleDelete = useCallback(async () => {
    if (!quotation) return;
    setDeleting(true);
    try {
      await quotationBundle.deleteSafely({ id: quotation.id, version: quotation.version });
      notifications.show({
        color: 'green',
        message: t('quotations.notifications.deleteSuccess'),
      });
      navigate(ROUTES.QUOTATIONS.LIST);
    } catch (err) {
      if (err instanceof EntityConflictError) {
        notifications.show({
          color: 'yellow',
          title: t('common.conflict.title'),
          message: t('common.conflict.message'),
          autoClose: 8000,
        });
        closeDeleteModal();
      } else {
        notifications.show({
          color: 'red',
          message: t('quotations.notifications.deleteError'),
          autoClose: 8000,
        });
      }
    } finally {
      setDeleting(false);
    }
  }, [quotation, t, navigate, closeDeleteModal]);

  const buildNoteData = useCallback((): QuotationPrintData => {
    const q = quotation!;
    const cust = q.extra.customerCode
      ? customers.find((c) => c.code === q.extra.customerCode)
      : undefined;
    const noteLines: QuotationPrintLine[] = (q.extra.lines ?? []).map((l) => ({
      name: l.productName || l.productCode,
      unit: lookupLabelOf(unitLabels, l.unit),
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      lineTotal: l.quantity * l.unitPrice,
      photoUrl: photoByCode.get(l.productCode),
      ...(showPriceTiers && l.priceTiers?.length ? { priceTiers: l.priceTiers } : {}),
    }));
    const subtotal = quotationTotal(q.extra.lines ?? []);
    const vatRate = includeVat ? getPricingVatRate() : 0;
    const vatAmount = subtotal * vatRate;
    const grandTotal = subtotal + vatAmount;
    const d = new Date(q.createdAt);
    const dateText = `Ngày ${String(d.getDate()).padStart(2, '0')} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}`;
    return {
      seller: getCompanyInfo(q.extra.companyId),
      code: q.extra.code,
      dateText,
      note: q.extra.note,
      customer: {
        name: cust?.name || q.extra.customerName || '',
        address: cust?.address ?? '',
        taxCode: cust?.extra?.taxCode ?? '',
        phone: cust?.phone ?? '',
      },
      lines: noteLines,
      subtotal,
      vatPercent: +(vatRate * 100).toFixed(2),
      vatAmount,
      grandTotal,
      amountInWords: readVietnameseMoney(grandTotal),
      showPhoto: showProductPhoto,
      showVat: includeVat,
    };
  }, [quotation, customers, photoByCode, unitLabels, includeVat]);

  const handlePrint = useCallback(() => {
    const st = quotation?.extra.status ?? 'draft';
    if (!quotation || (st !== 'sent' && st !== 'confirmed' && st !== 'converted')) return;
    const ok = printQuotation(buildNoteData(), { paperSize, orientation });
    closePrintModal();
    if (!ok) {
      notifications.show({
        color: 'red',
        message: t('quotations.print.popupBlocked'),
        autoClose: 8000,
      });
    }
  }, [quotation, buildNoteData, paperSize, orientation, closePrintModal, t]);

  const handleShare = useCallback(async () => {
    const st = quotation?.extra.status ?? 'draft';
    if (!quotation || (st !== 'sent' && st !== 'confirmed' && st !== 'converted')) return;
    setSharing(true);
    try {
      const result = await shareQuotationPdf(buildNoteData(), { paperSize, orientation });
      closePrintModal();
      if (result === 'downloaded') {
        notifications.show({
          color: 'blue',
          message: t('quotations.share.downloadedFallback'),
          autoClose: 6000,
        });
      }
    } catch {
      notifications.show({
        color: 'red',
        message: t('quotations.share.error'),
        autoClose: 8000,
      });
    } finally {
      setSharing(false);
    }
  }, [quotation, buildNoteData, paperSize, orientation, closePrintModal, t]);

  const handleGenerateSalesOrder = useCallback(() => {
    if (!quotation) return;
    navigate(ROUTES.SALES_ORDERS.NEW, {
      state: {
        copyFrom: {
          customerCode: quotation.extra.customerCode,
          customerName: quotation.extra.customerName,
          notes: quotation.extra.note || '',
          items: (quotation.extra.lines ?? []).map((l) => ({
            productCode: l.productCode,
            productName: l.productName,
            quantity: l.quantity,
            unit: l.unit ?? '',
            unitPrice: l.unitPrice,
          })),
          quotationLink: { id: quotation.id, code: quotation.extra.code },
        },
      },
    });
  }, [quotation, navigate]);

  if (loading) {
    return (
      <Group justify="center" py="xl">
        <Loader />
      </Group>
    );
  }
  if (!quotation || !id) {
    return (
      <NotFoundState
        title={t('common.notFound.title')}
        message={t('common.notFound.message')}
        backTo={ROUTES.QUOTATIONS.LIST}
        backLabel={t('common.notFound.backToList')}
      />
    );
  }

  const badge = quotationBadgeProps(status);

  const generateSalesOrderButton = canCreate && (
    <Button
      color="blue"
      size="compact-sm"
      leftSection={<IconShoppingCartPlus size={14} />}
      onClick={handleGenerateSalesOrder}
    >
      {t('quotations.actions.generateSalesOrder')}
    </Button>
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
              {t('__new__.01-common.actions.back')}
            </Button>
            <Group gap="sm">
              {(isIssued || isConverted) && (
                <Button
                  variant="light"
                  color="gray"
                  size="compact-sm"
                  leftSection={<IconPrinter size={14} />}
                  onClick={openPrintModal}
                >
                  {t('quotations.actions.exportPdf')}
                </Button>
              )}
              {canSharePdf && (isIssued || isConverted) && (
                <Button
                  variant="light"
                  color="teal"
                  size="compact-sm"
                  leftSection={<IconShare size={14} />}
                  onClick={openPrintModal}
                >
                  {t('quotations.actions.sharePdf')}
                </Button>
              )}
              {isIssued && generateSalesOrderButton}
              {canEdit && isDraft && (
                <Button
                  color="green"
                  size="compact-sm"
                  leftSection={<IconSend size={14} />}
                  onClick={openSendModal}
                >
                  {t('quotations.actions.markReady')}
                </Button>
              )}
              {canEdit && isReady && (
                <Button
                  color="teal"
                  size="compact-sm"
                  leftSection={<IconCheck size={14} />}
                  onClick={openConfirmModal}
                >
                  {t('quotations.actions.markConfirmed')}
                </Button>
              )}
              {canEdit && !isCancelled && !isConverted && (
                <Button
                  variant="light"
                  color="red"
                  size="compact-sm"
                  leftSection={<IconBan size={14} />}
                  onClick={openCancelModal}
                >
                  {t('quotations.actions.cancelQuotation')}
                </Button>
              )}
              {canCreate && (
                <Button
                  variant="light"
                  color="gray"
                  size="compact-sm"
                  leftSection={<IconCopy size={14} />}
                  onClick={() =>
                    navigate(ROUTES.QUOTATIONS.NEW, { state: { copyFrom: quotation } })
                  }
                >
                  {t('quotations.actions.copy')}
                </Button>
              )}
              {canEdit && isEditable && (
                <Button
                  component={Link}
                  to={editRoute(quotation.id)}
                  variant="light"
                  size="compact-sm"
                  leftSection={<IconEdit size={14} />}
                >
                  {t('__new__.01-common.actions.edit')}
                </Button>
              )}
            </Group>
          </Group>
        )}

        <Card
          withBorder
          radius="md"
          padding={isMobile ? 'md' : 'lg'}
          style={{
            background:
              'linear-gradient(180deg, var(--mantine-color-body), var(--mantine-color-default-hover))',
          }}
        >
          <Group gap={isMobile ? 'sm' : 'lg'} wrap="nowrap" align="flex-start">
            <ThemeIcon size={isMobile ? 56 : 80} radius={12} variant="light" color="primary">
              <IconFileInvoice size={isMobile ? 28 : 40} stroke={1.5} />
            </ThemeIcon>
            <Stack gap={6} style={{ flex: 1, minWidth: 0 }}>
              <Group gap="sm" wrap="wrap" align="center">
                <Title order={isMobile ? 5 : 3} lh={1.2} ff="monospace">
                  {quotation.extra.code}
                </Title>
                <Badge color={badge.color} variant={badge.variant}>
                  {t(`quotations.status.${status}`)}
                </Badge>
              </Group>
              {quotation.extra.customerCode ? (
                <CustomerLink
                  code={quotation.extra.customerCode}
                  name={quotation.extra.customerName}
                  size="md"
                />
              ) : (
                <Text size="sm" c="dimmed">
                  {quotation.extra.customerName ?? '—'}
                </Text>
              )}
            </Stack>
          </Group>
        </Card>

        <Grid gutter="md">
          <Grid.Col span={{ base: 12, md: 8 }}>
            <SectionCard
              icon={<IconListDetails size={14} />}
              title={t('quotations.form.linesLabel')}
            >
              <QuotationLinesTable lines={lines} />
            </SectionCard>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 4 }}>
            <Stack gap="md">
              <SectionCard
                icon={<IconInfoCircle size={14} />}
                title={t('quotations.form.headerSection')}
              >
                <Stack gap="md">
                  {/* Only worth a row when the client issues under more than one
                      company — otherwise every quotation would repeat the one
                      seller the operator already knows. */}
                  {hasMultipleCompanies() && (
                    <DetailField label={t('quotations.form.companyLabel')}>
                      <Text size="sm">{getCompanyInfo(quotation.extra.companyId).name}</Text>
                    </DetailField>
                  )}
                  {quotation.extra.assignedStaff && (
                    <DetailField label={t('salesOrders.columns.assignedStaff')}>
                      <EmployeeLink id={quotation.extra.assignedStaff} />
                    </DetailField>
                  )}
                  {quotation.extra.note && (
                    <DetailField label={t('quotations.form.note')}>
                      <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                        {quotation.extra.note}
                      </Text>
                    </DetailField>
                  )}
                  <DetailField label={t('common.labels.createdAt')}>
                    {formatDateTime(quotation.createdAt)}
                  </DetailField>
                  <DetailField label={t('common.labels.updatedAt')}>
                    {formatDateTime(quotation.updatedAt)}
                  </DetailField>
                </Stack>
              </SectionCard>

              {/* Mobile actions — mirror the desktop header actions. */}
              {isMobile && canEdit && isDraft && (
                <Button
                  color="green"
                  leftSection={<IconSend size={16} />}
                  fullWidth
                  onClick={openSendModal}
                >
                  {t('quotations.actions.markReady')}
                </Button>
              )}
              {isMobile && canEdit && isReady && (
                <Button
                  color="teal"
                  leftSection={<IconCheck size={16} />}
                  fullWidth
                  onClick={openConfirmModal}
                >
                  {t('quotations.actions.markConfirmed')}
                </Button>
              )}
              {isMobile && (isIssued || isConverted) && (
                <Button
                  variant="light"
                  color="gray"
                  leftSection={<IconPrinter size={16} />}
                  fullWidth
                  onClick={openPrintModal}
                >
                  {t('quotations.actions.exportPdf')}
                </Button>
              )}
              {isMobile && canSharePdf && (isIssued || isConverted) && (
                <Button
                  variant="light"
                  color="teal"
                  leftSection={<IconShare size={16} />}
                  fullWidth
                  onClick={openPrintModal}
                >
                  {t('quotations.actions.sharePdf')}
                </Button>
              )}
              {/* No mobile "generate sales order": it routes to the SO form,
                  which is desktop-only (mobile deep-links get bounced to the SO
                  list) — a dead-end CTA per the no-create/edit-on-mobile rule.
                  Status actions (mark-ready / cancel) and print stay. */}
              {isMobile && canEdit && !isCancelled && !isConverted && (
                <Button
                  variant="light"
                  color="red"
                  leftSection={<IconBan size={16} />}
                  fullWidth
                  onClick={openCancelModal}
                >
                  {t('quotations.actions.cancelQuotation')}
                </Button>
              )}

              {isConverted && (
                <Card withBorder radius="md" padding="md">
                  <Stack gap="xs">
                    <Group gap="sm" wrap="nowrap">
                      <ThemeIcon size={32} radius="md" variant="light" color="blue">
                        <IconShoppingCartPlus size={16} />
                      </ThemeIcon>
                      <Text size="sm" c="dimmed">
                        {t('quotations.convertedNote')}
                      </Text>
                    </Group>
                    {quotation.extra.generatedSalesOrderId && (
                      <SalesOrderLink
                        id={quotation.extra.generatedSalesOrderId}
                        fallbackLabel={quotation.extra.generatedSalesOrderNumber}
                      />
                    )}
                  </Stack>
                </Card>
              )}

              {/* Status note — only for the states that STOP the operator:
                  `confirmed` locks the document (the customer agreed to these
                  numbers) and `cancelled` withdraws it. `sent` is editable now,
                  so it says nothing rather than claiming a lock it doesn't have. */}
              {(isConfirmed || isCancelled) && (
                <Card withBorder radius="md" padding="md">
                  <Group gap="sm" wrap="nowrap">
                    <ThemeIcon
                      size={32}
                      radius="md"
                      variant="light"
                      color={isCancelled ? 'red' : 'teal'}
                    >
                      {isCancelled ? <IconBan size={16} /> : <IconLock size={16} />}
                    </ThemeIcon>
                    <Text size="sm" c="dimmed">
                      {t(isCancelled ? 'quotations.cancelledNote' : 'quotations.confirmedNote')}
                    </Text>
                  </Group>
                </Card>
              )}

              {!isMobile && canDelete && (isDraft || isCancelled) && (
                <DangerZoneCard title={t('__new__.01-common.dangerZone.title')}>
                  <DangerAction
                    title={t('quotations.dangerZone.deleteItem')}
                    description={t('quotations.dangerZone.deleteItemDesc')}
                    buttonLabel={t('__new__.01-common.actions.remove')}
                    buttonIcon={<IconTrash size={14} />}
                    onClick={openDeleteModal}
                    buttonColor="red"
                  />
                </DangerZoneCard>
              )}
            </Stack>
          </Grid.Col>
        </Grid>
      </Stack>

      <ConfirmModal
        opened={sendModalOpened}
        onClose={closeSendModal}
        onConfirm={handleSend}
        title={t('quotations.sendConfirm.title')}
        message={t('quotations.sendConfirm.message')}
        confirmLabel={t('quotations.actions.markReady')}
        confirmColor="green"
        loading={sending}
      />
      <ConfirmModal
        opened={confirmModalOpened}
        onClose={closeConfirmModal}
        onConfirm={handleConfirmAgreement}
        title={t('quotations.confirmAgreement.title')}
        message={t('quotations.confirmAgreement.message')}
        confirmLabel={t('quotations.actions.markConfirmed')}
        confirmColor="teal"
        loading={confirming}
      />
      <ConfirmModal
        opened={cancelModalOpened}
        onClose={closeCancelModal}
        onConfirm={handleCancel}
        title={t('quotations.cancelConfirm.title')}
        message={t('quotations.cancelConfirm.message')}
        confirmLabel={t('quotations.actions.cancelQuotation')}
        loading={cancelling}
      />
      <ConfirmModal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        onConfirm={handleDelete}
        title={t('quotations.deleteConfirm.title')}
        message={t('quotations.deleteConfirm.message')}
        loading={deleting}
      />

      {/* PDF export options — paper size + orientation, then print. */}
      <Modal
        opened={printModalOpened}
        onClose={closePrintModal}
        title={t('quotations.print.optionsTitle')}
        size="sm"
      >
        <Stack gap="md">
          <Stack gap={6}>
            <Text size="sm" fw={500}>
              {t('quotations.print.paperSize')}
            </Text>
            <SegmentedControl
              fullWidth
              value={paperSize}
              onChange={(v) => setPaperSize(v as QuotationPaperSize)}
              data={[
                { value: 'A4', label: 'A4' },
                { value: 'A5', label: 'A5' },
              ]}
            />
          </Stack>
          <Stack gap={6}>
            <Text size="sm" fw={500}>
              {t('quotations.print.orientation')}
            </Text>
            <SegmentedControl
              fullWidth
              value={orientation}
              onChange={(v) => setOrientation(v as QuotationOrientation)}
              data={[
                { value: 'portrait', label: t('quotations.print.portrait') },
                { value: 'landscape', label: t('quotations.print.landscape') },
              ]}
            />
          </Stack>
          <Switch
            label={t('quotations.print.includeVat')}
            checked={includeVat}
            onChange={(e) => setIncludeVat(e.currentTarget.checked)}
          />
          <Group justify="flex-end" gap="sm">
            <Button variant="default" size="sm" onClick={closePrintModal} disabled={sharing}>
              {t('__new__.01-common.actions.cancel')}
            </Button>
            <Button
              size="sm"
              variant="light"
              leftSection={<IconPrinter size={14} />}
              onClick={handlePrint}
              disabled={sharing}
            >
              {t('quotations.actions.exportPdf')}
            </Button>
            {canSharePdf && (
              <Button
                size="sm"
                color="teal"
                leftSection={<IconShare size={14} />}
                onClick={handleShare}
                loading={sharing}
              >
                {t('quotations.actions.sharePdf')}
              </Button>
            )}
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
