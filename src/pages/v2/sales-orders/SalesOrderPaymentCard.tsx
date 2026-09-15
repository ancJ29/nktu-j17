/**
 * What this order has been paid, and the one write that changes it.
 *
 * **A card on the detail page, not a field on the form**, for the reason the
 * route exists at all: the form is draft-stage only and an order gets paid
 * after somebody confirms it. Recording one is also a deliberate act with a
 * figure attached, which is the same argument that keeps the stock count in a
 * modal rather than inline (`inventory-v2.md`).
 */

import { Button, Card, Group, Modal, SegmentedControl, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCash } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NumberField } from '@/components/NumberField';
import { EntityConflictError } from '@/stores/createEntityStore';
import { setSalesOrderV2Payment } from '@/stores/useSalesOrderV2Store';
import { formatDateTime } from '@/utils/dateFormat';
import { formatNumber } from '@/utils/number';
import type { SalesOrderV2 } from '@/types/sales-order-v2';
import {
  PAYMENT_STATUSES,
  canManagePayment,
  paymentStatusOf,
  useSalesOrderPaymentLabel,
  type SalesOrderPaymentStatus,
} from './payment';
import { paymentAdviceOf, type PaymentAdvice } from './paymentAdvice';
import { SalesOrderPaymentBadge } from './SalesOrderPaymentBadge';

/** One label→figure line. `strong` marks the one the operator acts on. */
function FigureRow({
  label,
  value,
  strong,
  color,
}: {
  readonly label: string;
  readonly value: number;
  readonly strong?: boolean;
  readonly color?: string;
}) {
  return (
    <Group justify="space-between" wrap="nowrap" align="baseline" gap="md">
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text size="sm" fw={strong ? 700 : 500} c={color} ta="right">
        {formatNumber(value)}
      </Text>
    </Group>
  );
}

/**
 * Resolved at the call site rather than inside `paymentAdvice`: `Translate`'s
 * keys are a literal union, and naming one in a shared file widens it to
 * `string` and loses the check that the key exists.
 */
const WARNING_KEYS = {
  exceedsTotal: 'salesOrdersV2.payment.warnExceedsTotal',
  writeOff: 'salesOrdersV2.payment.warnWriteOff',
  settlesOrder: 'salesOrdersV2.payment.warnSettlesOrder',
} as const satisfies Record<Extract<PaymentAdvice, { kind: 'warn' }>['reason'], string>;

