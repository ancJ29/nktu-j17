

import { generateId, newVersion } from '@credo/kits/string';
import { cMngtConnector, cStorageConnector } from '@credo/connectors/connector';
import { recomputeOnHand } from '@/utils/inventoryMath';
import type { ProductInventoryExtra, ProductInventoryRow } from '@/types';
import type { Product } from '@/types/product';
import { configureSeedConnectors, pick, randomInt } from './_sharedSeed';
import type { FakeDataSecrets } from './fakeDataSecrets';

export type SeedProductInventoryOptions = {
  clientCode: string;
  count: number;
  
  maxQty: number;
  
  multiUnitSplit: boolean;
  secrets: FakeDataSecrets;
  onLog?: (line: string) => void;
};

export type SeedProductInventoryResult = {
  generated: number;
  productsCovered: number;
  locationsCovered: number;
  withMultiUnitSplit: number;
};

type FetchedLocation = { code: string; name: string };

const ROW_NOTES = [
  '',
  '',
  '',
  '',
  
  'Tồn ban đầu',
  'Kiểm kê tháng',
  'Đếm lại sau nhập',
  // cspell:enable
];

async function fetchProductsAndLocations(): Promise<{
  products: Product[];
  locations: FetchedLocation[];
}> {
  const [pRes, lRes] = await Promise.all([
    cMngtConnector.getAllProducts<ProductInventoryExtra>().catch(() => null),
    cMngtConnector.getAllLocations().catch(() => null),
  ]);

  const products: Product[] =
    pRes && pRes.changed ? (pRes.products as Product[]).filter((p) => p.isActive) : [];
  const locations: FetchedLocation[] =
    lRes && lRes.changed
      ? lRes.locations.filter((l) => l.isActive).map((l) => ({ code: l.code, name: l.name }))
      : [];

  return { products, locations };
}

async function fetchEmployeeIds(): Promise<string[]> {
  const res = await cMngtConnector.getAllEmployees().catch(() => null);
  if (!res || !res.changed) return [];
  return res.employees.filter((e) => e.isActive).map((e) => e.id);
}

function samplePairs(
  productCount: number,
  locationCount: number,
  count: number,
): [number, number][] {
  const total = productCount * locationCount;
  const target = Math.min(count, total);
  const used = new Set<number>();
  const out: [number, number][] = [];
  while (out.length < target) {
    const idx = Math.floor(Math.random() * total);
    if (used.has(idx)) continue;
    used.add(idx);
    out.push([Math.floor(idx / locationCount), idx % locationCount]);
  }
  return out;
}

function buildOnHandByUnit(
  product: Product,
  baseUnit: string,
  maxQty: number,
  multiUnitSplit: boolean,
): { onHandByUnit: Record<string, number>; split: boolean } {
  const baseQty = randomInt(0, Math.max(0, maxQty));
  const onHandByUnit: Record<string, number> = {};
  if (baseQty > 0) onHandByUnit[baseUnit] = baseQty;

  if (!multiUnitSplit) return { onHandByUnit, split: false };

  
  const conversions = product.extra?.unitConversions ?? [];
  const reachable = conversions
    .map((c) => c.unit)
    .filter((u, i, arr) => u !== baseUnit && arr.indexOf(u) === i);
  if (reachable.length === 0) return { onHandByUnit, split: false };

  const altUnit = pick(reachable);
  const altQty = randomInt(1, 10);
  onHandByUnit[altUnit] = (onHandByUnit[altUnit] ?? 0) + altQty;
  return { onHandByUnit, split: true };
}

export async function seedFakeProductInventory(
  opts: SeedProductInventoryOptions,
): Promise<SeedProductInventoryResult> {
  const { clientCode, count, maxQty, multiUnitSplit, secrets, onLog } = opts;
  const log = onLog ?? (() => {});

  configureSeedConnectors(secrets, clientCode);

  log('Fetching products, locations, and employees from BFF...');
  const [{ products, locations }, employeeIds] = await Promise.all([
    fetchProductsAndLocations(),
    fetchEmployeeIds(),
  ]);
  if (products.length === 0) {
    throw new Error(
      'No active products found — seed or create products before generating inventory.',
    );
  }
  if (locations.length === 0) {
    throw new Error(
      'No active locations found — seed or create at least one location (the BFF auto-seeds DEFAULT on first read).',
    );
  }
  log(
    `Products: ${products.length} | Locations: ${locations.length} | Authors pool: ${employeeIds.length} employee(s)`,
  );

  const pairs = samplePairs(products.length, locations.length, count);
  log(
    `Sampling ${pairs.length} unique (product, location) pair(s) (cap ${products.length * locations.length}).`,
  );

  const now = new Date().toISOString();
  const productsCovered = new Set<string>();
  const locationsCovered = new Set<string>();
  let withMultiUnitSplit = 0;

  const items: ProductInventoryRow[] = pairs.map(([pi, li]) => {
    const product = products[pi]!;
    const location = locations[li]!;
    const baseUnit = product.extra?.units?.[0] ?? product.unit;
    const { onHandByUnit, split } = buildOnHandByUnit(product, baseUnit, maxQty, multiUnitSplit);
    if (split) withMultiUnitSplit += 1;
    const onHand = recomputeOnHand(product, onHandByUnit);

    productsCovered.add(product.code);
    locationsCovered.add(location.code);

    const extra: ProductInventoryExtra = {
      unit: baseUnit,
      onHandByUnit,
      ...(Math.random() < 0.25 && { lastNote: pick(ROW_NOTES) }),
      ...(employeeIds.length > 0 && { lastUpdatedBy: pick(employeeIds) }),
    };

    return {
      id: generateId(),
      itemCode: product.code,
      locationCode: location.code,
      onHand,
      extra,
      createdAt: now,
      updatedAt: now,
      version: newVersion(),
    };
  });

  log(
    `Writing product-inventory.${clientCode} (${items.length} record(s); multi-unit split: ${withMultiUnitSplit}).`,
  );
  const envelope = {
    items,
    meta: {
      updatedAt: new Date().toISOString(),
      version: 1,
      hash: Date.now().toString(36),
    },
  };
  await cStorageConnector.pushRecord({
    serviceCode: secrets.storageServiceCode,
    key: `product-inventory.${clientCode}`,
    data: envelope,
    isPrivate: undefined,
    description: undefined,
  });

  log(
    `Done — wrote ${items.length} row(s) covering ${productsCovered.size} product(s) × ${locationsCovered.size} location(s).`,
  );

  return {
    generated: items.length,
    productsCovered: productsCovered.size,
    locationsCovered: locationsCovered.size,
    withMultiUnitSplit,
  };
}
