import { Select, TextInput } from '@mantine/core';
import { DateField } from '@/components/DateField';
import type { ViewerCustomField } from '@/utils/customFields';

export function CustomFieldInput({
  field,
  value,
  onChange,
  error,
}: {
  readonly field: ViewerCustomField;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly error?: string | undefined;
}) {
  const shared = {
    label: field.label,
    disabled: !field.editable,
    error,
  };
  if (field.type === 'select') {
    return (
      <Select
        {...shared}
        data={field.options ?? []}
        value={value === '' ? null : value}
        onChange={(next) => onChange(next ?? '')}
        clearable
        searchable
      />
    );
  }
  if (field.type === 'date') {
    return (
      <DateField
        {...shared}
        value={value === '' ? null : value}
        onChange={(next) => onChange(next ?? '')}
      />
    );
  }
  return (
    <TextInput
      {...shared}
      type={field.type === 'number' ? 'number' : 'text'}
      value={value}
      onChange={(e) => onChange(e.currentTarget.value)}
    />
  );
}
