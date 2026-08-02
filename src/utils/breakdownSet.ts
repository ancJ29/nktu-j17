import type { Product, ProductSetItem } from '@/types/product';
import type { ProductInventoryRow } from '@/types/product-inventory';
import type {
  BreakdownRemainderCredit,
  InventoryLinkageSnapshotEntry,
  SalesOrderItem,
} from '@/types/sales-order';
import { DEFAULT_LOCATION_CODE, isDefaultLocation } from '@/types/location';
import { getLinePhysicalQuantity } from './salesOrderItemQuantity';
import { getOwnReservedAtLocation, getProductLocationAvailability } from './inventoryCommitment';
import { getSetItems, isBreakdownSet } from './productSet';
import { convertUnit, getItemBaseUnit } from './unitConversion';

export type BreakdownParentLink = {
  readonly parent: Product;

  readonly item: ProductSetItem;
};

export function buildBreakdownParentIndex(
  products: Iterable<Product>,
): Map<string, BreakdownParentLink[]> {
  const out = new Map<string, BreakdownParentLink[]>();
  for (const parent of products) {
    if (!isBreakdownSet(parent)) continue;
    for (const item of getSetItems(parent)) {
      if (!item.productCode || !(item.quantity > 0)) continue;
      const bucket = out.get(item.productCode);
      if (bucket) bucket.push({ parent, item });
      else out.set(item.productCode, [{ parent, item }]);
    }
  }
  return out;
}

export type BreakdownCoverage = {
  readonly componentQty: number;

  readonly parentLock: {
    readonly product: Product;
    readonly unit: string;
    readonly quantity: number;
  } | null;

  readonly remainder: number;

  readonly residual: number;
};

export type PlanBreakdownCoverageInputs = {
  readonly component: Product;

  readonly quantity: number;
  readonly unit: string;
  readonly locationCode: string;
  readonly parentIndex: Map<string, BreakdownParentLink[]>;
  readonly inventoryByProduct: Map<string, ProductInventoryRow[]>;

  readonly ownReservedSnapshot?: readonly InventoryLinkageSnapshotEntry[];
};

export function planBreakdownCoverage(
  inputs: PlanBreakdownCoverageInputs,
): BreakdownCoverage | null {
  const {
    component,
    quantity,
    unit,
    locationCode,
    parentIndex,
    inventoryByProduct,
    ownReservedSnapshot,
  } = inputs;
  if (!(quantity > 0)) return null;

  const links = parentIndex.get(component.code);
  if (!links || links.length === 0) return null;
  if (links.length > 1) {
    console.warn(
      `[breakdown-set] ${component.code} is yielded by ${links.length} breakdown parents ` +
        `(${links.map((l) => l.parent.code).join(', ')}); substitution skipped.`,
    );
    return null;
  }
  const { parent, item } = links[0];

  const perParent =
    item.unit === unit
      ? item.quantity
      : convertUnit(item.quantity, item.unit, unit, component.extra?.unitConversions ?? []);
  if (perParent === null || !(perParent > 0)) {
    console.warn(
      `[breakdown-set] no conversion from ${item.unit} → ${unit} for ${component.code} ` +
        `(parent ${parent.code}); substitution skipped.`,
    );
    return null;
  }

  const componentAvailable =
    getProductLocationAvailability(component, locationCode, inventoryByProduct).available +
    getOwnReservedAtLocation(component, locationCode, ownReservedSnapshot);
  const componentReserve = Math.max(0, Math.min(quantity, componentAvailable));
  const shortfall = quantity - componentReserve;
  if (shortfall <= 0) return null;

  const parentAvailable =
    getProductLocationAvailability(parent, locationCode, inventoryByProduct).available +
    getOwnReservedAtLocation(parent, locationCode, ownReservedSnapshot);

  const wanted = Math.ceil(shortfall / perParent);
  const lockQty = Math.max(0, Math.min(wanted, Math.floor(parentAvailable)));
  if (lockQty === 0) return null;

  const covered = lockQty * perParent;
  const residual = Math.max(0, shortfall - covered);

  return {
    componentQty: componentReserve + residual,
    parentLock: { product: parent, unit: getItemBaseUnit(parent), quantity: lockQty },
    remainder: Math.max(0, covered - shortfall),
    residual,
  };
}

export function planLineBreakdown(inputs: {
  readonly line: SalesOrderItem;
  readonly productsByCode: Map<string, Product>;
  readonly inventoryByProduct: Map<string, ProductInventoryRow[]>;
  readonly parentIndex: Map<string, BreakdownParentLink[]>;
  readonly ownReservedSnapshot?: readonly InventoryLinkageSnapshotEntry[];
}): BreakdownCoverage | null {
  const { line, productsByCode, inventoryByProduct, parentIndex, ownReservedSnapshot } = inputs;
  if (!line.productCode || parentIndex.size === 0) return null;

  if (line.role) return null;
  const component = productsByCode.get(line.productCode);
  if (!component) return null;
  return planBreakdownCoverage({
    component,
    quantity: getLinePhysicalQuantity(line),
    unit: line.unit,
    locationCode: line.fromLocationCode || DEFAULT_LOCATION_CODE,
    parentIndex,
    inventoryByProduct,
    ownReservedSnapshot,
  });
}

export function breakdownRowKey(itemCode: string, locationCode: string): string {
  return `${itemCode}@${isDefaultLocation(locationCode) ? DEFAULT_LOCATION_CODE : locationCode}`;
}

export function collectBreakdownRemainders(inputs: {
  readonly items: readonly SalesOrderItem[];
  readonly productsByCode: Map<string, Product>;
  readonly inventoryByProduct: Map<string, ProductInventoryRow[]>;
  readonly ownReservedSnapshot?: readonly InventoryLinkageSnapshotEntry[];
}): Map<string, BreakdownRemainderCredit[]> {
  const { items, productsByCode, inventoryByProduct, ownReservedSnapshot } = inputs;
  const parentIndex = buildBreakdownParentIndex(productsByCode.values());
  const out = new Map<string, BreakdownRemainderCredit[]>();
  if (parentIndex.size === 0) return out;

  for (const line of items) {
    const coverage = planLineBreakdown({
      line,
      productsByCode,
      inventoryByProduct,
      parentIndex,
      ownReservedSnapshot,
    });
    if (!coverage?.parentLock || coverage.remainder <= 0) continue;
    const key = breakdownRowKey(
      coverage.parentLock.product.code,
      line.fromLocationCode || DEFAULT_LOCATION_CODE,
    );
    const credit: BreakdownRemainderCredit = {
      itemCode: line.productCode,
      unit: line.unit,
      quantity: coverage.remainder,
    };

    const bucket = out.get(key);
    if (!bucket) {
      out.set(key, [credit]);
      continue;
    }
    const same = bucket.find((c) => c.itemCode === credit.itemCode && c.unit === credit.unit);
    if (same) same.quantity += credit.quantity;
    else bucket.push(credit);
  }
  return out;
}
