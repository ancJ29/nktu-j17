import { Button, Group, SegmentedControl, Stack, Text } from '@mantine/core';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DateField } from '@/components/DateField';
import { NumberField } from '@/components/NumberField';
import type { PurchaseOrderCurrency } from '@/types';
import { vnDateStringToIso } from '@/utils/dateTimeField';
import {
  salesOrderPaymentAdviceOf,
  type PaymentDraftState,
} from '@/pages/sales-orders/salesOrderPaymentAdvice';

export function PurchaseOrderPaymentForm({
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
