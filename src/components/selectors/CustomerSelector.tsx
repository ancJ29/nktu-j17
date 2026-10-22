import { Select, type SelectProps } from '@mantine/core';
import { useMemo } from 'react';
import { useCustomerStore } from '@/stores/useCustomerStore';
import type { Customer } from '@/types';

export type CustomerSelectorChange = {
  id: string;
  
  name: string;
  customer: Customer;
};

export type CustomerSelectorProps = Omit<SelectProps, 'data' | 'value' | 'onChange' | 'filter'> & {
  value: string | null;
  onChange: (selection: CustomerSelectorChange | null) => void;
  
  filter?: (c: Customer) => boolean;
};

const defaultFilter = (c: Customer) => c.isActive && !c.extra?.isDeleted;
const displayNameOf = (c: Customer) => c.extra?.shortName?.trim() || c.name;

export function CustomerSelector({
  value,
  onChange,
  filter = defaultFilter,
  searchable = true,
  ...rest
}: CustomerSelectorProps) {
  const customers = useCustomerStore((s) => s.items);

  
  
  const data = useMemo(
    () =>
      customers.filter(filter).map((c) => ({
        value: c.id,
        label: displayNameOf(c),
      })),
    [customers, filter],
  );

  const customerMap = useMemo(() => {
    const m = new Map<string, Customer>();
    for (const c of customers) m.set(c.id, c);
    return m;
  }, [customers]);

  return (
    <Select
      {...rest}
      data={data}
      searchable={searchable}
      value={value || null}
      onChange={(id) => {
        if (!id) {
          onChange(null);
          return;
        }
        const c = customerMap.get(id);
        if (!c) {
          onChange(null);
          return;
        }
        onChange({ id: c.id, name: displayNameOf(c), customer: c });
      }}
    />
  );
}
