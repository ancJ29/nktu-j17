export type PaymentStateTone = 'unpaid' | 'partial' | 'paid' | 'overdue' | 'untracked' | 'all';

export const PAYMENT_STATE_COLOR: Readonly<Record<PaymentStateTone, string>> = {
  unpaid: 'blue',
  partial: 'orange',
  paid: 'teal',
  overdue: 'red',
  untracked: 'gray',
  all: 'dark',
};

export const OVERDUE_ROW_BG = 'red.1';
