

import { cStorageConnector } from '@credo/connectors/connector';
import { generateId, randomString } from '@credo/kits/string';
import { loadIndustry, type IndustryName } from '../../../scripts/faker/industry';
import type { Product, ProductExtra } from '@/types/product';
import { findProductUnitIssues } from '@/utils/unitIntegrity';
import {
  configureSeedConnectors,
  pick,
  pickN,
  randomInt,
  writeEntityEnvelope,
} from './_sharedSeed';
import type { FakeDataSecrets } from './fakeDataSecrets';

export class ManualProductUnitError extends Error {
  constructor(readonly lines: string[]) {
    super(`Unrecognized unit(s) in JSON input:\n${lines.join('\n')}`);
    this.name = 'ManualProductUnitError';
  }
}

export type SeedProductsOptions = {
  clientCode: string;
  industry: IndustryName;
  count: number;
  secrets: FakeDataSecrets;
  
  items?: ManualProductInput[];
  onLog?: (line: string) => void;
};

export type SeedProductsResult = {
  generated: number;
};

export type ManualProductInput = {
  name?: string;
  code?: string;
  description?: string;
  
  unit?: string;
  
  units?: string[];
  unitConversions?: { unit: string; quantity: number; baseUnit: string }[];
  alternativeNames?: string[];
  category?: string;
  tags?: string[];
  sku?: string;
  barcode?: string;
  price?: number;
  basePrice?: number;
  
  minStock?: number;
  
  attributes?: Array<{ key: string; value: string }>;
  
  techSpecs?: Array<{ key: string; value: string }>;
  
  
  extra?: Partial<ProductExtra>;
};

type SpecGen = { key: string; gen: () => string };

const FOOD_TECH_SPECS: SpecGen[] = [
  { key: 'Khối lượng tịnh', gen: () => `${randomInt(50, 500)}g` },
  { key: 'Hạn sử dụng', gen: () => `${randomInt(6, 24)} tháng` },
  { key: 'Xuất xứ', gen: () => pick(['Việt Nam', 'Nhật Bản', 'Hàn Quốc', 'Thái Lan']) },
  { key: 'Bảo quản', gen: () => 'Nơi khô ráo, thoáng mát' },
  { key: 'Calo', gen: () => `${randomInt(100, 500)} kcal` },
];

const FOOD_ATTRIBUTES: SpecGen[] = [
  { key: 'Hương vị', gen: () => pick(['Cay', 'Ngọt', 'Mặn', 'Đậm đà', 'Truyền thống']) },
  { key: 'Màu sắc', gen: () => pick(['Đỏ', 'Vàng', 'Xanh', 'Nâu', 'Trắng']) },
  { key: 'Kích thước', gen: () => pick(['Nhỏ', 'Vừa', 'Lớn']) },
];

const MECHANICAL_TECH_SPECS: SpecGen[] = [
  { key: 'Material', gen: () => pick(['Steel', 'Aluminum', 'Brass', 'Stainless Steel']) },
  { key: 'Weight', gen: () => `${randomInt(100, 5000)}g` },
  { key: 'Voltage', gen: () => pick(['12V', '24V', '110V', '220V']) },
  { key: 'Power', gen: () => `${randomInt(50, 5000)}W` },
  { key: 'Origin', gen: () => pick(['Vietnam', 'China', 'Germany', 'Japan']) },
];

const MECHANICAL_ATTRIBUTES: SpecGen[] = [
  { key: 'Color', gen: () => pick(['Black', 'Silver', 'White', 'Red']) },
  { key: 'Finish', gen: () => pick(['Matte', 'Glossy', 'Brushed']) },
];

function getSpecPools(industry: IndustryName) {
  return industry === 'mechanical'
    ? { techSpecs: MECHANICAL_TECH_SPECS, attributes: MECHANICAL_ATTRIBUTES }
    : { techSpecs: FOOD_TECH_SPECS, attributes: FOOD_ATTRIBUTES };
}

function generateRows(pool: SpecGen[], min: number, max: number) {
  return pickN(pool, min, Math.min(max, pool.length)).map(({ key, gen }) => ({
    key,
    value: gen(),
  }));
}

