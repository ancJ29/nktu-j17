import { Group } from '@mantine/core';
import { EmployeeLink } from '@/components/EmployeeLink';
import type { LinkSize } from '@/components/EntityLink';

export function WarehouseStaffLinks({
  ids,
  size = 'sm',
  noAvatar = false,
}: {
  readonly ids: readonly string[];
  readonly size?: LinkSize;
  readonly noAvatar?: boolean;
}) {
  if (ids.length === 0) return null;
  return (
    <Group gap={6} wrap="wrap">
      {ids.map((id) => (
        <EmployeeLink key={id} id={id} size={size} noAvatar={noAvatar} />
      ))}
    </Group>
  );
}
