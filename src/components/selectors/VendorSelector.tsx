import { Select, type SelectProps } from '@mantine/core';
import { useMemo } from 'react';
import { useVendorStore } from '@/stores/useVendorStore';
import type { Vendor } from '@/types';

export type VendorSelectorChange = {
  code: string;

  name: string;
  vendor: Vendor;
};

export type VendorSelectorProps = Omit<SelectProps, 'data' | 'value' | 'onChange' | 'filter'> & {
  value: string | null;
  onChange: (selection: VendorSelectorChange | null) => void;

  filter?: (v: Vendor) => boolean;
};

const defaultFilter = (v: Vendor) => !v.extra?.isDeleted;
const displayNameOf = (v: Vendor) => v.extra?.shortName?.trim() || v.name;

export function VendorSelector({
  value,
  onChange,
  filter = defaultFilter,
  searchable = true,
  ...rest
}: VendorSelectorProps) {
  const vendors = useVendorStore((s) => s.items);

  const data = useMemo(
    () =>
      vendors.filter(filter).map((v) => ({
        value: v.code,
        label: displayNameOf(v),
      })),
    [vendors, filter],
  );

  const vendorMap = useMemo(() => {
    const m = new Map<string, Vendor>();
    for (const v of vendors) m.set(v.code, v);
    return m;
  }, [vendors]);

  return (
    <Select
      {...rest}
      data={data}
      searchable={searchable}
      value={value || null}
      onChange={(code) => {
        if (!code) {
          onChange(null);
          return;
        }
        const v = vendorMap.get(code);
        if (!v) {
          onChange(null);
          return;
        }
        onChange({ code: v.code, name: displayNameOf(v), vendor: v });
      }}
    />
  );
}
