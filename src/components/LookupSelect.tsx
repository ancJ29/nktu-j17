import { Grid, Select } from '@mantine/core';
import { useLookupV2Options } from '@/hooks/useLookupV2Options';

export function LookupSelect({
  label,
  category,
  value,
  onChange,
  span = { base: 12, sm: 6 },
}: {
  readonly label: string;
  readonly category: string;
  readonly value: string;
  readonly onChange: (next: string) => void;
  readonly span?: Record<string, number> | number;
}) {
  const options = useLookupV2Options(category);
  const data =
    value && !options.some((o) => o.value === value)
      ? [...options, { value, label: value }]
      : options;

  if (data.length === 0) return null;
  return (
    <Grid.Col span={span}>
      <Select
        label={label}
        data={data}
        clearable
        searchable
        value={value || null}
        onChange={(next) => onChange(next ?? '')}
      />
    </Grid.Col>
  );
}
