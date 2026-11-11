import { Button, Group, Modal } from '@mantine/core';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmModal } from '@/components/ConfirmModal';
import { PurchaseOrderPaymentForm } from '@/pages/purchase-orders/PurchaseOrderPaymentForm';
import {
  paidInFull,
  writePurchaseOrderPayment,
  writePurchaseOrderTracking,
  type PurchaseOrderPaymentNext,
} from '@/pages/purchase-orders/purchaseOrderPaymentWrite';
import {
  formatMoney,
  orderTotal,
  poCurrency,
  poPayment,
} from '@/pages/purchase-orders/purchaseOrderModel';
import type { PurchaseOrder } from '@/types';
import { isoToVnDateString } from '@/utils/dateTimeField';
import { reportMarkError } from './receivableMarks';

export function PayableRowActions({
  order,
  showPrice,
}: {
  readonly order: PurchaseOrder;
  readonly showPrice: boolean;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState(false);
  const [confirm, setConfirm] = useState<'paid' | 'untrack' | null>(null);
  const [busy, setBusy] = useState(false);
  const currency = poCurrency(order);
  const left = `${formatMoney(poPayment(order).remaining, currency)} ${currency}`;

  const savePart = async (next: PurchaseOrderPaymentNext) => {
    setBusy(true);
    try {
      await writePurchaseOrderPayment(order, next);
      setForm(false);
    } catch (err) {
      reportMarkError(err, t); // the modal stays open on the draft
    } finally {
      setBusy(false);
    }
  };

  const runConfirmed = async () => {
    const kind = confirm;
    if (!kind) return;
    setBusy(true);
    try {
      if (kind === 'paid') await writePurchaseOrderPayment(order, paidInFull(order));
      else await writePurchaseOrderTracking(order, true);
    } catch (err) {
      reportMarkError(err, t);
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  return (
    <Group
      gap={4}
      wrap="wrap"
      onClick={(e) => e.stopPropagation()}
      data-testid="payable-row-actions"
    >
      <Button variant="light" size="compact-sm" onClick={() => setForm(true)}>
        {t('payments.mark.recordPart')}
      </Button>
      <Button variant="light" color="teal" size="compact-sm" onClick={() => setConfirm('paid')}>
        {t('payments.mark.paid')}
      </Button>
      <Button variant="subtle" color="gray" size="compact-sm" onClick={() => setConfirm('untrack')}>
        {t('payments.mark.untrack')}
      </Button>
      <Modal
        opened={form}
        onClose={() => setForm(false)}
        title={t('purchaseOrders.payment.editTitle')}
        centered
      >
        {form && (
          <PurchaseOrderPaymentForm
            initialState="partial"
            initialAmount={undefined}
            total={orderTotal(order)}
            currency={currency}
            showPrice={showPrice}
            initialDeadline={isoToVnDateString(order.paymentDeadline)}
            loading={busy}
            onCancel={() => setForm(false)}
            onSave={(next) => void savePart(next)}
          />
        )}
      </Modal>
      <ConfirmModal
        opened={confirm !== null}
        onClose={() => setConfirm(null)}
        onConfirm={() => void runConfirmed()}
        title={confirm === 'untrack' ? t('payments.mark.untrack') : t('payments.mark.paid')}
        message={t(
          confirm === 'untrack' ? 'payments.mark.untrackConfirm' : 'payments.mark.paidConfirm',
          {
            order: order.orderNumber,
            left,
          },
        )}
        confirmLabel={confirm === 'untrack' ? t('payments.mark.untrack') : t('payments.mark.paid')}
        confirmColor={confirm === 'untrack' ? 'gray' : 'teal'}
        loading={busy}
      />
    </Group>
  );
}
