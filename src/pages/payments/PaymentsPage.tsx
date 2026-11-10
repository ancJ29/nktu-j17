import { Group, SegmentedControl, Stack } from '@mantine/core';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { device } from '@credo/base-ui/utils';
import { useUrlBlobFilters } from '@/hooks/useUrlBlobFilters';
import { PayablesTab } from './PayablesTab';
import { ReceivablesTab } from './ReceivablesTab';
import { allowedPaymentsTabs, resolvePaymentsTab, type PaymentsTab } from './paymentsAccess';
import { readPaymentsAccess } from './readPaymentsAccess';

const isMobile = device.isMobile;

type PaymentsUrlState = { t?: PaymentsTab };

function compactState(state: PaymentsUrlState): PaymentsUrlState {
  return state.t === 'payable' ? { t: 'payable' } : {};
}

export function PaymentsPage() {
  const { t } = useTranslation();
  const { state, updateState } = useUrlBlobFilters<PaymentsUrlState>({
    cacheKey: 'cmngt:payments-tab',
    compactState,
  });
  const allowed = allowedPaymentsTabs(readPaymentsAccess());
  const tab = resolvePaymentsTab(state.t, allowed);
  const setTab = useCallback((v: string) => updateState({ t: v as PaymentsTab }), [updateState]);

  if (!tab) return null;

  const labels: Record<PaymentsTab, string> = {
    receivable: t('payments.receivable.title'),
    payable: t('payments.payable.title'),
  };

  return (
    <Stack gap={isMobile ? 'md' : 'lg'}>
      {allowed.length > 1 && (
        <Group justify="flex-start">
          <SegmentedControl
            size="sm"
            value={tab}
            onChange={setTab}
            data={allowed.map((v) => ({ value: v, label: labels[v] }))}
          />
        </Group>
      )}
      {tab === 'receivable' ? <ReceivablesTab /> : <PayablesTab />}
    </Stack>
  );
}
