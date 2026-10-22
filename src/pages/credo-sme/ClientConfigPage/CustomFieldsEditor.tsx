import {
  ActionIcon,
  Button,
  Card,
  Group,
  MultiSelect,
  Select,
  Stack,
  Switch,
  TagsInput,
  Text,
  TextInput,
} from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import {
  CUSTOM_FIELD_TYPES,
  CUSTOM_FIELD_WIDTHS,
  type CustomFieldDef,
  type CustomFieldType,
  type CustomFieldWidth,
} from '@/utils/customFields';

const TYPE_LABELS: Record<CustomFieldType, string> = {
  text: 'Text',
  number: 'Number',
  date: 'Date',
  select: 'Choice list',
};

const WIDTH_LABELS: Record<CustomFieldWidth, string> = {
  full: 'Full row',
  half: 'Half',
  third: 'Third',
};

const emptyField = (): CustomFieldDef => ({ key: '', label: '', type: 'text' });

export function CustomFieldsEditor({
  value,
  onChange,
  departmentOptions,
}: {
  readonly value: CustomFieldDef[];
  readonly onChange: (next: CustomFieldDef[]) => void;
  readonly departmentOptions: Array<{ value: string; label: string }>;
}) {
  const patch = (index: number, next: Partial<CustomFieldDef>) =>
    onChange(value.map((field, i) => (i === index ? { ...field, ...next } : field)));

  return (
    <Stack gap="xs">
      <Group justify="space-between">
        <Stack gap={0}>
          <Text fw={500} size="sm">
            Custom fields
          </Text>
          <Text size="xs" c="dimmed">
            Extra fields on every receipt. Values are stored on the record and shown on the form and
            detail page; the key is permanent once records carry it, the label can change any time.
          </Text>
        </Stack>
        <Button
          variant="light"
          size="xs"
          leftSection={<IconPlus size={14} />}
          onClick={() => onChange([...value, emptyField()])}
        >
          Add field
        </Button>
      </Group>

      {value.length === 0 ? (
        <Text size="xs" c="dimmed">
          No custom fields — receipts carry the standard fields only.
        </Text>
      ) : (
        <Stack gap="sm">
          {value.map((field, index) => (
            <Card withBorder padding="sm" key={index}>
              <Stack gap="sm">
                <Group gap="sm" align="end" wrap="nowrap">
                  <TextInput
                    label="Key"
                    description="Permanent"
                    value={field.key}
                    onChange={(e) => patch(index, { key: e.currentTarget.value })}
                    placeholder="contractNo"
                    autoComplete="off"
                    w={180}
                  />
                  <TextInput
                    label="Label"
                    description="Shown to operators"
                    value={field.label}
                    onChange={(e) => patch(index, { label: e.currentTarget.value })}
                    placeholder="Số hợp đồng"
                    autoComplete="off"
                    flex={1}
                  />
                  <Select
                    label="Type"
                    data={CUSTOM_FIELD_TYPES.map((type) => ({
                      value: type,
                      label: TYPE_LABELS[type],
                    }))}
                    value={field.type}
                    onChange={(next) => patch(index, { type: (next ?? 'text') as CustomFieldType })}
                    allowDeselect={false}
                    w={150}
                  />
                  <Select
                    label="Width"
                    description="On form + detail"
                    data={CUSTOM_FIELD_WIDTHS.map((width) => ({
                      value: width,
                      label: WIDTH_LABELS[width],
                    }))}
                    value={field.width ?? 'full'}
                    onChange={(next) =>
                      patch(index, { width: (next ?? 'full') as CustomFieldWidth })
                    }
                    allowDeselect={false}
                    w={130}
                  />
                  <Switch
                    label="In list"
                    labelPosition="left"
                    checked={field.showInList === true}
                    onChange={(e) => patch(index, { showInList: e.currentTarget.checked })}
                    pb={8}
                  />
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    aria-label="Remove field"
                    onClick={() => onChange(value.filter((_, i) => i !== index))}
                    mb={6}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>

                {/* Only a choice list has choices — a stale list left behind by
                    a type change never travels, so the control goes with it. */}
                {field.type === 'select' && (
                  <TagsInput
                    label="Choices"
                    value={field.options ?? []}
                    onChange={(options) => patch(index, { options })}
                    placeholder="Type a choice, press Enter"
                  />
                )}

                <Group gap="sm" align="start" wrap="nowrap">
                  <MultiSelect
                    label="Can view"
                    description="Empty = everyone"
                    data={departmentOptions}
                    value={field.viewDepartments ?? []}
                    onChange={(viewDepartments) => patch(index, { viewDepartments })}
                    flex={1}
                    searchable
                  />
                  <MultiSelect
                    label="Can edit"
                    description="Must be able to view"
                    data={departmentOptions}
                    value={field.editDepartments ?? []}
                    onChange={(editDepartments) => patch(index, { editDepartments })}
                    flex={1}
                    searchable
                  />
                </Group>
              </Stack>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
