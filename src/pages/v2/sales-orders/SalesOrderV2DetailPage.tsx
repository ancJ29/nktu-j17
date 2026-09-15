import {
  Alert,
  Badge,
  Button,
  Card,
  Grid,
  Group,
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
  IconCheck,
  IconCopy,
  IconLock,
  IconLockOpen,
  IconPencil,
  IconTruckDelivery,
  IconX,
} from '@tabler/icons-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { ConfirmModal } from '@/components/ConfirmModal';
import { validationFieldsOf } from '@/stores/createEntityStore';
import { ROUTES } from '@/constants/routes';
import { RecordField, RecordNotFound } from '../detailBlocks';
import { useRecordById } from '../useRecordById';
import {
  getSalesOrderV2ById,
  inventorySalesOrderV2,
  transitionSalesOrderV2,
} from '@/stores/useSalesOrderV2Store';
import type { SalesOrderV2 } from '@/types/sales-order-v2';
import { ComponentLinkV2 } from '@/components/v2/ComponentLinkV2';
import { IssueDeliveryNoteModal } from '../delivery-notes';
import { useProductV2Store } from '@/stores/useProductV2Store';
import { useMaterialV2Store } from '@/stores/useMaterialV2Store';
import { useCustomerV2Store } from '@/stores/useCustomerV2Store';
import { salesOrderCopyFrom } from './copyFrom';
import { useSalesOrderLineStock } from './lineStock';
import { salesOrderDeliveryOf } from './deliveryProgress';
import { LineStockCell } from './LineStockCell';
import { SalesOrderDeliveryBadge } from './SalesOrderDeliveryBadge';
import { salesOrderStockVerb } from './stockVerb';
import { paymentTrackingOn } from './payment';
import { SalesOrderPaymentCard } from './SalesOrderPaymentCard';
import { featureFlags } from '@/config';
import { formatDate } from '@/utils/dateFormat';
import { formatNumber } from '@/utils/number';
import { perms } from '@/utils/permission';
import { NoNextStepNote } from '../NoNextStepNote';
import { SalesOrderConfigAlerts, SalesOrderV2StatusBadge } from './chrome';
import { useSalesOrderCustomFields } from './customFields';
import { useLineQuantityText } from '../lineUnitLabel';
import { customFieldSpan, readCustomFieldValue } from '@/utils/customFields';
import {
  salesOrderIsTerminal,
  salesOrderStageOf,
  salesOrderStatusAction,
  salesOrderStatusDisplay,
  salesOrderDepartmentsOwningNext,
  salesOrderTransitionTargets,
  type SalesOrderFlowStatus,
} from './statusFlow';
import { useCurrentDepartment } from '../statusFlowReader';