export function SalesOrderPaymentCard({
  order,
  day,
  onSaved,
}: {
  readonly order: SalesOrderV2;
  readonly day: string;
  readonly onSaved: (next: SalesOrderV2) => void;
}) {
  const { t } = useTranslation();
  const labelOf = useSalesOrderPaymentLabel();
  const [opened, setOpened] = useState(false);
  const [status, setStatus] = useState<SalesOrderPaymentStatus>(paymentStatusOf(order));
  const [amount, setAmount] = useState<number | undefined>(order.paidAmount);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /**
   * An order nobody priced has no total to be paid against, so the server
   * refuses one. The card still RENDERS and says why — a missing card would
   * read as "this client does not track payment", which is a different fact
   * and one the operator cannot act on.
   */
  const priced = order.totalAmount !== undefined;
  const total = order.totalAmount ?? 0;
  const paid = order.paidAmount ?? 0;
  const outstanding = priced ? Math.max(total - paid, 0) : 0;
  /**
   * What the customer is ahead by. Shown because the card used to clamp the
   * outstanding row at zero and say nothing else — so an over-payment, which
   * the record keeps in full, was invisible on the one screen that reports
   * the money.
   */
  const credit = priced ? Math.max(paid - total, 0) : 0;

  /** Live, so the modal answers while the figure is being typed. */
  const advice = paymentAdviceOf({ status, amount, total });

  const open = () => {
    // Seeded from what is STORED each time, so the modal always opens on the
    // record rather than on a figure captured before the last save.
    setStatus(paymentStatusOf(order));
    setAmount(order.paidAmount);
    setError(null);
    setOpened(true);
  };

  /**
   * Picking `paid` on an order with no figure yet fills in the total, which is
   * what that word means nine times out of ten. It never OVERWRITES a figure
   * the operator entered — a write-off is them lowering this one, and having
   * it jump back to the total under their hands would be the form arguing.
   */
  const pickStatus = (next: SalesOrderPaymentStatus) => {
    setStatus(next);
    setError(null);
    if (next === 'paid' && amount === undefined) setAmount(total);
  };

  const submit = async () => {
    if (advice.kind === 'blocked') {
      return setError(
        t(
          advice.reason === 'amountRequired'
            ? 'salesOrdersV2.payment.amountRequired'
            : 'salesOrdersV2.payment.amountNonNegative',
        ),
      );
    }
    setError(null);
    setSaving(true);
    try {
      // `unpaid` sends no figure at all — the server refuses one there, that
      // status meaning the whole total is still owed.
      onSaved(
        await setSalesOrderV2Payment(order, day, {
          status,
          ...(status !== 'unpaid' && amount !== undefined ? { paidAmount: amount } : {}),
        }),
      );
      notifications.show({ color: 'green', message: t('salesOrdersV2.payment.success') });
      setOpened(false);
    } catch (err) {
      notifications.show({
        color: err instanceof EntityConflictError ? 'yellow' : 'red',
        message:
          err instanceof EntityConflictError
            ? t('common.conflict.message')
            : t('salesOrdersV2.notifications.writeError'),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card withBorder padding="lg">
      <Stack gap="sm">
        <Group justify="space-between">
          <Text fw={600}>{t('salesOrdersV2.payment.title')}</Text>
          <SalesOrderPaymentBadge order={order} />
        </Group>

        {/* Label left, figure right, one row each — the two figures used to
            share a line and read as one sentence, so neither could be scanned.
            The outstanding row is the only one in BOLD: it is the figure the
            operator acts on, and the two above it are how it was arrived at. */}
        {priced ? (
          <Stack gap={6}>
            <FigureRow label={t('salesOrdersV2.payment.total')} value={order.totalAmount ?? 0} />
            <FigureRow label={t('salesOrdersV2.payment.received')} value={paid} />
            <FigureRow
              label={t('salesOrdersV2.payment.outstanding')}
              value={outstanding}
              strong
              color={outstanding > 0 ? 'orange' : undefined}
            />
            {credit > 0 && (
              <FigureRow label={t('salesOrdersV2.payment.credit')} value={credit} color="blue" />
            )}
            {/* When these figures were last stated. A payment can be re-recorded
                as often as a correction needs — refusing that would trap a
                mistyped figure on the order forever — so what the card owes the
                reader is that the number has an author and a moment, not that it
                is final. The activity log carries the full trail. */}
            {order.paidAt !== undefined && (
              <Text size="xs" c="dimmed" ta="right">
                {t('salesOrdersV2.payment.recordedAt', {
                  when: formatDateTime(order.paidAt),
                })}
              </Text>
            )}
          </Stack>
        ) : (
          <Text size="sm" c="dimmed">
            {t('salesOrdersV2.payment.unpriced')}
          </Text>
        )}

        {/* Reading is open to anyone who may read the order; only this is
            gated — hiding the figures would make "nothing paid" and "you may
            not see payments" one screen. */}
        {canManagePayment() && priced && (
          <Button variant="light" leftSection={<IconCash size={16} />} onClick={open} fullWidth>
            {t('salesOrdersV2.payment.record')}
          </Button>
        )}
      </Stack>

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={t('salesOrdersV2.payment.modalTitle')}
        centered
      >
        <Stack gap="md">
          <SegmentedControl
            fullWidth
            value={status}
            onChange={(next) => pickStatus(next as SalesOrderPaymentStatus)}
            data={PAYMENT_STATUSES.map((value) => ({ value, label: labelOf(value) }))}
          />
          {/* The status is ASSERTED, not derived from the figure — the hint
              says so, because an operator who expects arithmetic would read a
              paid-with-a-shortfall order as a bug. */}
          <Text size="xs" c="dimmed">
            {t('salesOrdersV2.payment.statusHint')}
          </Text>

          {status !== 'unpaid' && (
            <NumberField
              label={t('salesOrdersV2.payment.amount')}
              value={amount}
              onChange={(next) => {
                setAmount(next);
                // A keystroke means they are answering the refusal — clear it
                // rather than leaving it under a field that has changed.
                setError(null);
              }}
              min={0}
            />
          )}

          {/* Orange and non-blocking: each of these is a real thing to record,
              and the modal's job is to make sure it is the one the operator
              meant. The refusal below is red and stops the save. */}
          {advice.kind === 'warn' && (
            <Text size="sm" c="orange">
              {t(WARNING_KEYS[advice.reason])}
            </Text>
          )}

          {error && (
            <Text size="sm" c="red">
              {error}
            </Text>
          )}

          <Group justify="end">
            <Button variant="subtle" onClick={() => setOpened(false)}>
              {t('common.actions.cancel')}
            </Button>
            <Button loading={saving} onClick={() => void submit()}>
              {t('common.actions.save')}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Card>
  );
}
