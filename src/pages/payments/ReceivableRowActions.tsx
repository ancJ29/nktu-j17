import { Button, Group } from '@mantine/core';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmModal } from '@/components/ConfirmModal';
import {
  SalesOrderPaymentAction,
  type SalesOrderPaymentDraft,
} from '@/pages/sales-orders/SalesOrderPaymentModal';
import {
  salesOrderPaymentPatch,
  salesOrderUntrackPatch,
} from '@/pages/sales-orders/salesOrderMetaPatch';
import type { SalesOrder } from '@/types';
import { isoToVnDateString } from '@/utils/dateTimeField';
import { featureFlags } from '@/utils/features';
import { paymentTermDaysOf, proposeDeadline } from '@/utils/paymentTerms';
import {
  computeSalesOrderTotals,
  resolveSalesOrderPaymentState,
  salesOrderDeadlineDay,
} from '@/utils/salesOrderPricing';
import { useCustomerStore } from '@/stores/useCustomerStore';
import { PAID_IN_FULL_PATCH, reportMarkError, writeReceivableMark } from './receivableMarks';

export function ReceivableRowActions({
  order,
  vatRate,
  left,
}: {
  readonly order: SalesOrder;
  readonly vatRate: number;

  readonly left: number;
}) {
  const { t } = useTranslation();
  const { items: customers } = useCustomerStore();
  const [confirm, setConfirm] = useState(false);
  const [confirmUntrack, setConfirmUntrack] = useState(false);
  const [busy, setBusy] = useState(false);

  const extra = order.extra ?? {};
  const { grandTotal } = computeSalesOrderTotals(order, vatRate);
  const payment = resolveSalesOrderPaymentState(extra, grandTotal);
  const termsOn = featureFlags.paymentTerms.enabled;
  const proposedDeadlineDay = (() => {
    const orderDay = isoToVnDateString(extra.orderDate ?? order.createdAt) ?? '';
    const customer = extra.customerCode
      ? customers.find((c) => c.code === extra.customerCode)
      : undefined;
    return proposeDeadline(
      orderDay,
      paymentTermDaysOf(customer?.extra, featureFlags.paymentTerms.defaultDays),
    );
  })();

  const savePart = async (draft: SalesOrderPaymentDraft) => {
    try {
      await writeReceivableMark(order, salesOrderPaymentPatch(draft, termsOn));
    } catch (err) {
      reportMarkError(err, t);
      throw err; // the modal stays open on the draft
    }
  };

  const markPaid = async () => {
    setBusy(true);
    try {
      await writeReceivableMark(order, PAID_IN_FULL_PATCH);
      setConfirm(false);
    } catch (err) {
      reportMarkError(err, t);
      setConfirm(false);
    } finally {
      setBusy(false);
    }
  };

  const untrack = async () => {
    setBusy(true);
    try {
      await writeReceivableMark(order, salesOrderUntrackPatch(true));
    } catch (err) {
      reportMarkError(err, t);
    } finally {
      setBusy(false);
      setConfirmUntrack(false);
    }
  };

  return (
    <Group
      gap={4}
      wrap="wrap"
      onClick={(e) => e.stopPropagation()}
      data-testid="receivable-row-actions"
    >
      <SalesOrderPaymentAction
        canRecord
        label={t('payments.mark.recordPart')}
        initialState="partial"
        state={payment.state}
        paidAmount={typeof extra.paidAmount === 'number' ? extra.paidAmount : undefined}
        grandTotal={grandTotal}
        storedDeadlineDay={salesOrderDeadlineDay(extra)}
        proposedDeadlineDay={proposedDeadlineDay}
        termsOn={termsOn}
        onSave={savePart}
      />
      <Button variant="light" color="teal" size="compact-sm" onClick={() => setConfirm(true)}>
        {t('payments.mark.paid')}
      </Button>
      <Button
        variant="subtle"
        color="gray"
        size="compact-sm"
        onClick={() => setConfirmUntrack(true)}
      >
        {t('payments.mark.untrack')}
      </Button>
      <ConfirmModal
        opened={confirmUntrack}
        onClose={() => setConfirmUntrack(false)}
        onConfirm={() => void untrack()}
        title={t('payments.mark.untrack')}
        message={t('payments.mark.untrackConfirm', {
          order: order.orderNumber,
          left: left.toLocaleString(),
        })}
        confirmLabel={t('payments.mark.untrack')}
        confirmColor="gray"
        loading={busy}
      />
      <ConfirmModal
        opened={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => void markPaid()}
        title={t('payments.mark.paid')}
        message={t('payments.mark.paidConfirm', {
          order: order.orderNumber,
          left: left.toLocaleString(),
        })}
        confirmLabel={t('payments.mark.paid')}
        confirmColor="teal"
        loading={busy}
      />
    </Group>
  );
}
