export type PaymentAdvice =
  | { readonly kind: 'blocked'; readonly reason: 'amountRequired' | 'amountNegative' }
  /** The save proceeds. The operator is told what they are recording. */
  | { readonly kind: 'warn'; readonly reason: 'exceedsTotal' | 'writeOff' | 'settlesOrder' }
  | { readonly kind: 'ok' };

const OK: PaymentAdvice = { kind: 'ok' };

export function paymentAdviceOf(draft: {
  readonly status: 'unpaid' | 'partial' | 'paid';
  readonly amount: number | undefined;

  readonly total: number;
}): PaymentAdvice {
  const { status, amount, total } = draft;

  if (status === 'unpaid') return OK;
  if (amount === undefined) return { kind: 'blocked', reason: 'amountRequired' };
  if (amount < 0) return { kind: 'blocked', reason: 'amountNegative' };

  if (status === 'partial' && amount === 0) {
    return { kind: 'blocked', reason: 'amountRequired' };
  }

  if (amount > total) return { kind: 'warn', reason: 'exceedsTotal' };

  if (status === 'partial' && amount === total) return { kind: 'warn', reason: 'settlesOrder' };
  if (status === 'paid' && amount < total) return { kind: 'warn', reason: 'writeOff' };
  return OK;
}
