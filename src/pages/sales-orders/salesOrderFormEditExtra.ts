import type { SalesOrderExtra } from '@/types';

const ALWAYS_OWNED = [
  'customerName',
  'customerCode',
  'isIndividualCustomer',
  'quotationId',
  'quotationCode',
  'orderDate',
  'customerPONumber',
  'deliveryAddress',
  'googleMapUrl',
  'deliveryDate',
  'deliveryMethod',
  'productWarehouseMemos',
  'assignedStaff',
  'warehouseStaff',
  'isUrgent',
  'tags',
  'attachments',
] as const satisfies readonly (keyof SalesOrderExtra)[];

const PRICING_OWNED = [
  'needVAT',
  'needShippingFee',
  'vatRate',
  'vatTag',
  'shippingFee',
  'isPaid',
  'paidAmount',
  'invoiceIssued',
] as const satisfies readonly (keyof SalesOrderExtra)[];

const DELIVERY_REQUESTS_OWNED = [
  'isInternalDelivery',
] as const satisfies readonly (keyof SalesOrderExtra)[];

const SPLIT_NOTE_KEYS = ['warehouseNote', 'driverNote'] as const;

export type SalesOrderFormOwnedExtraKey =
  | (typeof ALWAYS_OWNED)[number]
  | (typeof PRICING_OWNED)[number]
  | (typeof DELIVERY_REQUESTS_OWNED)[number]
  | 'clientSpecific';

export type SalesOrderFormOwnership = {
  readonly pricing: boolean;
  readonly deliveryRequests: boolean;
  readonly splitNotes: boolean;
};

type OnlyOwnedKeys<F> = F & {
  readonly [K in Exclude<keyof F, SalesOrderFormOwnedExtraKey>]: never;
};

export function mergeFormEditExtra<F extends SalesOrderExtra>(
  stored: SalesOrderExtra,
  formExtra: OnlyOwnedKeys<F>,
  owns: SalesOrderFormOwnership,
): SalesOrderExtra {
  const owned = new Set<string>([
    ...ALWAYS_OWNED,
    ...(owns.pricing ? PRICING_OWNED : []),
    ...(owns.deliveryRequests ? DELIVERY_REQUESTS_OWNED : []),
  ]);
  const { clientSpecific: storedClientSpecific, ...storedRest } = stored;
  const { clientSpecific: formClientSpecific, ...formRest } = formExtra as SalesOrderExtra;
  const kept = Object.fromEntries(Object.entries(storedRest).filter(([key]) => !owned.has(key)));

  const clientSpecific = owns.splitNotes
    ? mergeSplitNotes(storedClientSpecific, formClientSpecific)
    : storedClientSpecific;
  return { ...kept, ...formRest, ...(clientSpecific && { clientSpecific }) };
}

function mergeSplitNotes(
  stored: SalesOrderExtra['clientSpecific'],
  form: SalesOrderExtra['clientSpecific'],
): SalesOrderExtra['clientSpecific'] {
  const keptNktu = Object.fromEntries(
    Object.entries(stored?.NKTU ?? {}).filter(
      ([key]) => !(SPLIT_NOTE_KEYS as readonly string[]).includes(key),
    ),
  );
  const NKTU = { ...keptNktu, ...form?.NKTU };
  const merged: NonNullable<SalesOrderExtra['clientSpecific']> = { ...stored, NKTU };
  if (Object.keys(NKTU).length === 0) delete merged.NKTU;
  return Object.keys(merged).length > 0 ? merged : undefined;
}
