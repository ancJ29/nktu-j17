import type { Product } from '@/types';

export type Option = {
  value: string;
  label: string;
  code: string;
  name: string;
  units: string[];
  sku?: string;
  product: Product;
};

export const isSelectable = (p: Product) => p.isActive && !p.extra?.isDeleted;

export function toOptions(p: Product, primaryNamesOnly: boolean): Option[] {
  const sku = p.extra?.sku?.trim() ?? '';
  const units = p.extra?.units?.length ? p.extra.units : p.unit ? [p.unit] : [];
  const alts = primaryNamesOnly ? [] : (p.extra?.alternativeNames?.filter((n) => n?.trim()) ?? []);
  return [p.name, ...alts].map((variantName, nameIdx) => ({
    value: `${p.code}__${nameIdx}`,
    label: sku ? `${variantName} · ${sku}` : variantName,
    code: p.code,
    name: variantName,
    units,
    sku: sku || undefined,
    product: p,
  }));
}

export function withSelectedProduct(
  selectable: readonly Option[],
  products: readonly Product[],
  code: string | null,
  primaryNamesOnly: boolean,
): Option[] {
  if (!code || selectable.some((o) => o.code === code)) return selectable as Option[];
  const missing = products.find((p) => p.code === code);
  return missing
    ? [...selectable, ...toOptions(missing, primaryNamesOnly)]
    : (selectable as Option[]);
}
