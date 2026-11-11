import { Button, Group, Modal, SegmentedControl, Stack, Text } from '@mantine/core';
import { IconCash } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DateField } from '@/components/DateField';
import { NumberField } from '@/components/NumberField';
import {
  salesOrderPaymentAdviceOf,
  type PaymentAdvice,
  type PaymentDraftState,
} from './salesOrderPaymentAdvice';

export type SalesOrderPaymentDraft = {
  readonly state: PaymentDraftState;

  readonly paidAmount?: number;

  readonly deadlineDay: string;
};

const WARNING_KEYS = {
  exceedsTotal: 'salesOrders.payment.warnExceedsTotal',
  settlesOrder: 'salesOrders.payment.warnSettlesOrder',
} as const satisfies Record<Extract<PaymentAdvice, { kind: 'warn' }>['reason'], string>;

export function SalesOrderPaymentAction({
  canRecord,
  state: storedState,
  paidAmount: storedAmount,
  grandTotal,
  storedDeadlineDay,
  proposedDeadlineDay,
  termsOn,
  onSave,
  initialState,
  label,
}: {
  readonly canRecord: boolean;
  readonly state: PaymentDraftState;
  readonly paidAmount: number | undefined;
  readonly grandTotal: number;
  readonly storedDeadlineDay: string;

  readonly proposedDeadlineDay: string;
  readonly termsOn: boolean;

  readonly onSave: (draft: SalesOrderPaymentDraft) => Promise<void>;

  readonly initialState?: PaymentDraftState;

  readonly label?: string;
}) {
  const { t } = useTranslation();
  const [opened, setOpened] = useState(false);
  const [state, setState] = useState<PaymentDraftState>(storedState);
  const [amount, setAmount] = useState<number | undefined>(storedAmount);
  const [deadlineDay, setDeadlineDay] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!canRecord) return null;

  const advice = salesOrderPaymentAdviceOf({ state, amount, total: grandTotal });

  const open = () => {
    setState(initialState ?? storedState);
    setAmount(initialState === 'partial' ? undefined : storedAmount);
    setDeadlineDay(storedDeadlineDay || proposedDeadlineDay);
    setError(null);
    setOpened(true);
  };

  const submit = async () => {
    if (advice.kind === 'blocked') {
      setError(
        t(
          advice.reason === 'amountRequired'
            ? 'salesOrders.payment.amountRequired'
            : 'salesOrders.payment.amountNonNegative',
        ),
      );
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSave({
        state,
        ...(state === 'partial' && amount !== undefined ? { paidAmount: amount } : {}),
        deadlineDay,
      });
      setOpened(false);
    } catch {
      // The page has already said what went wrong (a conflict re-seeds the order);
      // the draft stays so the operator can retry.
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button variant="light" size="compact-sm" leftSection={<IconCash size={14} />} onClick={open}>
        {label ?? t('salesOrders.payment.record')}
      </Button>
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={t('salesOrders.payment.modalTitle')}
        centered
      >
        <Stack gap="md">
          <SegmentedControl
            fullWidth
            value={state}
            onChange={(next) => {
              setState(next as PaymentDraftState);
              setError(null);
            }}
            data={[
              { value: 'unpaid', label: t('salesOrders.billing.unpaid') },
              { value: 'partial', label: t('salesOrders.billing.partial') },
              { value: 'paid', label: t('salesOrders.billing.paid') },
            ]}
          />
          {state === 'paid' && (
            <Text size="xs" c="dimmed">
              {t('salesOrders.payment.paidInFullHint')}
            </Text>
          )}
          {state === 'partial' && (
            <NumberField
              label={t('salesOrders.payment.amount')}
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
              {t(WARNING_KEYS[advice.reason])}
            </Text>
          )}
          {termsOn && (
            <DateField
              label={t('salesOrders.billing.paymentDeadlineLabel')}
              value={deadlineDay || null}
              onChange={(v) => setDeadlineDay(typeof v === 'string' ? v : '')}
              clearable
            />
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
    </>
  );
}
