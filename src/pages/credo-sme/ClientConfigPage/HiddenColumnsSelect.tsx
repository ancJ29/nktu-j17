import { MultiSelect } from '@mantine/core';

export function HiddenColumnsSelect({
  options,
  value,
  onChange,
}: {
  readonly options: ReadonlyArray<{ value: string; label: string }>;
  readonly value: string[];
  readonly onChange: (next: string[]) => void;
}) {
  return (
    <MultiSelect
      label="Hidden columns"
      description="Columns the list never draws. Hiding wins over pinning; everything else keeps its order."
      data={[...options]}
      value={value}
      onChange={onChange}
      clearable
    />
  );
}
