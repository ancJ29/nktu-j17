import { MultiSelect, SimpleGrid, Stack, Switch, Text, TextInput } from '@mantine/core';
import { NumberField } from '@/components/NumberField';
import { StatusFlowEditor } from './StatusFlowEditor';
import { DELIVERY_NOTE_FLOW_VOCABULARY } from './statusFlowVocabulary';
import { CustomFieldsEditor } from './CustomFieldsEditor';
import { HiddenColumnsSelect } from './HiddenColumnsSelect';
import { ListColumnOrderEditor } from './ListColumnOrderEditor';
import {
  customFieldIssues,
  listColumnOptions,
  listStatusOptions,
  orderCodePreview,
  statusFlowIssues,
  type DeliveryNotesV2Form,
} from './deliveryNoteFields';

export function DeliveryNotesV2Section({
  value,
  onChange,
  departmentOptions,
  storedFlowUnreadable,
}: {
  value: DeliveryNotesV2Form;
  onChange: (next: DeliveryNotesV2Form) => void;
  departmentOptions: Array<{ value: string; label: string }>;
  storedFlowUnreadable: boolean;
}) {
  const departmentValues = departmentOptions.map((option) => option.value);
  const flowIssues = statusFlowIssues(value, departmentValues);
  const fieldIssues = customFieldIssues(value, departmentValues);
  return (
    <Stack gap="sm">
      <Switch
        checked={value.enabled}
        onChange={(e) => onChange({ ...value, enabled: e.currentTarget.checked })}
        label="Enable delivery notes"
        description="Adds the v2 delivery-note pages. A note is issued from a confirmed order and is what actually DEDUCTS v2 stock; cancelling one never puts stock back."
      />

      <Switch
        checked={value.deliveryPhotoRequired}
        onChange={(e) => onChange({ ...value, deliveryPhotoRequired: e.currentTarget.checked })}
        label="Require a delivery photo"
        description="An internal delivery must attach at least one photo before the completing step — the server refuses the hop without one. External deliveries are never asked."
      />

      <NumberField
        label="Days shown by default"
        description="The trailing window the list opens on. Older notes are still reachable by widening the range."
        value={value.defaultRangeDays}
        emptyValue={14}
        onChange={(defaultRangeDays) => onChange({ ...value, defaultRangeDays })}
        min={1}
        max={92}
      />

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
        <TextInput
          label="Order-number prefix"
          description={`Today's first: ${orderCodePreview(value, new Date())}`}
          value={value.codePrefix}
          onChange={(e) => onChange({ ...value, codePrefix: e.currentTarget.value })}
          autoComplete="off"
        />
        <NumberField
          label="Sequence padding"
          description="Zero-pad width for the number after the date."
          value={value.codePadLength}
          emptyValue={3}
          onChange={(codePadLength) => onChange({ ...value, codePadLength })}
          min={0}
          max={12}
        />
      </SimpleGrid>

      {/* The shared validator's answer, live: errors block the save (the app
          and the BFF would refuse the same config loudly, so the editor
          refuses it first); warnings only inform. */}
      <StatusFlowEditor
        vocabulary={DELIVERY_NOTE_FLOW_VOCABULARY}
        value={value.statusFlow}
        onChange={(statusFlow) => onChange({ ...value, statusFlow })}
        departmentOptions={departmentOptions}
        storedUnreadable={storedFlowUnreadable}
      />

      {/* Directly under the flow editor because its options ARE that flow's
          statuses — an operator drafts the vocabulary first, then says which of
          it the list rests on. A default is a resting selection, not a
          visibility rule: the list's picker still offers every status. */}
      <MultiSelect
        label="Statuses shown by default"
        description="What the note list opens narrowed to. Leave empty to open on every status; the operator can always widen or clear back to this set."
        data={listStatusOptions(value)}
        value={value.defaultListStatuses}
        onChange={(defaultListStatuses) => onChange({ ...value, defaultListStatuses })}
        placeholder={value.defaultListStatuses.length === 0 ? 'Every status' : undefined}
        clearable
        searchable
      />

      {flowIssues.errors.map((error) => (
        <Text key={error} size="xs" c="red">
          {error}
        </Text>
      ))}
      {flowIssues.warnings.map((warning) => (
        <Text key={warning} size="xs" c="orange">
          {warning}
        </Text>
      ))}

      <CustomFieldsEditor
        value={value.customFields}
        onChange={(customFields) => onChange({ ...value, customFields })}
        departmentOptions={departmentOptions}
      />
      {fieldIssues.errors.map((error) => (
        <Text key={error} size="xs" c="red">
          {error}
        </Text>
      ))}
      {fieldIssues.warnings.map((warning) => (
        <Text key={warning} size="xs" c="orange">
          {warning}
        </Text>
      ))}

      <ListColumnOrderEditor
        label="Column order on the list"
        description="Pinned columns draw first, in this order."
        options={listColumnOptions(value)}
        value={value.listColumns}
        onChange={(listColumns) => onChange({ ...value, listColumns })}
      />

      <HiddenColumnsSelect
        options={listColumnOptions(value)}
        value={value.hiddenColumns}
        onChange={(hiddenColumns) => onChange({ ...value, hiddenColumns })}
      />
    </Stack>
  );
}
