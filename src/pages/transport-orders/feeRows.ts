import type {
  TransportOrder,
  TransportOrderFee,
  TransportOrderFeeKind,
  TransportOrderFeePayer,
} from '@/types';
import { readFeeLines } from './transportOrderPricing';
import { FALLBACK_FEE_NAMES } from './feeName';

export const DEFAULT_VAT_PERCENT = 8;

export type FeeRow = {
  label: string;
  amount: number;
  vatable: boolean;
  kind: TransportOrderFeeKind;
  payer: TransportOrderFeePayer;
  invoiceNo: string;
  memo: string;
};

export type FeeFormValues = {
  fees: FeeRow[];
  vatRatePercent: number;
  advanceAmount: number;
  roundDown: boolean;
};

export function blankFee(over: Partial<FeeRow> = {}): FeeRow {
  return {
    label: '',
    amount: 0,
    vatable: true,
    kind: 'service',
    payer: 'company',
    invoiceNo: '',
    memo: '',
    ...over,
  };
}

export function initialFees(): FeeRow[] {
  return FALLBACK_FEE_NAMES.map(({ value }) =>
    blankFee({ label: value, vatable: value !== 'Phí neo xe' }),
  );
}

export function isSeedFees(fees: FeeRow[]): boolean {
  return (
    fees.length === FALLBACK_FEE_NAMES.length &&
    fees.every(
      (f) =>
        !f.amount &&
        !f.invoiceNo.trim() &&
        !f.memo.trim() &&
        FALLBACK_FEE_NAMES.some((o) => o.value === f.label),
    )
  );
}

export function toFeeRows(order: Pick<TransportOrder, 'fees' | 'disbursements'>): FeeRow[] {
  return readFeeLines(order).map((f) => ({
    ...f,
    payer: f.payer ?? 'company',
    memo: f.memo ?? '',
  }));
}

export function feeRowsToFees(rows: FeeRow[]): TransportOrderFee[] {
  return rows
    .filter((f) => f.label.trim() || f.amount || f.invoiceNo.trim() || f.memo.trim())
    .map((f) => {
      const base = {
        label: f.label.trim(),
        amount: f.amount || 0,
        invoiceNo: f.invoiceNo.trim(),

        ...(f.memo.trim() ? { memo: f.memo.trim() } : {}),
      };
      return f.kind === 'passthrough'
        ? { ...base, kind: f.kind, vatable: false, payer: f.payer }
        : { ...base, kind: 'service' as const, vatable: f.vatable };
    });
}
