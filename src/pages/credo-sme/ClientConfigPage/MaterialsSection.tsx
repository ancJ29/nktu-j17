import { Select, SimpleGrid, Stack, Switch, TextInput } from '@mantine/core';
import { NumberField } from '@/components/NumberField';
import { HiddenColumnsSelect } from './HiddenColumnsSelect';
import { ListColumnOrderEditor } from './ListColumnOrderEditor';
import {
  materialCodePreview,
  materialListColumnOptions,
  type MaterialsV2Form,
} from './materialFields';

export function MaterialsSection({
  value,
  onChange,
}: {
  value: MaterialsV2Form;
  onChange: (next: MaterialsV2Form) => void;
}) {
  return (
    <Stack gap="sm">
      <Switch
        checked={value.enabled}
        onChange={(e) => onChange({ ...value, enabled: e.currentTarget.checked })}
        label="Enable materials"
        description="Adds the v2 material pages beside the existing ones, which keep their own flag and their own data — so this list starts empty."
      />

      <Switch
        checked={value.simpleMode}
        onChange={(e) => onChange({ ...value, simpleMode: e.currentTarget.checked })}
        label="Simple mode"
        description="Add and edit in a dialog, read in a side panel. Off gives each material its own page, which suits a register big enough to link to and search."
      />

      <Select
        label="Unit lookup category"
        description="Which Meta-data category the unit picker offers. Pick the one this client already curates — the wrong one shows an empty picker and no error."
        data={[
          { value: 'material-unit', label: 'Material Unit (dedicated)' },
          { value: 'unit', label: 'Unit of Measure (shared with products)' },
        ]}
        value={value.unitCategory}
        onChange={(next) =>
          onChange({ ...value, unitCategory: next === 'unit' ? 'unit' : 'material-unit' })
        }
        allowDeselect={false}
      />

      <Switch
        checked={value.inventory}
        onChange={(e) => onChange({ ...value, inventory: e.currentTarget.checked })}
        label="Track stock"
        description="Adds an on-hand column to the list and a stock card to each material. Anyone who can read materials sees the number; only material.canManageInventory can change it."
      />

      <ListColumnOrderEditor
        label="Column order on the list"
        description="Pinned columns draw first, in this order."
        options={materialListColumnOptions(value)}
        value={value.listColumns}
        onChange={(listColumns) => onChange({ ...value, listColumns })}
      />

      <HiddenColumnsSelect
        options={materialListColumnOptions(value)}
        value={value.hiddenColumns}
        onChange={(hiddenColumns) => onChange({ ...value, hiddenColumns })}
      />

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
        <TextInput
          label="Code prefix"
          description={`First code: ${materialCodePreview(value)}`}
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