type ProductRecord = {
  id: string;
  name: string;
  code: string;
  description: string;
  unit: string;
  price: number;
  isActive: boolean;
  extra: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

function randomBarcode(clientCode: string): string {
  const rnd = Math.floor(Math.random() * 1_000_000).toString();
  const time = Date.now().toString(36).toUpperCase();
  return `${clientCode.toUpperCase()}-${rnd.toString().padStart(6, '0')}-${time}`;
}

function generateProducts(
  industry: IndustryName,
  count: number,
  clientCode: string,
): ProductRecord[] {
  const { products } = loadIndustry(industry);
  const now = new Date().toISOString();
  const nowMs = Date.now();
  const seedStamp = `v_${nowMs.toString(36)}`;
  const limit = Math.min(count, products.length);
  const pools = getSpecPools(industry);

  return products.slice(0, limit).map((source): ProductRecord => {
    const sku = `SKU-${randomString(6, false).toUpperCase()}`;
    const tags =
      source.tags ?? (Math.random() < 0.3 ? [pick(['NEW', 'BEST_SELLER', 'PROMO'])] : []);
    const primaryUnit = source.units[0]!;
    const basePrice = Math.round((source.price * (0.5 + Math.random() * 0.25)) / 100) * 100;

    
    
    
    const techSpecs = generateRows(pools.techSpecs, 2, 4);
    const attributes = Math.random() < 0.6 ? generateRows(pools.attributes, 1, 2) : [];

    const extra: Record<string, unknown> = {
      units: source.units,
      unitConversions: source.unitConversions,
      sku,
      barcode: randomBarcode(clientCode),
      basePrice,
      category: source.category,
      ...(tags.length > 0 && { tags }),
      ...(source.image && { images: [{ url: source.image }] }),
      ...(techSpecs.length > 0 && { techSpecs }),
      ...(attributes.length > 0 && { attributes }),
      minimumInventory: {
        value: randomInt(20, 200),
        unit: primaryUnit,
        configBy: 'system' as const,
        updatedAt: nowMs,
        updatedBy: 'system',
      },
      seedVersion: seedStamp,
    };

    return {
      id: generateId(),
      name: source.name,
      code: source.code,
      description: '',
      unit: primaryUnit,
      price: source.price,
      isActive: true,
      extra,
      createdAt: now,
      updatedAt: now,
    };
  });
}

function buildProductsFromManualInput(
  rows: ManualProductInput[],
  _clientCode: string,
): ProductRecord[] {
  const now = new Date().toISOString();
  const nowMs = Date.now();
  const seedStamp = `v_${nowMs.toString(36)}`;

  return rows.map((row, index): ProductRecord => {
    const code = row.code?.trim() || `PRD-${String(index + 1).padStart(4, '0')}`;
    const name = row.name?.trim() || code;
    const inputExtra: Partial<ProductExtra> = row.extra ?? {};

    
    const units =
      inputExtra.units && inputExtra.units.length > 0
        ? inputExtra.units
        : row.units && row.units.length > 0
          ? row.units
          : ['pcs'];
    
    const primaryUnit = row.unit?.trim() || units[0]!;
    const minStock = typeof row.minStock === 'number' && row.minStock > 0 ? row.minStock : null;

    
    
    
    const cleanRows = (rows?: Array<{ key: string; value: string }>) =>
      (rows ?? [])
        .map((r) => ({ key: r.key?.trim() ?? '', value: r.value?.trim() ?? '' }))
        .filter((r) => r.key && r.value);
    const attributes = cleanRows(row.attributes);
    const techSpecs = cleanRows(row.techSpecs);

    
    
    
    const legacyExtra: Record<string, unknown> = {};
    if (row.unitConversions && row.unitConversions.length > 0) {
      legacyExtra.unitConversions = row.unitConversions;
    }
    if (row.alternativeNames && row.alternativeNames.length > 0) {
      legacyExtra.alternativeNames = row.alternativeNames;
    }
    if (row.sku) legacyExtra.sku = row.sku;
    if (row.barcode) legacyExtra.barcode = row.barcode;
    if (typeof row.basePrice === 'number') legacyExtra.basePrice = row.basePrice;
    if (row.category) legacyExtra.category = row.category;
    if (row.tags && row.tags.length > 0) legacyExtra.tags = row.tags;
    if (attributes.length > 0) legacyExtra.attributes = attributes;
    if (techSpecs.length > 0) legacyExtra.techSpecs = techSpecs;
    if (minStock !== null) {
      legacyExtra.minimumInventory = {
        value: minStock,
        unit: primaryUnit,
        configBy: 'system' as const,
        updatedAt: nowMs,
        updatedBy: 'system',
      };
    }

    const extra: Record<string, unknown> = {
      ...legacyExtra,
      ...inputExtra,
      
      units,
      seedVersion: seedStamp,
    };

    
    
    
    const mi = extra.minimumInventory as Partial<ProductExtra['minimumInventory']> | undefined;
    if (mi && typeof mi.value === 'number') {
      extra.minimumInventory = {
        value: mi.value,
        unit: mi.unit ?? primaryUnit,
        configBy: mi.configBy ?? ('system' as const),
        updatedAt: mi.updatedAt ?? nowMs,
        updatedBy: mi.updatedBy ?? 'system',
      };
    }

    return {
      id: generateId(),
      name,
      code,
      description: row.description ?? '',
      unit: primaryUnit,
      price: row.price ?? 0,
      isActive: true,
      extra,
      createdAt: now,
      updatedAt: now,
    };
  });
}

async function fetchUnitLookups(
  clientCode: string,
  storageServiceCode: string,
  log: (line: string) => void,
): Promise<Map<string, string> | null> {
  const key = `lookups.${clientCode}`;
  try {
    const res = await cStorageConnector.getRecordByKey<{
      items?: Array<{ category?: string; value?: string; label?: string }>;
    }>({ serviceCode: storageServiceCode, key });
    const rows = res?.record?.data?.items ?? [];
    const map = new Map<string, string>();
    for (const l of rows) {
      if (l?.category !== 'unit' || !l.value) continue;
      map.set(l.value, l.label ?? l.value);
    }
    if (map.size === 0) {
      log(`No 'unit' lookups under ${key} — skipping unit validation.`);
      return null;
    }
    return map;
  } catch (err) {
    log(`Could not read ${key} (${(err as Error).message}) — skipping unit validation.`);
    return null;
  }
}

function assertManualUnitsAreValues(
  items: ProductRecord[],
  unitLabels: Map<string, string>,
  log: (line: string) => void,
): void {
  const report = findProductUnitIssues(items as unknown as Product[], unitLabels);
  if (report.products.length === 0) {
    log(
      `Unit validation passed (${report.scanned} row(s) against ${unitLabels.size} unit lookup(s)).`,
    );
    return;
  }
  const lines = report.products.flatMap((p) =>
    p.issues.map(
      (i) =>
        `  ${p.code} — ${i.path} = "${i.value}"` +
        (i.suggestedValue
          ? ` → did you mean "${i.suggestedValue}"? (that's the label, not the value)`
          : ` (no matching unit lookup — add it under Lookups first)`),
    ),
  );
  log(`Unit validation FAILED — ${report.products.length} row(s) rejected. Nothing was written.`);
  for (const l of lines) log(l);
  throw new ManualProductUnitError(lines);
}

export async function seedFakeProducts(opts: SeedProductsOptions): Promise<SeedProductsResult> {
  const { clientCode, industry, count, secrets, items: manualItems, onLog } = opts;
  const log = onLog ?? (() => {});

  configureSeedConnectors(secrets, clientCode);

  let items: ProductRecord[];
  if (manualItems) {
    log(`Source: JSON input (${manualItems.length} rows)`);
    items = buildProductsFromManualInput(manualItems, clientCode);
    
    
    const unitLabels = await fetchUnitLookups(clientCode, secrets.storageServiceCode, log);
    if (unitLabels) assertManualUnitsAreValues(items, unitLabels, log);
  } else {
    const { products } = loadIndustry(industry);
    log(`Industry: ${industry} | Source pool: ${products.length} products`);
    items = generateProducts(industry, count, clientCode);
    log(`Generating ${items.length} product(s) (requested ${count})...`);
  }

  await writeEntityEnvelope({
    clientCode,
    storageServiceCode: secrets.storageServiceCode,
    entityKey: 'products',
    items,
    log,
  });

  log(`Done — wrote ${items.length} product(s).`);
  return { generated: items.length };
}
