

import type { Product } from '@/types';

export type UnitIssue = {
  
  readonly path: string;
  
  readonly value: string;
  
  readonly suggestedValue?: string;
};

export type ProductUnitIssues = {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly issues: readonly UnitIssue[];
};

export type UnitIntegrityReport = {
  
  readonly products: readonly ProductUnitIssues[];
  
  readonly scanned: number;
  
  readonly distinctValues: ReadonlyArray<{
    readonly value: string;
    readonly suggestedValue?: string;
    readonly productCount: number;
  }>;
};

export function findProductUnitIssues(
  products: ReadonlyArray<Product>,
  unitLabels: ReadonlyMap<string, string>,
): UnitIntegrityReport {
  
  
  
  const labelToValue = new Map<string, string>();
  const ambiguous = new Set<string>();
  for (const [value, label] of unitLabels) {
    const key = label.trim().toLowerCase();
    if (!key) continue;
    if (labelToValue.has(key) && labelToValue.get(key) !== value) ambiguous.add(key);
    labelToValue.set(key, value);
  }
  for (const key of ambiguous) labelToValue.delete(key);

  const suggest = (value: string): string | undefined =>
    labelToValue.get(value.trim().toLowerCase());

  const out: ProductUnitIssues[] = [];
  let scanned = 0;

  for (const p of products) {
    if (p.extra?.isDeleted) continue;
    scanned++;

    const issues: UnitIssue[] = [];
    const check = (path: string, raw: string | undefined) => {
      const value = raw?.trim();
      
      
      if (!value) return;
      if (unitLabels.has(value)) return;
      const suggestedValue = suggest(value);
      issues.push({ path, value, ...(suggestedValue && { suggestedValue }) });
    };

    const e = p.extra ?? {};
    check('unit', p.unit);
    (e.units ?? []).forEach((u, i) => check(`extra.units[${i}]`, u));
    check('extra.minimumInventory.unit', e.minimumInventory?.unit);
    
    
    
    (e.unitConversions ?? []).forEach((c, i) => {
      check(`extra.unitConversions[${i}].unit`, c.unit);
      check(`extra.unitConversions[${i}].baseUnit`, c.baseUnit);
    });
    (e.setItems ?? []).forEach((s, i) => check(`extra.setItems[${i}].unit`, s.unit));

    if (issues.length > 0) {
      out.push({ id: p.id, code: p.code, name: p.name, issues });
    }
  }

  
  const byValue = new Map<string, { suggestedValue?: string; products: Set<string> }>();
  for (const p of out) {
    for (const i of p.issues) {
      const entry = byValue.get(i.value) ?? {
        suggestedValue: i.suggestedValue,
        products: new Set(),
      };
      entry.products.add(p.id);
      byValue.set(i.value, entry);
    }
  }
  const distinctValues = Array.from(byValue, ([value, v]) => ({
    value,
    ...(v.suggestedValue && { suggestedValue: v.suggestedValue }),
    productCount: v.products.size,
  })).sort((a, b) => b.productCount - a.productCount || a.value.localeCompare(b.value));

  return { products: out, scanned, distinctValues };
}
