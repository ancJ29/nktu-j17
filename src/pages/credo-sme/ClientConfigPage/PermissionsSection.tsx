import { Divider, Stack, Switch, Text } from '@mantine/core';
import { PermissionGrid } from './PermissionGrid';
import type { PermissionForm } from './permissionFields';
import type { PermissionModeForm } from './permissionModeFields';

export function PermissionsSection({
  value,
  onChange,
  mode,
  onModeChange,
}: {
  value: PermissionForm;
  onChange: (next: PermissionForm) => void;
  mode: PermissionModeForm;
  onModeChange: (next: PermissionModeForm) => void;
}) {
  return (
    <Stack gap="sm">
      <Switch
        checked={mode.useServerPermissions}
        onChange={(e) => onModeChange({ useServerPermissions: e.currentTarget.checked })}
        label="Gate on the service's permission build"
        description="Off, the browser resolves the four layers itself and the service's answer is only compared against it. On, the app gates on what credo-sme resolved. Turn it on for a client whose two builds have stopped disagreeing — not before."
      />
      <Divider />
      <Text size="xs" c="dimmed">
        The CLIENT layer: ticking a box grants it to everyone at this client. Unticking removes the
        grant rather than denying it — denials belong to the department and employee layers.
      </Text>
      <PermissionGrid value={value} onChange={onChange} />
    </Stack>
  );
}
