import { useUrlBlobFilters } from '@/hooks/useUrlBlobFilters';
import type { PaymentsTab } from './paymentsAccess';
import {
  DEFAULT_RECEIVABLE_FILTER,
  parseReceivableFilter,
  type ReceivableFilter,
} from './receivables';

export type PaymentsUrlState = {
  t?: PaymentsTab;
  rf?: ReceivableFilter;
  rc?: string;
  rq?: string;

  pf?: ReceivableFilter;
  pv?: string;
  pq?: string;
};

export function compactPaymentsState(state: PaymentsUrlState): PaymentsUrlState {
  const out: PaymentsUrlState = {};
  if (state.t === 'payable') out.t = 'payable';
  if (state.rf && parseReceivableFilter(state.rf) !== DEFAULT_RECEIVABLE_FILTER) {
    out.rf = parseReceivableFilter(state.rf);
  }
  if (typeof state.rc === 'string' && state.rc !== '') out.rc = state.rc;
  if (typeof state.rq === 'string' && state.rq.trim() !== '') out.rq = state.rq;
  if (state.pf && parseReceivableFilter(state.pf) !== DEFAULT_RECEIVABLE_FILTER) {
    out.pf = parseReceivableFilter(state.pf);
  }
  if (typeof state.pv === 'string' && state.pv !== '') out.pv = state.pv;
  if (typeof state.pq === 'string' && state.pq.trim() !== '') out.pq = state.pq;
  return out;
}

export function usePaymentsUrlState() {
  return useUrlBlobFilters<PaymentsUrlState>({
    cacheKey: 'cmngt:payments-tab',
    compactState: compactPaymentsState,
  });
}
