import { Select, type SelectProps } from '@mantine/core';
import { useMemo } from 'react';
import { useProductStore } from '@/stores/useProductStore';
import type { Product } from '@/types';
import { PRODUCT_SELECTOR_PRIMARY_NAMES_ONLY } from '@/config/productDisplayDefaults';
import {
  isSelectable,
  toOptions,
  withSelectedProduct,
  type Option,
} from './productSelectorOptions';

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

const noExtraFilter = () => true;

export function ProductSelector({
  code,
  name,
  onChange,
  filter = noExtraFilter,
  searchable = true,
  ...rest
}: ProductSelectorProps) {
  const products = useProductStore((s) => s.items);

  const selectable = useMemo<Option[]>(
    () =>
      products
        .filter((p) => isSelectable(p) && filter(p))
        .flatMap((p) => toOptions(p, PRODUCT_SELECTOR_PRIMARY_NAMES_ONLY)),
    [products, filter],
  );

  const options = useMemo<Option[]>(
    () => withSelectedProduct(selectable, products, code, PRODUCT_SELECTOR_PRIMARY_NAMES_ONLY),
    [selectable, products, code],
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
