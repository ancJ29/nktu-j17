import { Select, type SelectProps } from '@mantine/core';
import { useMemo } from 'react';
import { useProductStore } from '@/stores/useProductStore';
import type { Product } from '@/types';
import { PRODUCT_SELECTOR_PRIMARY_NAMES_ONLY } from '@/config/productDisplayDefaults';

export type ProductSelectorChange = {
  code: string;

  name: string;

  units: string[];
  sku?: string;
  product: Product;
};

export type ProductSelectorProps = Omit<
  SelectProps,
  'data' | 'value' | 'onChange' | 'filter' | 'name'
> & {
  code: string | null;

  name?: string | null;
  onChange: (selection: ProductSelectorChange | null) => void;

  filter?: (p: Product) => boolean;
};

const defaultFilter = (p: Product) => !p.extra?.isDeleted;

type Option = {
  value: string;
  label: string;
  code: string;
  name: string;
  units: string[];
  sku?: string;
  product: Product;
};

const noAlternativeNames = PRODUCT_SELECTOR_PRIMARY_NAMES_ONLY;

export function ProductSelector({
  code,
  name,
  onChange,
  filter = defaultFilter,
  searchable = true,
  ...rest
}: ProductSelectorProps) {
  const products = useProductStore((s) => s.items);

  const options = useMemo<Option[]>(
    () =>
      products.filter(filter).flatMap((p) => {
        const sku = p.extra?.sku?.trim() ?? '';
        const units = p.extra?.units?.length ? p.extra.units : p.unit ? [p.unit] : [];
        const alts = noAlternativeNames
          ? []
          : (p.extra?.alternativeNames?.filter((n) => n?.trim()) ?? []);
        const names = [p.name, ...alts];
        return names.map((variantName, nameIdx) => ({
          value: `${p.code}__${nameIdx}`,
          label: sku ? `${variantName} · ${sku}` : variantName,
          code: p.code,
          name: variantName,
          units,
          sku: sku || undefined,
          product: p,
        }));
      }),
    [products, filter],
  );

  const optionMap = useMemo(() => {
    const m = new Map<string, Option>();
    for (const o of options) m.set(o.value, o);
    return m;
  }, [options]);

  const selectedValue = useMemo(() => {
    if (!code) return null;
    const exact = options.find((o) => o.code === code && o.name === name);
    if (exact) return exact.value;
    const fallback = options.find((o) => o.code === code);
    return fallback?.value ?? null;
  }, [options, code, name]);

  return (
    <Select
      {...rest}
      data={options}
      searchable={searchable}
      value={selectedValue}
      onChange={(v) => {
        if (!v) {
          onChange(null);
          return;
        }
        const opt = optionMap.get(v);
        if (!opt) {
          onChange(null);
          return;
        }
        onChange({
          code: opt.code,
          name: opt.name,
          units: opt.units,
          sku: opt.sku,
          product: opt.product,
        });
      }}
    />
  );
}
