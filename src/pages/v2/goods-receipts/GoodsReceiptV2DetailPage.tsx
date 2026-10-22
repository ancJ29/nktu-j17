import { Alert, Button, Card, Grid, Group, Stack, Table, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconAlertTriangle,
  IconArrowRight,
  IconCheck,
  IconCopy,
  IconPencil,
  IconX,
} from '@tabler/icons-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { ConfirmModal } from '@/components/ConfirmModal';
import { ROUTES } from '@/constants/routes';
import { RecordField, RecordNotFound } from '../detailBlocks';
import { useRecordById } from '../useRecordById';
import { getGoodsReceiptV2ById, transitionGoodsReceiptV2 } from '@/stores/useGoodsReceiptV2Store';
import type { GoodsReceiptV2, GoodsReceiptV2CopyFrom } from '@/types/goods-receipt-v2';
import { ComponentLinkV2 } from '@/components/v2/ComponentLinkV2';
import { useProductV2Store } from '@/stores/useProductV2Store';
import { useMaterialV2Store } from '@/stores/useMaterialV2Store';
import { useVendorV2Store } from '@/stores/useVendorV2Store';
import { featureFlags } from '@/config';
import { formatDate } from '@/utils/dateFormat';
import { formatNumber } from '@/utils/number';
import { perms } from '@/utils/permission';
import { NoNextStepNote } from '../NoNextStepNote';
import { GoodsReceiptConfigAlerts, GoodsReceiptV2StatusBadge } from './chrome';
import { useGoodsReceiptCustomFields } from './customFields';
import { useLineQuantityText } from '../lineUnitLabel';
import { customFieldSpan, readCustomFieldValue } from '@/utils/customFields';
import {
  goodsReceiptStageOf,
  goodsReceiptStatusAction,
  goodsReceiptStatusDisplay,
  goodsReceiptDepartmentsOwningNext,
  goodsReceiptTransitionTargets,
  useCurrentDepartment,
  type GoodsReceiptFlowStatus,
} from './statusFlow';

