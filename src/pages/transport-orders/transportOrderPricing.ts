import type {
  TransportOrder,
  TransportOrderFee,
  TransportOrderFeeKind,
  TransportOrderFeePayer,
  TransportOrderTrip,
} from '@/types';

type StoredFee = {
  label: string;
  amount: number;
  vatable?: boolean;
  kind?: TransportOrderFeeKind;

  payer?: TransportOrderFeePayer | 'prepaid';
  invoiceNo?: string;
  memo?: string;
};

function normalizeFeeLine(fee: StoredFee): TransportOrderFee {
  const kind: TransportOrderFeeKind =
    fee.kind ?? (fee.payer === 'customer' ? 'passthrough' : 'service');
  const base = {
    label: fee.label,
    amount: fee.amount,
    invoiceNo: fee.invoiceNo ?? '',

    ...(fee.memo ? { memo: fee.memo } : {}),
  };
  if (kind === 'passthrough') {
    return {
      ...base,
      kind,
      vatable: false,
      payer: fee.payer === 'customer' ? 'customer' : 'company',
    };
  }
  return { ...base, kind, vatable: !!fee.vatable };
}

export function readFeeLines(
  order: Pick<TransportOrder, 'fees' | 'disbursements'>,
): TransportOrderFee[] {
  const fees = ((order.fees ?? []) as StoredFee[]).map(normalizeFeeLine);

  const legacy = (order.disbursements ?? []).map((d) =>
    normalizeFeeLine({
      label: d.name,
      amount: d.amount,
      kind: 'passthrough',
      payer: 'company',
      invoiceNo: d.invoiceNo,
    }),
  );
  return [...fees, ...legacy];
}

export function isBillableFee(fee: Pick<TransportOrderFee, 'kind' | 'payer'>): boolean {
  if (fee.kind === 'passthrough') return fee.payer !== 'customer';
  return true;
}

export const feeKey = (label: string) => label.trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi');

export type TransportOrderTotals = {
  serviceSubtotal: number;

  passthroughSubtotal: number;

  subtotal: number;
  vatBase: number;
  vatAmount: number;
  nonBillableTotal: number;
  grandTotal: number;
  advanceAmount: number;
  balanceDue: number;
};

function roundVat(exact: number, roundDown: boolean): number {
  return roundDown ? Math.floor(exact) : Math.round(exact);
}

export function computeTransportOrderTotals(
  fees: TransportOrderFee[],
  vatRate: number,
  advanceAmount = 0,
  roundDown = false,
): TransportOrderTotals {
  let serviceSubtotal = 0;
  let passthroughSubtotal = 0;
  let vatBase = 0;
  let nonBillableTotal = 0;
  for (const fee of fees) {
    const amount = fee.amount || 0;
    if (!isBillableFee(fee)) {
      nonBillableTotal += amount;
      continue;
    }
    if (fee.kind === 'passthrough') {
      passthroughSubtotal += amount;
      continue;
    }
    serviceSubtotal += amount;
    if (fee.vatable) vatBase += amount;
  }
  const subtotal = serviceSubtotal + passthroughSubtotal;
  const vatAmount = roundVat(vatBase * (vatRate || 0), roundDown);
  const grandTotal = subtotal + vatAmount;
  const advance = advanceAmount || 0;
  return {
    serviceSubtotal,
    passthroughSubtotal,
    subtotal,
    vatBase,
    vatAmount,
    nonBillableTotal,
    grandTotal,
    advanceAmount: advance,

    balanceDue: grandTotal - advance,
  };
}

export function orderTotals(order: TransportOrder): TransportOrderTotals {
  return computeTransportOrderTotals(
    readFeeLines(order),
    order.vatRate ?? 0,
    order.advanceAmount ?? 0,
    !!order.roundDown,
  );
}

export function computeTripLaborTotal(trips: Pick<TransportOrderTrip, 'laborCost'>[]): number {
  return trips.reduce((sum, trip) => sum + (trip.laborCost || 0), 0);
}

export function orderTripLaborTotal(order: TransportOrder): number {
  return order.isMultiTrip ? computeTripLaborTotal(order.trips ?? []) : (order.laborCost ?? 0);
}

export function formatMoney(n: number): string {
  return (n || 0).toLocaleString('vi-VN');
}
