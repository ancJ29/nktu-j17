import { MultiSelect, Stack, Switch } from '@mantine/core';
import { LOOKUP_CATEGORY_IDS, type LookupsV2Form } from './lookupFields';

export function LookupsSection({
  value,
  onChange,
}: {
  value: LookupsV2Form;
  onChange: (next: LookupsV2Form) => void;
}) {
  const data = [...new Set([...LOOKUP_CATEGORY_IDS, ...value.enabledCategories])];

  return (
    <Stack gap="sm">
      <Switch
        checked={value.enabled}
        onChange={(e) => onChange({ ...value, enabled: e.currentTarget.checked })}
        label="Meta-data manager"
        description="One page for every lookup category the client uses — units, product and material categories, truck types. Root users only, wherever it appears in the menu."
      />

      <MultiSelect
        label="Categories this client may edit"
        description="Leave EMPTY for every category. Naming any narrows the manager to exactly those."
        data={data}
        value={value.enabledCategories}
        onChange={(enabledCategories) => onChange({ ...value, enabledCategories })}
        placeholder={value.enabledCategories.length === 0 ? 'All categories' : undefined}
        searchable
        clearable
      />
    </Stack>
  );
}