export function SalesOrderV2DetailPage() {
  const { t } = useTranslation();
  const quantityText = useLineQuantityText();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const {
    record: order,
    setRecord: setOrder,
    day,
    loading,
  } = useRecordById<SalesOrderV2>(id, getSalesOrderV2ById);
  const [acting, setActing] = useState(false);

  const loadProducts = useProductV2Store((s) => s.loadAll);
  const loadMaterials = useMaterialV2Store((s) => s.loadAll);
  const loadCustomers = useCustomerV2Store((s) => s.loadAll);

  const [confirmTarget, setConfirmTarget] = useState<SalesOrderFlowStatus | null>(null);

  const [reduceRemaining, setReduceRemaining] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<SalesOrderFlowStatus | null>(null);
  const [retrying, setRetrying] = useState(false);

  const [stockAction, setStockAction] = useState<'lock' | 'release' | null>(null);
  const [issuing, setIssuing] = useState(false);

  const { read: lineStock, pending: stockPending } = useSalesOrderLineStock();

  const department = useCurrentDepartment();
  const customFields = useSalesOrderCustomFields();

  useEffect(() => {
    void loadProducts();
    void loadCustomers();
    if (featureFlags.materialsV2.enabled) void loadMaterials();
  }, [loadProducts, loadCustomers, loadMaterials]);

  const runTransition = useCallback(
    async (to: string, options: { reduceRemaining?: boolean } = {}) => {
      if (!order) return;
      setActing(true);
      try {
        const next = await transitionSalesOrderV2(to, order, day, options);
        setOrder(next);
        const toStage = salesOrderStageOf(to);
        if (toStage === 'confirmed' && next.derivativesPending) {
          notifications.show({
            color: 'orange',
            autoClose: false,
            message: t('salesOrdersV2.notifications.confirmPartial'),
          });
        } else {
          notifications.show({
            color: 'green',
            message: t('salesOrdersV2.notifications.statusChangeSuccess'),
          });
        }
      } catch (error) {
        const fields = validationFieldsOf(error);
        notifications.show({
          color: 'red',
          autoClose: fields ? false : undefined,
          message: Object.values(fields ?? {})[0] ?? t('salesOrdersV2.notifications.writeError'),
        });
      } finally {
        setActing(false);
        setConfirmTarget(null);
        setCancelTarget(null);
        setRetrying(false);
        setReduceRemaining(false);
      }
    },
    [order, day, t, setOrder],
  );

  const runStockAction = useCallback(
    async (action: 'lock' | 'release') => {
      if (!order) return;
      setActing(true);
      try {
        setOrder(await inventorySalesOrderV2(action, order, day));
        notifications.show({
          color: 'green',
          message: t('salesOrdersV2.notifications.inventorySuccess'),
        });
      } catch {
        notifications.show({ color: 'red', message: t('salesOrdersV2.notifications.writeError') });
      } finally {
        setActing(false);
        setStockAction(null);
      }
    },
    [order, day, t, setOrder],
  );

  const handleCopy = useCallback(() => {
    if (!order) return;
    void navigate(ROUTES.SALES_ORDERS_V2.NEW, {
      state: { copyFrom: salesOrderCopyFrom(order, customFields) },
    });
  }, [order, customFields, navigate]);

  if (loading) return <Text>…</Text>;

  if (!order) {
    return (
      <RecordNotFound
        title={t('salesOrdersV2.notFound.title')}
        message={t('salesOrdersV2.notFound.message')}
        backLabel={t('salesOrdersV2.notFound.back')}
        onBack={() => void navigate(ROUTES.SALES_ORDERS_V2.LIST)}
      />
    );
  }

  const stage = salesOrderStageOf(order.status);
  const isDraftStage = stage === 'draft';

  const filledCustomFields = customFields.flatMap((field) => {
    const value = readCustomFieldValue(order.extra, field);
    return value === undefined ? [] : [{ field, text: String(value) }];
  });
  const pending = order.derivativesPending === true;

  const stockFor = (line: SalesOrderV2['items'][number]) => lineStock(line, order.id);

  const canEdit = isDraftStage && perms.salesOrder.canEdit();

  const flagFor = (targetStage: string | undefined) =>
    targetStage === 'cancelled'
      ? perms.salesOrder.canCancel()
      : perms.salesOrder.canTransitionStatus();

  const canRetry = pending && flagFor(stage);

  const postingTarget = retrying ? order.status : (confirmTarget?.value ?? order.status);

  const isCompletion = !retrying && salesOrderStageOf(postingTarget) === 'fulfilled';
  const remainders = order.items.map((line) => ({
    line,
    delivered: line.deliveredQuantity ?? 0,
    remaining: Math.max(0, line.quantity - (line.deliveredQuantity ?? 0)),
  }));
  const nothingLeft = remainders.every(({ remaining }) => remaining === 0);

  const delivery = salesOrderDeliveryOf(order);

  const stockVerb = salesOrderStockVerb({
    pending: stockPending,
    holdsStock: order.items.some((line) => (stockFor(line)?.held ?? 0) > 0),
    nothingLeft,
  });

  const priced = order.totalAmount !== undefined;

  const showAvailable = !salesOrderIsTerminal(order.status);

  const showDelivered =
    order.items.some((line) => line.deliveredQuantity !== undefined) ||
    order.remainderReduced !== undefined;
  const reachable = pending ? [] : salesOrderTransitionTargets(order.status, department);
  const targets = reachable.filter((target) => flagFor(target.stage));
  const noNextStep = !pending && targets.length === 0;

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="start">
        <Stack gap={4}>
          <Group gap="sm">
            <Title order={3}>{order.orderNumber}</Title>
            <SalesOrderV2StatusBadge status={order.status} />
            <SalesOrderDeliveryBadge order={order} />
          </Group>
          <Text c="dimmed" size="sm">
            {t('salesOrdersV2.detailTitle')}
          </Text>
        </Stack>
        {/* What you do WITH this order rather than TO it: copy it, edit it,
            move its hold, issue a note against it. Top-right and quiet,
            because they are available for as long as the order is and none of
            them is ever the next step — the status row below owns that. */}
        <Group gap="sm" justify="flex-end" wrap="wrap">
          {perms.salesOrder.canCreate() && (
            <Button variant="subtle" leftSection={<IconCopy size={16} />} onClick={handleCopy}>
              {t('common.actions.copy')}
            </Button>
          )}
          {canEdit && (
            <Button
              variant="light"
              leftSection={<IconPencil size={16} />}
              onClick={() => void navigate(ROUTES.SALES_ORDERS_V2.EDIT.replace(':id', order.id))}
            >
              {t('salesOrdersV2.editItem')}
            </Button>
          )}
          {/* Confirmed-stage only, and gated on the flag the twin stage edge
              carries — the manual verb must never be the looser door. The
              server refuses both in any other stage; this only keeps the
              buttons from lying about it.

              Which verb — and whether there is one at all — is
              `salesOrderStockVerb`'s call, not this page's. */}
          {stage === 'confirmed' &&
            !pending &&
            perms.salesOrder.canTransitionStatus() &&
            stockVerb && (
              <Button
                variant="light"
                color="blue"
                leftSection={
                  stockVerb === 'release' ? <IconLockOpen size={16} /> : <IconLock size={16} />
                }
                loading={acting}
                onClick={() => setStockAction(stockVerb)}
              >
                {t(
                  stockVerb === 'release'
                    ? 'salesOrdersV2.actions.release'
                    : 'salesOrdersV2.actions.lock',
                )}
              </Button>
            )}
          {/* Confirmed-stage only: a note is issued FROM stock the order
              already holds, and the server refuses any other stage. */}
          {stage === 'confirmed' && !pending && perms.deliveryRequest.canCreate() && (
            <Button
              variant="light"
              color="green"
              leftSection={<IconTruckDelivery size={16} />}
              loading={acting}
              onClick={() => setIssuing(true)}
            >
              {t('deliveryNotesV2.actions.issue')}
            </Button>
          )}
        </Group>
      </Group>

      {/* The status row — one hop per button, on its own line under the
          header. It used to share the header's Group, where eight buttons
          wrapped into a block whose first row was whatever happened to fit. */}
      {(canRetry || targets.length > 0 || noNextStep) && (
        <Group gap="sm" wrap="wrap">
          {canRetry && (
            <Button
              color={salesOrderStatusDisplay(t, order.status).color}
              leftSection={<IconCheck size={16} />}
              loading={acting}
              onClick={() => setRetrying(true)}
            >
              {t('salesOrdersV2.actions.retry')}
            </Button>
          )}
          {/* One button per hop the flow and this operator's department allow —
              named AND colored by the TARGET's ACTION, which falls back to the
              badge's own label and color when the client wrote no verb. The
              stage still picks the weight: entering confirmed-stage is the
              committing action so it fills; everything else stays light.
              Stock-moving hops earn a modal — entering confirmed-stage locks,
              entering fulfilled-stage releases (and may take the remainder) —
              while a hop inside a stage runs on the click. */}
          {targets.map((target) => {
            const display = salesOrderStatusAction(t, target.value);
            const onClick =
              (target.stage === 'confirmed' && stage !== 'confirmed') ||
              target.stage === 'fulfilled'
                ? () => setConfirmTarget(target)
                : target.stage === 'cancelled'
                  ? () => setCancelTarget(target)
                  : () => void runTransition(target.value);
            return (
              <Button
                key={target.value}
                color={display.color}
                variant={target.stage === 'confirmed' ? 'filled' : 'light'}
                leftSection={
                  target.stage === 'confirmed' ? (
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
              departments={salesOrderDepartmentsOwningNext(order.status, department)}
              withheldByPermission={reachable.length > 0}
            />
          )}
        </Group>
      )}

      <SalesOrderConfigAlerts />

      {pending && (
        <Alert
          color="orange"
          icon={<IconAlertTriangle size={18} />}
          title={t('salesOrdersV2.pending.title')}
        >
          <Stack gap={4}>
            <Text size="sm">{t('salesOrdersV2.pending.message')}</Text>
          </Stack>
        </Alert>
      )}
      {order.remainderReduced && (
        <Alert color="blue" variant="light" title={t('salesOrdersV2.remainderReduced.title')}>
          <Text size="sm">
            {order.remainderReduced.lines.length === 0
              ? t('salesOrdersV2.remainderReduced.none')
              : order.remainderReduced.lines
                  .map((line) => `${line.itemCode} ×${line.quantity}`)
                  .join(', ')}
          </Text>
        </Alert>
      )}

      <Grid gutter="lg">
        <Grid.Col span={{ base: 12, md: 7 }}>
          <Card withBorder padding="lg">
            <Stack gap="sm">
              <Title order={5}>{t('salesOrdersV2.form.lines')}</Title>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t('salesOrdersV2.form.item')}</Table.Th>
                    <Table.Th ta="right">{t('salesOrdersV2.form.quantity')}</Table.Th>
                    {showDelivered && (
                      <Table.Th ta="right">{t('salesOrdersV2.delivered')}</Table.Th>
                    )}
                    <Table.Th ta="right">{t('salesOrdersV2.inventory.held')}</Table.Th>
                    {showAvailable && (
                      <Table.Th ta="right">{t('salesOrdersV2.inventory.available')}</Table.Th>
                    )}
                    {/* The money columns earn their place only on a priced
                        order — an unpriced one would render a column of
                        dashes, which reads as data missing rather than as a
                        business that does not price its orders here. */}
                    {priced && (
                      <>
                        <Table.Th ta="right">{t('salesOrdersV2.form.unitPrice')}</Table.Th>
                        <Table.Th ta="right">{t('salesOrdersV2.form.lineTotal')}</Table.Th>
                      </>
                    )}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {order.items.map((line) => (
                    <Table.Tr key={`${line.itemType}:${line.itemId}`}>
                      <Table.Td>
                        <Stack gap={0}>
                          {/* The stored snapshots are the fallback for both
                              halves: a line naming an item the catalogue no
                              longer holds still reads as the code it was
                              written against. */}
                          <ComponentLinkV2
                            type={line.itemType === 'material' ? 'material-v2' : 'product-v2'}
                            id={line.itemId}
                            fallbackLabel={line.itemName}
                            fallbackCode={line.itemCode}
                            codeBelow
                          />
                          {line.note && (
                            <Text size="xs" c="dimmed">
                              {line.note}
                            </Text>
                          )}
                        </Stack>
                      </Table.Td>
                      <Table.Td ta="right">{quantityText(line)}</Table.Td>
                      {showDelivered && (
                        <Table.Td ta="right">{formatNumber(line.deliveredQuantity ?? 0)}</Table.Td>
                      )}
                      {/* A line whose item was never counted shows a dash in
                          both: no row is a different fact from a zero count,
                          and guessing one would understate availability. */}
                      <Table.Td ta="right">{formatNumber(stockFor(line)?.held)}</Table.Td>
                      {showAvailable && (
                        <Table.Td ta="right">
                          <LineStockCell stock={stockFor(line)} />
                        </Table.Td>
                      )}
                      {/* A dash, never a zero — the free-sample line and the
                          line nobody priced are different facts the record
                          keeps apart, and the form leaves the input empty for
                          the same reason. */}
                      {priced && (
                        <>
                          <Table.Td ta="right">
                            {line.unitPrice === undefined ? '—' : formatNumber(line.unitPrice)}
                          </Table.Td>
                          <Table.Td ta="right">
                            {line.unitPrice === undefined
                              ? '—'
                              : formatNumber(line.quantity * line.unitPrice)}
                          </Table.Td>
                        </>
                      )}
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
              <Group justify="end" gap="lg">
                <Text fw={600}>
                  {t('salesOrdersV2.columns.totalQuantity')}: {formatNumber(delivery.ordered)}
                </Text>
                {/* The two halves of the total, and only while they differ: on
                    an order nothing has shipped from, or one every note has
                    covered, they restate the figure beside them. */}
                {delivery.state === 'partial' && (
                  <>
                    <Text fw={600}>
                      {t('salesOrdersV2.delivered')}: {formatNumber(delivery.delivered)}
                    </Text>
                    <Text fw={600} c="orange">
                      {t('salesOrdersV2.delivery.remaining')}: {formatNumber(delivery.remaining)}
                    </Text>
                  </>
                )}
                {priced && (
                  <Text fw={700}>
                    {t('salesOrdersV2.columns.totalAmount')}: {formatNumber(order.totalAmount)}
                  </Text>
                )}
              </Group>
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 5 }}>
          <Stack gap="lg">
            <Card withBorder padding="lg">
              <Stack gap="sm">
                <RecordField
                  label={t('salesOrdersV2.form.customer')}
                  value={
                    order.customerId || order.customerName ? (
                      <Group gap="xs" wrap="wrap" align="center">
                        {/* No person icon: the field's own label says what
                          this is, and the code below the name is what the
                          reader is actually scanning for. */}
                        <ComponentLinkV2
                          type="customer-v2"
                          id={order.customerId}
                          fallbackLabel={order.customerName}
                          fallbackCode={order.customerCode}
                          codeBelow
                          withoutIcon
                        />
                        {/* A link IS the registered customer and a bare name IS
                          the walk-in — the badges read that pair rather than a
                          stored flag, there being none to read. BOTH are
                          badged: one badge alone says "this one is odd" of
                          whichever it marks, and the operator has to know
                          which case is the unmarked one to read it. */}
                        {order.customerId ? (
                          <Badge size="xs" variant="light" color="blue">
                            {t('salesOrdersV2.form.customerRegistered')}
                          </Badge>
                        ) : (
                          order.customerName && (
                            <Badge size="xs" variant="light" color="gray">
                              {t('salesOrdersV2.form.customerIndividual')}
                            </Badge>
                          )
                        )}
                      </Group>
                    ) : undefined
                  }
                />
                {/* Kept even when empty — `RecordField`'s named exception. The
                  two are read as a pair against the customer above them, and a
                  vanished row reads as a page that lost one rather than as a
                  contact nobody entered. */}
                <RecordField
                  label={t('common.labels.phone')}
                  value={order.customerPhone}
                  showEmpty
                />
                <RecordField
                  label={t('common.labels.address')}
                  value={order.customerAddress}
                  showEmpty
                />
                <RecordField
                  label={t('salesOrdersV2.form.orderDate')}
                  value={order.orderDate ? formatDate(order.orderDate) : undefined}
                />
                <RecordField
                  label={t('salesOrdersV2.form.requestedDate')}
                  value={order.requestedDate ? formatDate(order.requestedDate) : undefined}
                />
                <RecordField label={t('salesOrdersV2.form.reference')} value={order.reference} />
                <RecordField label={t('salesOrdersV2.form.notes')} value={order.notes} />
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

            {/* Its own card below the summary, not a row inside it: payment is
              the one thing on this rail that can be WRITTEN, and a button
              among read-only fields reads as part of them. */}
            {paymentTrackingOn && (
              <SalesOrderPaymentCard order={order} day={day} onSaved={setOrder} />
            )}
          </Stack>
        </Grid.Col>
      </Grid>

      {/* The notes issued against this order, as the SERVER lists them — a
          note's own ledger files and drops its row, and a non-empty list is
          what refuses this order's lock-releasing exits. */}
      {order.deliveryNotes !== undefined && order.deliveryNotes.length > 0 && (
        <Card withBorder padding="lg">
          <Stack gap="sm">
            <Title order={5}>{t('salesOrdersV2.deliveryNotes.title')}</Title>
            <Group gap="xs">
              {order.deliveryNotes.map((note) => (
                <ComponentLinkV2
                  key={note.id}
                  type="delivery-note-v2"
                  id={note.id}
                  fallbackLabel={note.number}
                />
              ))}
            </Group>
            <Text size="xs" c="dimmed">
              {t('salesOrdersV2.deliveryNotes.hint')}
            </Text>
          </Stack>
        </Card>
      )}

      <IssueDeliveryNoteModal
        opened={issuing}
        salesOrderId={order.id}
        salesOrderNumber={order.orderNumber}
        onClose={() => setIssuing(false)}
      />

      {/* The posting modal serves the fresh confirm, the completion and the
          pending retry — every hop that moves stock, and each keeps the tab open.

          Its action button REPEATS the button that opened it — the target's
          own label and color, `actions.retry` for the retry — because
          `ConfirmModal` otherwise defaults to a red "Delete", which is not
          this action under any client's vocabulary. */}
      <ConfirmModal
        opened={confirmTarget !== null || retrying}
        onClose={() => {
          setConfirmTarget(null);
          setRetrying(false);
          setReduceRemaining(false);
        }}
        onConfirm={() =>
          void runTransition(postingTarget, { reduceRemaining: isCompletion && reduceRemaining })
        }
        title={t(
          isCompletion ? 'salesOrdersV2.completeModal.title' : 'salesOrdersV2.confirmModal.title',
        )}
        message={t(
          isCompletion
            ? 'salesOrdersV2.completeModal.message'
            : 'salesOrdersV2.confirmModal.message',
        )}
        confirmLabel={
          retrying
            ? t('salesOrdersV2.actions.retry')
            : salesOrderStatusAction(t, postingTarget).label
        }
        confirmColor={salesOrderStatusAction(t, postingTarget).color}
        loading={acting}
      >
        {/* Completing an order that shipped without a note for everything:
            the toggle is the consent, and the table under it is exactly what
            the server will take — read from the same per-line sums. */}
        {isCompletion && (
          <Stack gap="sm">
            <Switch
              checked={reduceRemaining}
              onChange={(event) => setReduceRemaining(event.currentTarget.checked)}
              label={t('salesOrdersV2.completeModal.reduceToggle')}
              description={t('salesOrdersV2.completeModal.reduceHint')}
            />
            {reduceRemaining && nothingLeft && (
              <Text size="sm" c="dimmed">
                {t('salesOrdersV2.completeModal.nothingLeft')}
              </Text>
            )}
            {reduceRemaining && !nothingLeft && (
              <Table withTableBorder={false} verticalSpacing={4}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t('salesOrdersV2.form.item')}</Table.Th>
                    <Table.Th ta="right">{t('salesOrdersV2.completeModal.ordered')}</Table.Th>
                    <Table.Th ta="right">{t('salesOrdersV2.completeModal.delivered')}</Table.Th>
                    <Table.Th ta="right">{t('salesOrdersV2.completeModal.remaining')}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {remainders.map(({ line, delivered, remaining }) => (
                    <Table.Tr key={`${line.itemType}:${line.itemId}`}>
                      <Table.Td>{line.itemCode}</Table.Td>
                      <Table.Td ta="right">{formatNumber(line.quantity)}</Table.Td>
                      <Table.Td ta="right">{formatNumber(delivered)}</Table.Td>
                      <Table.Td ta="right" fw={remaining > 0 ? 600 : undefined}>
                        {formatNumber(remaining)}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Stack>
        )}
      </ConfirmModal>
      {/* One modal for both verbs — they are the same act in two directions,
          and a second component would be two copies of one confirmation. */}
      <ConfirmModal
        opened={stockAction !== null}
        onClose={() => setStockAction(null)}
        onConfirm={() => void runStockAction(stockAction ?? 'lock')}
        title={t(
          stockAction === 'release'
            ? 'salesOrdersV2.inventory.releaseModal.title'
            : 'salesOrdersV2.inventory.lockModal.title',
        )}
        message={t(
          stockAction === 'release'
            ? 'salesOrdersV2.inventory.releaseModal.message'
            : 'salesOrdersV2.inventory.lockModal.message',
        )}
        confirmLabel={t(
          stockAction === 'release'
            ? 'salesOrdersV2.actions.release'
            : 'salesOrdersV2.actions.lock',
        )}
        confirmColor="blue"
        loading={acting}
      />
      <ConfirmModal
        opened={cancelTarget !== null}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => void runTransition(cancelTarget!.value)}
        title={
          isDraftStage
            ? t('salesOrdersV2.cancelModal.titleDraft')
            : t('salesOrdersV2.cancelModal.titleConfirmed')
        }
        message={
          isDraftStage
            ? t('salesOrdersV2.cancelModal.messageDraft')
            : t('salesOrdersV2.cancelModal.messageConfirmed')
        }
        confirmLabel={
          cancelTarget ? salesOrderStatusAction(t, cancelTarget.value).label : undefined
        }
        confirmColor={
          cancelTarget ? salesOrderStatusAction(t, cancelTarget.value).color : undefined
        }
        loading={acting}
      />
    </Stack>
  );
}
