import { proposeDeadline } from '@/utils/paymentTerms';

export type PaymentDraftState = 'unpaid' | 'partial' | 'paid';

export type PaymentAdvice =
  | { readonly kind: 'blocked'; readonly reason: 'amountRequired' | 'amountNegative' }
  /** The save proceeds; the operator is told what they are recording. */
  | { readonly kind: 'warn'; readonly reason: 'exceedsTotal' | 'settlesOrder' }
  | { readonly kind: 'ok' };

const OK: PaymentAdvice = { kind: 'ok' };

export function salesOrderPaymentAdviceOf(draft: {
  readonly state: PaymentDraftState;
  readonly amount: number | undefined;

  readonly total: number;
}): PaymentAdvice {
  const { state, amount, total } = draft;

  if (state !== 'partial') return OK;
  if (amount === undefined || Number.isNaN(amount)) {
    return { kind: 'blocked', reason: 'amountRequired' };
  }
  if (amount < 0) return { kind: 'blocked', reason: 'amountNegative' };
  if (amount === 0) return { kind: 'blocked', reason: 'amountRequired' };
  if (amount > total) return { kind: 'warn', reason: 'exceedsTotal' };
  if (amount === total) return { kind: 'warn', reason: 'settlesOrder' };
  return OK;
}

export function modalDeadlineSeed(storedDay: string, orderDay: string, termDays: number): string {
  return storedDay || proposeDeadline(orderDay, termDays);
}
