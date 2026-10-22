import {
  Alert,
  Button,
  Card,
  Grid,
  Group,
  NumberInput,
  Stack,
  Switch,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconAlertTriangle,
  IconArrowRight,
  IconCamera,
  IconCheck,
  IconMinus,
  IconPencil,
  IconTruckDelivery,
  IconX,
} from '@tabler/icons-react';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { device } from '@credo/base-ui/utils';
import { ConfirmModal } from '@/components/ConfirmModal';
import { CameraCapture, ImageUploadPanel, type PhotoEntry } from '@/components/ImageUploadPanel';
import { ComponentLinkV2 } from '@/components/v2/ComponentLinkV2';
import { ROUTES } from '@/constants/routes';
import { RecordField, RecordNotFound } from '../detailBlocks';
import { useRecordById } from '../useRecordById';
import {
  getDeliveryNoteV2ById,
  reduceDeliveryNoteV2,
  transitionDeliveryNoteV2,
} from '@/stores/useDeliveryNoteV2Store';
import { useAuthStore } from '@/stores/useAuthStore';
import { validationFieldsOf } from '@/stores/createEntityStore';
import {
  remainderOf,
  type DeliveryNoteV2,
  type DeliveryNoteV2Consequence,
} from '@/types/delivery-note-v2';
import { formatDate } from '@/utils/dateFormat';
import { formatNumber } from '@/utils/number';
import { perms } from '@/utils/permission';
import { captureResultToFile, uploadPhotoFile } from '@/utils/photoUpload';
import { buildExpiringUploadDirectory } from '@/utils/uploadPath';
import { customFieldSpan, readCustomFieldValue } from '@/utils/customFields';
import { featureFlags } from '@/utils/features';
import { NoNextStepNote } from '../NoNextStepNote';
import { DeliveryNoteConfigAlerts, DeliveryNoteV2StatusBadge } from './chrome';
import { DeliveryNoteV2EditModal } from './DeliveryNoteV2EditModal';
import { useDeliveryNoteCustomFields } from './customFields';
import {
  deliveryNoteStageOf,
  deliveryNoteStatusAction,
  deliveryNoteStatusDisplay,
  deliveryNoteDepartmentsOwningNext,
  deliveryNoteStatusDeducts,
  deliveryNoteTransitionTargets,
  type DeliveryNoteFlowStatus,
} from './statusFlow';
import { useCurrentDepartment } from '../statusFlowReader';
import { useLineQuantityText } from '../lineUnitLabel';

const photoDirectoryFor = (id: string) =>
  buildExpiringUploadDirectory({ type: 'delivery-note-v2', id });

const photoRequired = featureFlags.deliveryNotesV2.deliveryPhotoRequired;

