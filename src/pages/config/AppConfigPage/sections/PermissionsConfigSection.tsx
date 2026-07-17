import type { PartialPermissions } from '@/types/permissions';
import { PermissionOverlayEditor } from '../editors/PermissionOverlayEditor';

export function PermissionsConfigSection({
  permissions,
  onChange,
}: {
  permissions: PartialPermissions;
  onChange: (p: PartialPermissions) => void;
}) {
  return <PermissionOverlayEditor permissions={permissions} onChange={onChange} />;
}
