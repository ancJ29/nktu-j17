import type { DeliveryRequest, Product } from '@/types';
import type { InventoryLinkageSnapshotEntry } from '@/types/sales-order';
import { DEFAULT_LOCATION_CODE } from '@/types/location';
import { convertUnit, getItemBaseUnit } from './unitConversion';

export function restockedReturnsOf(
  requests: readonly DeliveryRequest[],
  salesOrderId: string,
  isCompleted: (dr: DeliveryRequest) => boolean,
): DeliveryRequest[] {
  return requests.filter((d) => {
    const x = d.extra;
    if (d.salesOrderId !== salesOrderId || x?.isDeleted) return false;
    if (d.direction !== 'inbound' || x?.inboundKind !== 'customer-return') return false;
    return Boolean(x.returnRestockedAt) || (x.returnRestock === true && isCompleted(d));
  });
}

export type NetResult =
  | { ok: true; snapshot: InventoryLinkageSnapshotEntry[] }
  | { ok: false; productCode: string; unit: string };

export function netRestockedReturns(
  snapshot: readonly InventoryLinkageSnapshotEntry[],
  returns: readonly DeliveryRequest[],
  productsByCode: Map<string, Product>,
): NetResult {
  const returnedBase = new Map<string, number>();
  for (const dr of returns) {
    for (const l of dr.items) {
      if (!(l.quantity > 0)) continue;
      const product = productsByCode.get(l.productCode);
      if (!product) return { ok: false, productCode: l.productCode, unit: l.unit };
      const base = convertUnit(
        l.quantity,
        l.unit,
        getItemBaseUnit(product),
        product.extra?.unitConversions ?? [],
      );
      if (base === null) return { ok: false, productCode: l.productCode, unit: l.unit };
      const key = `${l.productCode}@${l.fromLocationCode || DEFAULT_LOCATION_CODE}`;
      returnedBase.set(key, (returnedBase.get(key) ?? 0) + base);
    }
  }
  if (returnedBase.size === 0) return { ok: true, snapshot: [...snapshot] };

  const out: InventoryLinkageSnapshotEntry[] = [];
  for (const entry of snapshot) {
    const key = `${entry.itemCode}@${entry.locationCode}`;
    const back = returnedBase.get(key) ?? 0;
    if (back <= 0) {
      out.push(entry);
      continue;
    }
    const product = productsByCode.get(entry.itemCode);
    if (!product) return { ok: false, productCode: entry.itemCode, unit: '' };
    const baseUnit = getItemBaseUnit(product);
    let shippedBase = 0;
    for (const [u, q] of Object.entries(entry.byUnit)) {
      const b = convertUnit(q, u, baseUnit, product.extra?.unitConversions ?? []);
      if (b === null) return { ok: false, productCode: entry.itemCode, unit: u };
      shippedBase += b;
    }
    const take = Math.min(back, shippedBase);
    returnedBase.set(key, back - take);
    const left = shippedBase - take;
    if (left > 0) out.push({ ...entry, byUnit: { [baseUnit]: left } });
  }
  return { ok: true, snapshot: out };
}
