import { SimpleGrid, Stack, Switch, TextInput } from '@mantine/core';
import { NumberField } from '@/components/NumberField';
import { HiddenColumnsSelect } from './HiddenColumnsSelect';
import { ListColumnOrderEditor } from './ListColumnOrderEditor';
import { productCodePreview, productListColumnOptions, type ProductsV2Form } from './productFields';

export function ProductsSection({
  value,
  onChange,
}: {
  value: ProductsV2Form;
  onChange: (next: ProductsV2Form) => void;
}) {
  return (
    <Stack gap="sm">
      <Switch
        checked={value.enabled}
        onChange={(e) => onChange({ ...value, enabled: e.currentTarget.checked })}
        label="Enable products"
        description="Adds the v2 product pages beside the existing ones, which keep their own flag and their own data — so this list starts empty."
      />

      <Switch
        checked={value.simpleMode}
        onChange={(e) => onChange({ ...value, simpleMode: e.currentTarget.checked })}
        label="Simple mode"
        description="Add and edit in a dialog, read in a side panel. Off gives each product its own page, which suits a register big enough to link to and search."
      />

      <Switch
        checked={value.priceManagement}
        onChange={(e) => onChange({ ...value, priceManagement: e.currentTarget.checked })}
        label="Show prices"
        description="Reveals the price field to users who also hold product.canViewPrice. It is a display rule: the service answers the whole row to anyone who may read the register."
      />

      <Switch
        checked={value.productPhoto}
        onChange={(e) => onChange({ ...value, productPhoto: e.currentTarget.checked })}
        label="Product photos"
        disabled={value.simpleMode}
        description={
          value.simpleMode
            ? 'Needs simple mode off — the photos live on the product page, and simple mode has none.'
            : 'Lets users who hold product.canUploadPhoto attach photos on the product page. Everyone who can read the register sees them.'
        }
      />

      <Switch
        checked={value.inventory}
        onChange={(e) => onChange({ ...value, inventory: e.currentTarget.checked })}
        label="Track stock"
        description="Adds an on-hand column to the list and a stock card to each product. Anyone who can read products sees the number; only product.canManageInventory can change it."
      />

      {/* Rendered only with stock on — both describe how an inbound figure is
          shown, and an operator cannot act on that until there is one. */}
      {value.inventory && (
        <>
          <Switch
            checked={value.incomingColumn}
            onChange={(e) => onChange({ ...value, incomingColumn: e.currentTarget.checked })}
            label="Incoming in its own column"
            description="Off: inbound stock shows under the on-hand figure. On: it gets a sortable column of its own — for clients who scan what is arriving as a number in its own right."
          />
          <Switch
            checked={value.incomingReceipts}
            onChange={(e) => onChange({ ...value, incomingReceipts: e.currentTarget.checked })}
            label="List the receipts behind incoming"
            description="Adds a table on the product page naming the open goods receipts that make up its inbound figure. Only legible where receipts are raised ahead of delivery."
          />
          <Switch
            checked={value.outgoingOrders}
            onChange={(e) => onChange({ ...value, outgoingOrders: e.currentTarget.checked })}
            label="List the orders holding stock"
            description="Adds a table on the product page naming the open sales orders reserving it — the receipts table's mirror on the locked side."
          />
        </>
      )}

      <ListColumnOrderEditor
        label="Column order on the list"
        description="Pinned columns draw first, in this order."
        options={productListColumnOptions(value)}
        value={value.listColumns}
        onChange={(listColumns) => onChange({ ...value, listColumns })}
      />

      <HiddenColumnsSelect
        options={productListColumnOptions(value)}
        value={value.hiddenColumns}
        onChange={(hiddenColumns) => onChange({ ...value, hiddenColumns })}
      />

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
        <TextInput
          label="Code prefix"
          description={`First code: ${productCodePreview(value)}`}
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
