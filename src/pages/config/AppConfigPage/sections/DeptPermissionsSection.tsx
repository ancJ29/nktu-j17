import { BASE_PERMISSIONS, type PartialPermissions } from '@/types/permissions';
import { deepMergePermissions } from '@/utils/permission';
import type { DepartmentOption as CMngtDepartmentOption, Language } from '@credo/kits/types';
import { Select, Stack, Text } from '@mantine/core';
import { memo, useMemo, useState } from 'react';
import { PermissionOverlayEditor } from '../editors/PermissionOverlayEditor';

export const DeptPermissionsSection = memo(function DeptPermissionsSection({
  departmentOptions,
  clientPermissions,
  onDepartmentOptionsChange,
  languages,
}: {
  departmentOptions: CMngtDepartmentOption[];
  clientPermissions: PartialPermissions;
  onDepartmentOptionsChange: (opts: CMngtDepartmentOption[]) => void;
  languages: Language[];
}) {
  const [selectedDept, setSelectedDept] = useState<string | null>(null);

  const resolvedClientPerms = useMemo(
    () => deepMergePermissions(BASE_PERMISSIONS, clientPermissions),
    [clientPermissions],
  );

  const langCodes = languages.map((l) => l.code).filter(Boolean);
  const primaryLang = langCodes[0] ?? 'en';

  const deptSelectData = departmentOptions
    .filter((d) => d.value)
    .map((d) => ({
      value: d.value,
      label: d.label[primaryLang] ?? d.label[langCodes[1] ?? ''] ?? d.value,
    }));

  const selectedIdx = departmentOptions.findIndex((d) => d.value === selectedDept);
  const selectedOpt = selectedIdx >= 0 ? departmentOptions[selectedIdx] : null;

  const updatePermissions = (perms: PartialPermissions) => {
    if (selectedIdx < 0) return;
    const updated = departmentOptions.map((opt, i) => {
      if (i !== selectedIdx) return opt;
      return {
        ...opt,
        permissions: Object.keys(perms).length > 0 ? perms : undefined,
      };
    });
    onDepartmentOptionsChange(updated);
  };

  if (departmentOptions.length === 0) {
    return (
      <Text fz="sm" c="dimmed" fs="italic">
        No departments configured. Add departments in the Employee Features section first.
      </Text>
    );
  }

  return (
    <Stack gap="md">
      <Select
        label="Select department"
        placeholder="Choose a department to configure..."
        data={deptSelectData}
        value={selectedDept}
        onChange={setSelectedDept}
        size="sm"
        maw={400}
        searchable
      />

      {selectedOpt && (
        <>
          <Text fz="xs" c="dimmed">
            Restrict permissions for this department. Unchecked flags will be denied — checked flags
            inherit from client level.
          </Text>
          <PermissionOverlayEditor
            permissions={selectedOpt.permissions ?? {}}
            onChange={updatePermissions}
            resolvedBase={resolvedClientPerms}
            showBulkToggle
          />
        </>
      )}
    </Stack>
  );
});
