import { MultiSelect, SimpleGrid, Stack, Switch, Text, TextInput } from '@mantine/core';
import { NumberField } from '@/components/NumberField';
import { StatusFlowEditor } from './StatusFlowEditor';
import { SALES_ORDER_FLOW_VOCABULARY } from './statusFlowVocabulary';
import { CustomFieldsEditor } from './CustomFieldsEditor';
import { HiddenColumnsSelect } from './HiddenColumnsSelect';
import { ListColumnOrderEditor } from './ListColumnOrderEditor';
import {
  customFieldIssues,
  listColumnOptions,
  listStatusOptions,
  orderCodePreview,
  statusFlowIssues,
  type SalesOrdersV2Form,
} from './salesOrderFields';

export function SalesOrdersV2Section({
  value,
  onChange,
  departmentOptions,
  storedFlowUnreadable,
}: {
  value: SalesOrdersV2Form;
  onChange: (next: SalesOrdersV2Form) => void;
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
        label="Enable sales orders"
        description="Adds the v2 order pages beside the existing ones. Its own register, and confirming an order LOCKS v2 stock rather than deducting it — the delivery note deducts."
      />

      {/* A DISPLAY switch, not a gate on the wire — writing is gated on
          `salesOrder.actions.canManagePayment`, and reading is open to anyone
          who may read the order. Products' price flag has the same shape. */}
      <Switch
        checked={value.paymentTracking}
        onChange={(e) => onChange({ ...value, paymentTracking: e.currentTarget.checked })}
        label="Track payment"
        description="Records what an order has been paid — unpaid, partly paid with the figure, or paid — on a card, in the list, and nowhere else. Only orders that carry a price can take one. The status is what the operator states, not a sum: a settled order with the rest written off reads as paid."
      />

      {/* The order's half of the delivery handshake. `completesSalesOrder` on
          a note stays the operator's force-close — this only fires where
          nothing is owed, so it never strands a reservation and never asks. */}
      <Switch
        checked={value.autoCompleteOnFullDelivery}
        onChange={(e) =>
          onChange({ ...value, autoCompleteOnFullDelivery: e.currentTarget.checked })
        }
        label="Complete an order once everything has been delivered"
        description="When a delivery note takes the last outstanding unit, the order enters its fulfilled status by itself — no operator has to remember to tick 'completes sales order' on the final note. An order still owing anything is left alone, and a note that force-closes its order keeps doing so."
      />

      <NumberField
        label="Days shown by default"
        description="The trailing window the list opens on. Older orders are still reachable by widening the range."
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
        vocabulary={SALES_ORDER_FLOW_VOCABULARY}
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
        description="What the order list opens narrowed to. Leave empty to open on every status; the operator can always widen or clear back to this set."
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
