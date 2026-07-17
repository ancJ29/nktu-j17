

import { generateId } from '@credo/kits/string';
import { loadIndustry, type IndustryName } from '../../../scripts/faker/industry';
import { configureSeedConnectors, pad, writeEntityEnvelope } from './_sharedSeed';
import type { FakeDataSecrets } from './fakeDataSecrets';

export type ManualLookupInput = {
  category: string;
  value: string;
  label?: string;
  sortOrder?: number;
};

export type SeedLookupsOptions = {
  clientCode: string;
  industry: IndustryName;
  secrets: FakeDataSecrets;
  
  items?: ManualLookupInput[];
  onLog?: (line: string) => void;
};

export type SeedLookupsResult = {
  generated: number;
  byCategory: Record<string, number>;
};

type LookupRecord = {
  id: string;
  category: string;
  value: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
  extra: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

function slugify(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

type Pair = { category: string; value: string; label: string; sortOrder: number };

function buildRecords(pairs: Pair[]): LookupRecord[] {
  const now = new Date().toISOString();
  return pairs.map((p) => ({
    id: generateId(),
    category: p.category,
    value: p.value,
    label: p.label,
    sortOrder: p.sortOrder,
    isActive: true,
    extra: {},
    createdAt: now,
    updatedAt: now,
  }));
}

function generateFromIndustry(industry: IndustryName): LookupRecord[] {
  const { lookups } = loadIndustry(industry);
  const pairs: Pair[] = [];

  const register = (category: string, pool: { value: string; label: string }[]): void => {
    pool.forEach((lk, i) =>
      pairs.push({ category, value: lk.value, label: lk.label, sortOrder: (i + 1) * 10 }),
    );
  };

  register('product-category', lookups.productCategory);
  register('material-category', lookups.materialCategory);
  register('unit', lookups.unit);
  
  
  register('material-unit', lookups.materialUnit ?? []);
  register('product-tag', lookups.productTag);

  return buildRecords(pairs);
}

function buildFromManualInput(rows: ManualLookupInput[]): LookupRecord[] {
  const byCategory = new Map<string, number>();
  const now = new Date().toISOString();

  return rows.map((row) => {
    const category = row.category.trim();
    const idx = (byCategory.get(category) ?? 0) + 1;
    byCategory.set(category, idx);
    const sortOrder = row.sortOrder ?? idx * 10;
    const label = (row.label ?? row.value).trim();
    const value = row.value.trim() || slugify(label) || `auto-${pad(idx, 4)}`;
    return {
      id: generateId(),
      category,
      value,
      label,
      sortOrder,
      isActive: true,
      extra: {},
      createdAt: now,
      updatedAt: now,
    };
  });
}

function tally(items: LookupRecord[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const it of items) out[it.category] = (out[it.category] ?? 0) + 1;
  return out;
}

export async function seedFakeLookups(opts: SeedLookupsOptions): Promise<SeedLookupsResult> {
  const { clientCode, industry, secrets, items: manualItems, onLog } = opts;
  const log = (line: string) => onLog?.(line);

  configureSeedConnectors(secrets, clientCode);

  const sourceLabel = manualItems
    ? `JSON input (${manualItems.length} rows)`
    : `industry=${industry}`;
  log(`Scope: ${clientCode} | Source: ${sourceLabel}`);

  let items: LookupRecord[];
  if (manualItems) {
    log(`Building ${manualItems.length} lookup row(s) from JSON input...`);
    items = buildFromManualInput(manualItems);
    
    
    items.forEach((item) => {
      item.value = item.value.toUpperCase();
    });
  } else {
    log(`Generating curated lookups from industry "${industry}" JSON...`);
    items = generateFromIndustry(industry);
  }

  await writeEntityEnvelope({
    clientCode,
    storageServiceCode: secrets.storageServiceCode,
    entityKey: 'lookups',
    items,
    log,
  });

  const byCategory = tally(items);
  log(`Wrote ${items.length} lookup(s): ${JSON.stringify(byCategory)}`);

  return { generated: items.length, byCategory };
}
