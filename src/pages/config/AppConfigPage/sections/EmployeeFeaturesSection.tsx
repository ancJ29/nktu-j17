import type { CMngtEmployeeFeatures, Language } from '@credo/kits/types';
import {
  Box,
  Group,
  MultiSelect,
  Paper,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
} from '@mantine/core';
import { memo, useMemo } from 'react';
import { ConfigOptionEditor } from '../editors/ConfigOptionEditor';
import { buildEmployeeCodePreview } from '../helpers';
import { NumberField } from '@/components/NumberField';

type EmpFlagKey =
  | 'enabled'
  | 'selfManage'
  | 'email'
  | 'position'
  | 'department'
  | 'allowLogin'
  | 'bulkImport'
  | 'avatar'
  | 'startDate'
  | 'address'
  | 'dateOfBirth'
  | 'driverProfile';

const EMP_FLAG_DEFS: { key: EmpFlagKey; desc: string }[] = [
  { key: 'enabled', desc: 'Master toggle for the employees feature' },
  {
    key: 'selfManage',
    desc: 'Let this client manage its own departments, positions, driver departments, and permission overlays via the in-app Organization page (instead of operator-only here)',
  },
  { key: 'email', desc: 'Allow employees to login to the system' },
  { key: 'position', desc: 'Position of the employee' },
  { key: 'department', desc: 'Department of the employee' },
  { key: 'allowLogin', desc: 'Allow employees to login to the system' },
  { key: 'bulkImport', desc: 'Allow bulk import of employees' },
  {
    key: 'avatar',
    desc: 'Allow uploading a profile image on the employee detail page (PC only)',
  },
  { key: 'startDate', desc: 'Show the working start date field' },
  { key: 'address', desc: 'Show the address field' },
  { key: 'dateOfBirth', desc: 'Show the date of birth field' },
  {
    key: 'driverProfile',
    desc: 'Manage drivers — adds a driver tab (identity card, license, linked truck, training logs) for employees in the selected driver departments',
  },
];

const EMP_LABELS: Record<string, string> = {
  empEnabled: 'Employees Module',
  empSelfManage: 'Client Self-Managed Org',
  empEmail: 'Email',
  empPosition: 'Position',
  empDepartment: 'Department',
  empAllowLogin: 'Allow Login',
  empBulkImport: 'Bulk Import',
  empAvatar: 'Profile Image',
  empStartDate: 'Start Date',
  empAddress: 'Address',
  empDateOfBirth: 'Date of Birth',
  empDriverProfile: 'Driver Management',
};

export const EmployeeFeaturesSection = memo(function EmployeeFeaturesSection({
  features,
  languages,
  onChange,
}: {
  features: CMngtEmployeeFeatures;
  languages: Language[];
  onChange: (f: CMngtEmployeeFeatures) => void;
}) {
  const departmentMultiSelectData = useMemo(
    () =>
      (features.departmentOptions ?? []).map((d) => {
        const labels = d.label ?? {};
        const label = labels.en || labels.vi || Object.values(labels)[0] || d.value;
        return { value: d.value, label: label || d.value };
      }),
    [features.departmentOptions],
  );

  return (
    <Stack gap="sm">
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
        {EMP_FLAG_DEFS.map(({ key, desc }) => (
          <Group
            key={key}
            justify="space-between"
            p="xs"
            style={{ borderRadius: 'var(--mantine-radius-sm)' }}
            bg={features[key] ? undefined : 'var(--mantine-color-default-hover)'}
            wrap="nowrap"
          >
            <Box style={{ flex: 1, minWidth: 0 }}>
              <Text fz="sm" fw={500}>
                {EMP_LABELS[`emp${key[0].toUpperCase()}${key.slice(1)}`] ?? key}
              </Text>
              <Text fz="xs" c="dimmed">
                {desc}
              </Text>
            </Box>
            <Switch
              checked={features[key] ?? false}
              onChange={() => onChange({ ...features, [key]: !features[key] })}
              style={{ flexShrink: 0 }}
            />
          </Group>
        ))}
      </SimpleGrid>

      <Paper p="xs" withBorder>
        <Text fz="sm" fw={600} mb={4}>
          Employee Code Format
        </Text>
        <Text fz="xs" c="dimmed" mb="xs">
          {`Auto-generated codes for new employees. Preview: ${buildEmployeeCodePreview(features.codePrefix, features.codePadLength, 1)}`}
        </Text>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <TextInput
            label="Code Prefix"
            value={features.codePrefix}
            onChange={(e) => onChange({ ...features, codePrefix: e.currentTarget.value })}
            size="sm"
            placeholder="EMP-"
          />
          <NumberField
            label="Number Padding"
            value={features.codePadLength}
            emptyValue={0}
            onChange={(codePadLength) => onChange({ ...features, codePadLength })}
            size="sm"
            min={0}
            max={12}
          />
        </SimpleGrid>
      </Paper>

      {features.driverProfile && features.department && (
        <Paper p="xs" withBorder>
          <Text fz="sm" fw={600} mb={4}>
            Driver Departments
          </Text>
          <Text fz="xs" c="dimmed" mb="xs">
            Employees in these departments are treated as drivers and get the driver tab (identity
            card, license, linked truck, training logs).
          </Text>
          <MultiSelect
            data={departmentMultiSelectData}
            value={features.driverDepartments ?? []}
            onChange={(vals) => onChange({ ...features, driverDepartments: vals })}
            placeholder="Select driver departments"
            nothingFoundMessage="No departments configured. Add departments under Department Options below."
            searchable
            clearable
            size="sm"
          />
        </Paper>
      )}

      {features.department && (
        <ConfigOptionEditor
          options={features.departmentOptions}
          onChange={(opts) => onChange({ ...features, departmentOptions: opts })}
          languages={languages}
          label="Department Options"
        />
      )}

      {features.position && (
        <ConfigOptionEditor
          options={features.positionOptions}
          onChange={(opts) => onChange({ ...features, positionOptions: opts })}
          languages={languages}
          label="Position Options"
        />
      )}
    </Stack>
  );
});