export function DeliveryNoteV2DetailPage() {
  const { t } = useTranslation();
  const quantityText = useLineQuantityText();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const {
    record: note,
    setRecord: setNote,
    day,
    loading,
  } = useRecordById<DeliveryNoteV2>(id, getDeliveryNoteV2ById);
  const [acting, setActing] = useState(false);
  const [editing, setEditing] = useState(false);

  const [confirmTarget, setConfirmTarget] = useState<DeliveryNoteFlowStatus | null>(null);
  const [cancelTarget, setCancelTarget] = useState<DeliveryNoteFlowStatus | null>(null);

  const [deductTarget, setDeductTarget] = useState<DeliveryNoteFlowStatus | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [reducing, setReducing] = useState(false);
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [capturing, setCapturing] = useState(false);

  const [consequences, setConsequences] = useState<DeliveryNoteV2Consequence[]>([]);
  const [pendingHop, setPendingHop] = useState<string | null>(null);

  const department = useCurrentDepartment();
  const customFields = useDeliveryNoteCustomFields();
  const userName = useAuthStore((s) => s.user?.name ?? '');

  const closeDialogs = useCallback(() => {
    setConfirmTarget(null);
    setCancelTarget(null);
    setDeductTarget(null);
    setRetrying(false);
    setReducing(false);
    setConsequences([]);
    setPendingHop(null);
  }, []);

  const runTransition = useCallback(
    async (to: string, options: { photoRefs?: string[]; acknowledge?: string[] } = {}) => {
      if (!note) return;
      setActing(true);
      try {
        const next = await transitionDeliveryNoteV2(to, note, day, options);
        setNote(next);
        closeDialogs();
        const toStage = deliveryNoteStageOf(to);
        if (toStage === 'delivered' && next.derivativesPending) {
          notifications.show({
            color: 'orange',
            autoClose: false,
            message: t('deliveryNotesV2.notifications.deliverPartial'),
          });
        } else {
          notifications.show({
            color: 'green',
            message: t('deliveryNotesV2.notifications.statusChangeSuccess'),
          });
        }
      } catch (error) {
        const fields = validationFieldsOf(error);
        const asked = Object.entries(fields ?? {}).map(([code, message]) => ({ code, message }));

        if (asked.length > 0 && CONSENT_CODES.some(({ code }) => code in (fields ?? {}))) {
          setConsequences(asked);
          setPendingHop(to);
        } else {
          notifications.show({
            color: 'red',
            autoClose: false,
            message:
              Object.values(fields ?? {})[0] ?? t('deliveryNotesV2.notifications.writeError'),
          });
        }
      } finally {
        setActing(false);
      }
    },
    [note, day, t, closeDialogs, setNote],
  );

  const runReduce = useCallback(async () => {
    if (!note) return;
    const picked = note.items.flatMap((line) => {
      const quantity = amounts[`${line.itemType}:${line.itemId}`] ?? 0;
      return quantity > 0 ? [{ itemType: line.itemType, itemId: line.itemId, quantity }] : [];
    });
    if (picked.length === 0) return;
    setActing(true);
    try {
      setNote(await reduceDeliveryNoteV2(note, day, picked));
      closeDialogs();
      notifications.show({
        color: 'green',
        message: t('deliveryNotesV2.notifications.reduceSuccess'),
      });
    } catch (error) {
      const fields = validationFieldsOf(error);
      notifications.show({
        color: 'red',
        message: Object.values(fields ?? {})[0] ?? t('deliveryNotesV2.notifications.writeError'),
      });
    } finally {
      setActing(false);
    }
  }, [note, day, amounts, t, closeDialogs, setNote]);

  const captureAndComplete = useCallback(
    async (base64: string, deliveredStatus: string): Promise<boolean> => {
      if (!note) return false;
      setActing(true);
      try {
        const fileName = `${Date.now()}-delivery.jpg`;
        const file = await captureResultToFile(base64, fileName);
        const uploaded = await uploadPhotoFile({
          file,
          imageDirectory: photoDirectoryFor(note.id),
          fileName,
        });
        if (!uploaded.ok) {
          notifications.show({
            color: 'red',
            message: t('deliveryNotesV2.notifications.uploadError'),
          });
          return false;
        }
        setCapturing(false);
        await runTransition(deliveredStatus, { photoRefs: [uploaded.url] });
        return true;
      } finally {
        setActing(false);
      }
    },
    [note, t, runTransition],
  );

  const photos = useMemo<PhotoEntry[]>(
    () =>
      (note?.photoRefs ?? []).map((url) => ({
        url,
        timestamp: note?.deliveredAt ?? note?.updatedAt ?? 0,
      })),
    [note?.photoRefs, note?.deliveredAt, note?.updatedAt],
  );

  if (loading) return <Text>…</Text>;

  if (!note) {
    return (
      <RecordNotFound
        title={t('deliveryNotesV2.notFound.title')}
        message={t('deliveryNotesV2.notFound.message')}
        backLabel={t('deliveryNotesV2.notFound.back')}
        onBack={() => void navigate(ROUTES.DELIVERY_NOTES_V2.LIST)}
      />
    );
  }

  const stage = deliveryNoteStageOf(note.status);
  const isDraftStage = stage === 'draft';
  const pending = note.derivativesPending === true;
  const canEdit = isDraftStage && perms.deliveryRequest.canEdit();
  const anythingLeft = note.items.some((line) => remainderOf(line) > 0);

  const filledCustomFields = customFields.flatMap((field) => {
    const value = readCustomFieldValue(note.extra, field);
    return value === undefined ? [] : [{ field, text: String(value) }];
  });

  const flagFor = (targetStage: string | undefined, deducts: boolean) =>
    targetStage === 'delivered' || deducts
      ? perms.deliveryRequest.canConfirmDelivered()
      : targetStage === 'cancelled'
        ? perms.deliveryRequest.canCancel()
        : perms.deliveryRequest.canEdit();

  const canRetry = pending && flagFor(stage, deliveryNoteStatusDeducts(note.status));
  const postingTarget = retrying ? note.status : (confirmTarget?.value ?? note.status);
  const reachable = pending ? [] : deliveryNoteTransitionTargets(note.status, department);
  const targets = reachable.filter((target) =>
    flagFor(target.stage, deliveryNoteStatusDeducts(target.value)),
  );
  const noNextStep = !pending && targets.length === 0;
  const deliveredTarget = targets.find((target) => target.stage === 'delivered');
  const nothingToReduce = Object.values(amounts).every((quantity) => quantity <= 0);

  const showCapture =
    device.isMobile &&
    note.deliveryType === 'internal' &&
    deliveredTarget !== undefined &&
    !pending;

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="start">
        <Stack gap={4}>
          <Group gap="sm">
            <Title order={3}>{note.noteNumber}</Title>
            <DeliveryNoteV2StatusBadge status={note.status} />
          </Group>
          <Text c="dimmed" size="sm">
            {t('deliveryNotesV2.detailTitle')}
          </Text>
        </Stack>
        <Group gap="sm">
          {canEdit && (
            <Button
              variant="light"
              leftSection={<IconPencil size={16} />}
              onClick={() => setEditing(true)}
            >
              {t('deliveryNotesV2.editItem')}
            </Button>
          )}
          {/* Draft-stage only, gated on the flag its twin stage edge carries —
              the manual verb must never be the looser door. The server refuses
              it in any other stage; this only keeps the button from lying. */}
          {isDraftStage &&
            !pending &&
            anythingLeft &&
            perms.deliveryRequest.canConfirmDelivered() && (
              <Button
                variant="light"
                color="blue"
                leftSection={<IconMinus size={16} />}
                loading={acting}
                onClick={() => {
                  setAmounts(
                    Object.fromEntries(
                      note.items.map((line) => [
                        `${line.itemType}:${line.itemId}`,
                        remainderOf(line),
                      ]),
                    ),
                  );
                  setReducing(true);
                }}
              >
                {t('deliveryNotesV2.actions.reduce')}
              </Button>
            )}
          {showCapture && (
            <Button
              color="green"
              leftSection={<IconCamera size={16} />}
              loading={acting}
              onClick={() => setCapturing(true)}
            >
              {t('deliveryNotesV2.photos.capture')}
            </Button>
          )}
          {canRetry && (
            <Button
              color={deliveryNoteStatusDisplay(t, note.status).color}
              leftSection={<IconCheck size={16} />}
              loading={acting}
              onClick={() => setRetrying(true)}
            >
              {t('deliveryNotesV2.actions.retry')}
            </Button>
          )}
          {targets.map((target) => {
            const display = deliveryNoteStatusAction(t, target.value);
            const deducts = deliveryNoteStatusDeducts(target.value);
            const onClick =
              target.stage === 'delivered'
                ? () => setConfirmTarget(target)
                : target.stage === 'cancelled'
                  ? () => setCancelTarget(target)
                  : deducts
                    ? () => setDeductTarget(target)
                    : () => void runTransition(target.value);
            return (
              <Button
                key={target.value}
                color={display.color}
                variant={target.stage === 'delivered' ? 'filled' : 'light'}
                leftSection={
                  target.stage === 'delivered' ? (
                    <IconTruckDelivery size={16} />
                  ) : target.stage === 'cancelled' ? (
                    <IconX size={16} />
                  ) : deducts ? (
                    <IconMinus size={16} />
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
              departments={deliveryNoteDepartmentsOwningNext(note.status, department)}
              withheldByPermission={reachable.length > 0}
            />
          )}
        </Group>
      </Group>

      <DeliveryNoteConfigAlerts />

      {pending && (
        <Alert
          color="orange"
          icon={<IconAlertTriangle size={18} />}
          title={t('deliveryNotesV2.pending.title')}
        >
          <Text size="sm">{t('deliveryNotesV2.pending.message')}</Text>
        </Alert>
      )}

      {photoRequired && note.deliveryType === 'internal' && isDraftStage && photos.length === 0 && (
        <Alert color="yellow" icon={<IconCamera size={18} />}>
          <Text size="sm">{t('deliveryNotesV2.photos.required')}</Text>
        </Alert>
      )}

      <Grid gutter="lg">
        <Grid.Col span={{ base: 12, md: 7 }}>
          <Card withBorder padding="lg">
            <Stack gap="sm">
              <Title order={5}>{t('deliveryNotesV2.form.lines')}</Title>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t('deliveryNotesV2.form.item')}</Table.Th>
                    <Table.Th ta="right">{t('deliveryNotesV2.table.ordered')}</Table.Th>
                    <Table.Th ta="right">{t('deliveryNotesV2.table.delivered')}</Table.Th>
                    <Table.Th ta="right">{t('deliveryNotesV2.table.remaining')}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {note.items.map((line) => (
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
                      <Table.Td ta="right">{formatNumber(line.reducedQuantity)}</Table.Td>
                      <Table.Td ta="right">{formatNumber(remainderOf(line))}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
              <Group justify="end">
                <Text fw={600}>
                  {t('deliveryNotesV2.columns.totalQuantity')}: {formatNumber(note.totalQuantity)}
                </Text>
              </Group>
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 5 }}>
          <Card withBorder padding="lg">
            <Stack gap="sm">
              <RecordField
                label={t('deliveryNotesV2.form.salesOrder')}
                value={
                  <ComponentLinkV2
                    type="sales-order-v2"
                    id={note.salesOrderId}
                    fallbackLabel={note.salesOrderNumber}
                  />
                }
              />
              <RecordField
                label={t('deliveryNotesV2.columns.customer')}
                value={
                  note.customerId || note.customerName ? (
                    <ComponentLinkV2
                      type="customer-v2"
                      id={note.customerId}
                      fallbackLabel={note.customerName}
                    />
                  ) : undefined
                }
              />
              <RecordField
                label={t('deliveryNotesV2.form.deliveryType')}
                value={t(`deliveryNotesV2.deliveryType.${note.deliveryType}`)}
              />
              <RecordField
                label={t('deliveryNotesV2.form.assignedTo')}
                value={note.assignedToName ?? note.carrier}
              />
              <RecordField
                label={t('deliveryNotesV2.form.deliveryDate')}
                value={note.deliveryDate ? formatDate(note.deliveryDate) : undefined}
              />
              <RecordField label={t('deliveryNotesV2.form.reference')} value={note.reference} />
              <RecordField label={t('deliveryNotesV2.form.notes')} value={note.notes} />
              {/* Read-only and always shown, because it decides what the
                  delivered hop does to the ORDER — an operator must be able to
                  see it without opening the edit dialog. */}
              <Switch
                checked={note.completesSalesOrder}
                readOnly
                label={t('deliveryNotesV2.form.completesSalesOrder')}
                description={t('deliveryNotesV2.form.completesSalesOrderHint')}
              />
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

      <Card withBorder padding="lg">
        <Stack gap="sm">
          <Title order={5}>{t('deliveryNotesV2.photos.title')}</Title>
          {/* The refs the note already carries. Adding one here does NOT move
              the note: photos ride the delivered transition, so the panel is
              read-only and the field path is the capture button above. */}
          <ImageUploadPanel
            images={photos}
            onChange={async () => {}}
            imageDirectory={photoDirectoryFor(note.id)}
            editable={false}
            marker={note.noteNumber}
            currentUserName={userName}
          />
        </Stack>
      </Card>

      <DeliveryNoteV2EditModal
        opened={editing}
        note={note}
        day={day}
        onClose={() => setEditing(false)}
        onSaved={(next) => {
          setNote(next);
          setEditing(false);
        }}
      />

      <ConfirmModal
        opened={confirmTarget !== null || retrying}
        onClose={closeDialogs}
        onConfirm={() =>
          void runTransition(postingTarget, {
            ...(photos.length > 0 ? { photoRefs: photos.map((photo) => photo.url) } : {}),
          })
        }
        title={t('deliveryNotesV2.deliverModal.title')}
        message={t('deliveryNotesV2.deliverModal.message')}
        confirmLabel={
          retrying
            ? t('deliveryNotesV2.actions.retry')
            : deliveryNoteStatusAction(t, postingTarget).label
        }
        confirmColor={deliveryNoteStatusAction(t, postingTarget).color}
        loading={acting}
      />

      {/* A hop that moves stock is confirmed the way Reduce is; the message
          says the status is what deducts, so the operator learns the rule
          rather than only the fact. */}
      <ConfirmModal
        opened={deductTarget !== null}
        onClose={closeDialogs}
        onConfirm={() => void runTransition(deductTarget!.value)}
        title={t('deliveryNotesV2.deductModal.title')}
        message={t('deliveryNotesV2.deductModal.message')}
        confirmLabel={
          deductTarget ? deliveryNoteStatusAction(t, deductTarget.value).label : undefined
        }
        confirmColor={
          deductTarget ? deliveryNoteStatusAction(t, deductTarget.value).color : undefined
        }
        loading={acting}
      />

      <ConfirmModal
        opened={cancelTarget !== null}
        onClose={closeDialogs}
        onConfirm={() => void runTransition(cancelTarget!.value)}
        title={t('deliveryNotesV2.cancelModal.title')}
        message={t('deliveryNotesV2.cancelModal.message')}
        confirmLabel={
          cancelTarget ? deliveryNoteStatusAction(t, cancelTarget.value).label : undefined
        }
        confirmColor={
          cancelTarget ? deliveryNoteStatusAction(t, cancelTarget.value).color : undefined
        }
        loading={acting}
      />

      {/* The server's own sentences, verbatim. A second wording here would
          drift from the rule it is actually applying, and the codes it keys
          them by are exactly what goes back in `acknowledge`. */}
      <ConfirmModal
        opened={consequences.length > 0}
        onClose={closeDialogs}
        onConfirm={() =>
          void runTransition(pendingHop ?? note.status, {
            acknowledge: consequences.map((consequence) => consequence.code),
            ...(photos.length > 0 ? { photoRefs: photos.map((photo) => photo.url) } : {}),
          })
        }
        title={t('deliveryNotesV2.confirm.title')}
        message={consequences.map((consequence) => consequence.message).join('\n\n')}
        confirmLabel={t('deliveryNotesV2.confirm.acknowledge')}
        confirmColor="orange"
        loading={acting}
      />

      <ConfirmModal
        opened={reducing}
        onClose={closeDialogs}
        onConfirm={() => void runReduce()}
        title={t('deliveryNotesV2.reduceModal.title')}
        message={t('deliveryNotesV2.reduceModal.message')}
        confirmLabel={t('deliveryNotesV2.actions.reduce')}
        confirmColor="blue"
        loading={acting}
        confirmDisabled={nothingToReduce}
      >
        <Stack gap="xs">
          {note.items.map((line) => {
            const key = `${line.itemType}:${line.itemId}`;
            const left = remainderOf(line);
            return (
              <NumberInput
                key={key}
                label={line.itemName || line.itemCode}
                description={`${t('deliveryNotesV2.form.remaining')}: ${quantityText({ ...line, quantity: left })}`}
                value={amounts[key] ?? 0}
                min={0}

                max={left}
                disabled={left === 0}
                onChange={(value) =>
                  setAmounts((current) => ({
                    ...current,
                    [key]: typeof value === 'number' ? value : 0,
                  }))
                }
              />
            );
          })}
        </Stack>
      </ConfirmModal>

      {capturing && deliveredTarget && (
        <CameraCapture
          opened={capturing}
          onClose={() => setCapturing(false)}
          onCapture={(result) => captureAndComplete(result.base64, deliveredTarget.value)}
          uploading={acting}
          marker={note.noteNumber}
          userName={userName}
          t={t}
        />
      )}
    </Stack>
  );
}

const CONSENT_CODES = [{ code: 'stockNotRestored' }, { code: 'reservationReleased' }] as const;
