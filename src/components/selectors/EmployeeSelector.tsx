import { Select, type SelectProps } from '@mantine/core';
import { useMemo } from 'react';
import { useEmployeeStore } from '@/stores/useEmployeeStore';
import type { Employee } from '@/types';

export type EmployeeSelectorChange = {
  id: string;
  name: string;
  employee: Employee;
};

export type EmployeeSelectorProps = Omit<SelectProps, 'data' | 'value' | 'onChange' | 'filter'> & {
  value: string | null;
  onChange: (selection: EmployeeSelectorChange | null) => void;

  filter?: (e: Employee) => boolean;
};

const defaultFilter = (e: Employee) => e.isActive && !e.extra?.isDeleted;

export function EmployeeSelector({
  value,
  onChange,
  filter = defaultFilter,
  searchable = true,
  ...rest
}: EmployeeSelectorProps) {
  const employees = useEmployeeStore((s) => s.items);

  const data = useMemo(() => {
    const filtered = employees.filter(filter);

    if (value && !filtered.some((e) => e.id === value)) {
      const current = employees.find((e) => e.id === value);
      if (current) filtered.push(current);
    }
    return filtered.map((e) => ({
      value: e.id,
      label: e.name,
    }));
  }, [employees, filter, value]);

  const employeeMap = useMemo(() => {
    const m = new Map<string, Employee>();
    for (const e of employees) m.set(e.id, e);
    return m;
  }, [employees]);

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
        const emp = employeeMap.get(id);
        if (!emp) {
          onChange(null);
          return;
        }
        onChange({ id: emp.id, name: emp.name, employee: emp });
      }}
    />
  );
}