export function GoodsReceiptV2DetailPage() {
  const { t } = useTranslation();
  const quantityText = useLineQuantityText();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const {
    record: receipt,
    setRecord: setReceipt,
    day,
    loading,
  } = useRecordById<GoodsReceiptV2>(id, getGoodsReceiptV2ById);
  const [acting, setActing] = useState(false);

  const loadProducts = useProductV2Store((s) => s.loadAll);
  const loadMaterials = useMaterialV2Store((s) => s.loadAll);
  const loadVendors = useVendorV2Store((s) => s.loadAll);

  const [confirmTarget, setConfirmTarget] = useState<GoodsReceiptFlowStatus | null>(null);
  const [cancelTarget, setCancelTarget] = useState<GoodsReceiptFlowStatus | null>(null);
  const [retrying, setRetrying] = useState(false);

  const department = useCurrentDepartment();
  const customFields = useGoodsReceiptCustomFields();

  useEffect(() => {
    void loadProducts();
    void loadVendors();
    if (featureFlags.materialsV2.enabled) void loadMaterials();
  }, [loadProducts, loadVendors, loadMaterials]);

  const runTransition = useCallback(
    async (to: string) => {
      if (!receipt) return;
      setActing(true);
      try {
        const next = await transitionGoodsReceiptV2(to, receipt, day);
        setReceipt(next);
        const toStage = goodsReceiptStageOf(to);
        if (toStage === 'received' && next.derivativesPending) {
          notifications.show({
            color: 'orange',
            autoClose: false,
            message: t('goodsReceiptsV2.notifications.confirmPartial'),
          });
        } else {
          notifications.show({
            color: 'green',
            message: t(
              toStage === 'received'
                ? 'goodsReceiptsV2.notifications.confirmSuccess'
                : toStage === 'cancelled'
                  ? 'goodsReceiptsV2.notifications.cancelSuccess'
                  : 'goodsReceiptsV2.notifications.statusChangeSuccess',
            ),
          });
        }
      } catch {
        notifications.show({
          color: 'red',
          message: t('goodsReceiptsV2.notifications.writeError'),
        });
      } finally {
        setActing(false);
        setConfirmTarget(null);
        setCancelTarget(null);
        setRetrying(false);
      }
    },
    [receipt, day, t, setReceipt],
  );

  const handleCopy = useCallback(() => {
    if (!receipt) return;
    const copyFrom: GoodsReceiptV2CopyFrom = {
      ...(receipt.vendorId ? { vendorId: receipt.vendorId } : {}),
      ...(receipt.reference ? { reference: receipt.reference } : {}),
      ...(receipt.notes ? { notes: receipt.notes } : {}),
      items: receipt.items.map((line) => ({
        itemType: line.itemType,
        itemId: line.itemId,
        quantity: line.quantity,
        ...(line.itemCode ? { itemCode: line.itemCode } : {}),
        ...(line.itemName ? { itemName: line.itemName } : {}),
        ...(line.unit ? { unit: line.unit } : {}),
        ...(line.note ? { note: line.note } : {}),
      })),
      sourceReceiptNumber: receipt.receiptNumber,

      extra: Object.fromEntries(
        customFields.flatMap((field) => {
          const value = readCustomFieldValue(receipt.extra, field);
          return value === undefined ? [] : [[field.key, value] as const];
        }),
      ),
    };
    void navigate(ROUTES.GOODS_RECEIPTS_V2.NEW, { state: { copyFrom } });
  }, [receipt, customFields, navigate]);

  if (loading) return <Text>…</Text>;

  if (!receipt) {
    return (
      <RecordNotFound
        title={t('goodsReceiptsV2.notFound.title')}
        message={t('goodsReceiptsV2.notFound.message')}
        backLabel={t('goodsReceiptsV2.notFound.back')}
        onBack={() => void navigate(ROUTES.GOODS_RECEIPTS_V2.LIST)}
      />
    );
  }

  const stage = goodsReceiptStageOf(receipt.status);
  const isDraftStage = stage === 'draft';

  const filledCustomFields = customFields.flatMap((field) => {
    const value = readCustomFieldValue(receipt.extra, field);
    return value === undefined ? [] : [{ field, text: String(value) }];
  });
  const pending = receipt.derivativesPending === true;

  const canEdit = isDraftStage && perms.goodsReceipt.canEdit();

  const flagFor = (targetStage: string | undefined) =>
    targetStage === 'received'
      ? perms.goodsReceipt.canConfirmReceived()
      : targetStage === 'cancelled'
        ? perms.goodsReceipt.canCancel()
        : perms.goodsReceipt.canEdit();

  const canRetry = pending && !isDraftStage && flagFor(stage);

  const postingTarget = retrying ? receipt.status : (confirmTarget?.value ?? receipt.status);
  const reachable =
    pending && !isDraftStage ? [] : goodsReceiptTransitionTargets(receipt.status, department);
  const targets = reachable.filter((target) => flagFor(target.stage));
  const noNextStep = !pending && targets.length === 0;

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="start">
        <Stack gap={4}>
          <Group gap="sm">
            <Title order={3}>{receipt.receiptNumber}</Title>
            <GoodsReceiptV2StatusBadge status={receipt.status} />
          </Group>
          <Text c="dimmed" size="sm">
            {t('goodsReceiptsV2.detailTitle')}
          </Text>
        </Stack>
        <Group gap="sm">
          {perms.goodsReceipt.canCreate() && (
            <Button variant="subtle" leftSection={<IconCopy size={16} />} onClick={handleCopy}>
              {t('common.actions.copy')}
            </Button>
          )}
          {canEdit && (
            <Button
              variant="light"
              leftSection={<IconPencil size={16} />}
              onClick={() =>
                void navigate(ROUTES.GOODS_RECEIPTS_V2.EDIT.replace(':id', receipt.id))
              }
            >
              {t('goodsReceiptsV2.editItem')}
            </Button>
          )}
          {canRetry && (
            <Button
              color={goodsReceiptStatusDisplay(t, receipt.status).color}
              leftSection={<IconCheck size={16} />}
              loading={acting}
              onClick={() => setRetrying(true)}
            >
              {t('goodsReceiptsV2.actions.retry')}
            </Button>
          )}
          {/* One button per hop the flow and this operator's department allow —
              named AND colored by the TARGET (its config color, or its stage
              default), the same answer the badge renders. The stage still
              picks the weight: entering received-stage is the committing
              action so it fills; everything else stays light. Stock-moving
              hops earn a modal; a draft-stage hop runs on the click. */}
          {targets.map((target) => {
            const display = goodsReceiptStatusAction(t, target.value);
            const onClick =
              target.stage === 'received'
                ? () => setConfirmTarget(target)
                : target.stage === 'cancelled'
                  ? () => setCancelTarget(target)
                  : () => void runTransition(target.value);
            return (
              <Button
                key={target.value}
                color={display.color}
                variant={target.stage === 'received' ? 'filled' : 'light'}
                leftSection={
                  target.stage === 'received' ? (
                    <IconCheck size={16} />
                  ) : target.stage === 'cancelled' ? (
                    <IconX size={16} />
                  ) : (
                    <IconArrowRight size={16} />
                  )
                }
                loading={acting}
                onClick={onClick}
              >
                {display.label}
              </Button>
            );
          })}
          {noNextStep && (
            <NoNextStepNote
              departments={goodsReceiptDepartmentsOwningNext(receipt.status, department)}
              withheldByPermission={reachable.length > 0}
            />
          )}
        </Group>
      </Group>

      <GoodsReceiptConfigAlerts />

      {pending && (
        <Alert
          color="orange"
          icon={<IconAlertTriangle size={18} />}
          title={t('goodsReceiptsV2.pending.title')}
        >
          <Stack gap={4}>
            <Text size="sm">{t('goodsReceiptsV2.pending.message')}</Text>
            {stage === 'received' && (
              <Text size="sm">{t('goodsReceiptsV2.pending.blocksCancel')}</Text>
            )}
          </Stack>
        </Alert>
      )}

      <Grid gutter="lg">
        <Grid.Col span={{ base: 12, md: 7 }}>
          <Card withBorder padding="lg">
            <Stack gap="sm">
              <Title order={5}>{t('goodsReceiptsV2.form.lines')}</Title>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t('goodsReceiptsV2.form.item')}</Table.Th>
                    <Table.Th ta="right">{t('goodsReceiptsV2.form.quantity')}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {receipt.items.map((line) => (
                    <Table.Tr key={`${line.itemType}:${line.itemId}`}>
                      <Table.Td>
                        <Stack gap={0}>
                          <ComponentLinkV2
                            type={line.itemType === 'material' ? 'material-v2' : 'product-v2'}
                            id={line.itemId}
                            fallbackLabel={line.itemName}
                          />
                          {line.note && (
                            <Text size="xs" c="dimmed">
                              {line.note}
                            </Text>
                          )}
                        </Stack>
                      </Table.Td>
                      <Table.Td ta="right">{quantityText(line)}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
              <Group justify="end">
                <Text fw={600}>
                  {t('goodsReceiptsV2.columns.totalQuantity')}:{' '}
                  {formatNumber(receipt.totalQuantity)}
                </Text>
              </Group>
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 5 }}>
          <Card withBorder padding="lg">
            <Stack gap="sm">
              <RecordField
                label={t('goodsReceiptsV2.form.vendor')}
                value={
                  receipt.vendorId || receipt.vendorName ? (
                    <ComponentLinkV2
                      type="vendor-v2"
                      id={receipt.vendorId}
                      fallbackLabel={receipt.vendorName}
                    />
                  ) : undefined
                }
              />
              <RecordField
                label={t('goodsReceiptsV2.form.receivedDate')}
                value={receipt.receivedDate ? formatDate(receipt.receivedDate) : undefined}
              />
              <RecordField label={t('goodsReceiptsV2.form.reference')} value={receipt.reference} />
              <RecordField label={t('goodsReceiptsV2.form.notes')} value={receipt.notes} />
              {/* The client's own fields, after the module's, on the grid each
                  one's `width` asks for. A field this operator may not view
                  never reaches here — the resolver drops it — and one with no
                  value drops its whole cell, not just its text. */}
              {filledCustomFields.length > 0 && (
                <Grid gutter="sm">
                  {filledCustomFields.map(({ field, text }) => (
                    <Grid.Col key={field.key} span={customFieldSpan(field)}>
                      <RecordField label={field.label} value={text} />
                    </Grid.Col>
                  ))}
                </Grid>
              )}
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>

      {/* The posting modal serves the fresh confirm AND the pending retry —
          both enter (or re-enter) received-stage and both keep the tab open.

          Its action button REPEATS the button that opened it — the target's
          own label and color, `actions.retry` for the retry — because
          `ConfirmModal` otherwise defaults to a red "Delete", which is not
          this action under any client's vocabulary. */}
      <ConfirmModal
        opened={confirmTarget !== null || retrying}
        onClose={() => {
          setConfirmTarget(null);
          setRetrying(false);
        }}
        onConfirm={() => void runTransition(postingTarget)}
        title={t('goodsReceiptsV2.confirmModal.title')}
        message={`${t('goodsReceiptsV2.confirmModal.message')} ${t('goodsReceiptsV2.confirmModal.keepOpen')}`}
        confirmLabel={
          retrying
            ? t('goodsReceiptsV2.actions.retry')
            : goodsReceiptStatusAction(t, postingTarget).label
        }
        confirmColor={goodsReceiptStatusAction(t, postingTarget).color}
        loading={acting}
      />
      <ConfirmModal
        opened={cancelTarget !== null}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => void runTransition(cancelTarget!.value)}
        title={
          isDraftStage
            ? t('goodsReceiptsV2.cancelModal.titleDraft')
            : t('goodsReceiptsV2.cancelModal.titleReceived')
        }
        message={
          isDraftStage
            ? t('goodsReceiptsV2.cancelModal.messageDraft')
            : t('goodsReceiptsV2.cancelModal.messageReceived')
        }
        confirmLabel={
          cancelTarget ? goodsReceiptStatusAction(t, cancelTarget.value).label : undefined
        }
        confirmColor={
          cancelTarget ? goodsReceiptStatusAction(t, cancelTarget.value).color : undefined
        }
        loading={acting}
      />
    </Stack>
  );
}
