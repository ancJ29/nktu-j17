import { SimpleGrid, Stack, Switch, Text, TextInput } from '@mantine/core';
import { NumberField } from '@/components/NumberField';
import { EMPLOYEE_FLAGS, employeeCodePreview, type EmployeeForm } from './employeeFields';

export function EmployeeSection({
  value,
  onChange,
}: {
  value: EmployeeForm;
  onChange: (next: EmployeeForm) => void;
}) {
  return (
    <Stack gap="sm">
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
        {EMPLOYEE_FLAGS.map((flag) => (
          <Switch
            key={flag.key}
            checked={value.flags[flag.key]}
            onChange={(e) =>
              onChange({ ...value, flags: { ...value.flags, [flag.key]: e.currentTarget.checked } })
            }
            label={flag.label}
            description={flag.hint}
          />
        ))}
        <TextInput
          label="Code prefix"
          description={`Next code: ${employeeCodePreview(value)}`}
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

      <Text size="xs" c="dimmed">
        Departments and positions have their own sections. Driver departments are not edited here —
        they name department values, so they keep whatever the c-mngt App Config page set.
      </Text>
    </Stack>
  );
}
