import { SimpleGrid, Stack, Switch, TextInput } from '@mantine/core';
import { NumberField } from '@/components/NumberField';
import {
  customerCodePreview,
  customerListColumnOptions,
  type CustomersV2Form,
} from './customerFields';
import { HiddenColumnsSelect } from './HiddenColumnsSelect';
import { ListColumnOrderEditor } from './ListColumnOrderEditor';

export function CustomersSection({
  value,
  onChange,
}: {
  value: CustomersV2Form;
  onChange: (next: CustomersV2Form) => void;
}) {
  return (
    <Stack gap="sm">
      <Switch
        checked={value.enabled}
        onChange={(e) => onChange({ ...value, enabled: e.currentTarget.checked })}
        label="Enable customers"
        description="Adds the v2 customer pages beside the existing ones, which keep their own flag and their own data — so this list starts empty."
      />

      <Switch
        checked={value.simpleMode}
        onChange={(e) => onChange({ ...value, simpleMode: e.currentTarget.checked })}
        label="Simple mode"
        description="Add and edit in a dialog, read in a side panel. Off gives each customer its own page, which suits a register big enough to link to and search."
      />

      <ListColumnOrderEditor
        label="Column order on the list"
        description="Pinned columns draw first, in this order."
        options={customerListColumnOptions}
        value={value.listColumns}
        onChange={(listColumns) => onChange({ ...value, listColumns })}
      />

      <HiddenColumnsSelect
        options={customerListColumnOptions}
        value={value.hiddenColumns}
        onChange={(hiddenColumns) => onChange({ ...value, hiddenColumns })}
      />

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
        <TextInput
          label="Code prefix"
          description={`First code: ${customerCodePreview(value)}`}
          value={value.codePrefix}
          onChange={(e) => onChange({ ...value, codePrefix: e.currentTarget.value })}
          autoComplete="off"
          spellCheck={false}
        />
        <NumberField
          label="Number padding"
          value={value.codePadLength}
          emptyValue={0}
          onChange={(codePadLength) => onChange({ ...value, codePadLength })}
          min={0}
          max={12}
        />
      </SimpleGrid>
    </Stack>
  );
}
