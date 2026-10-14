import { Badge } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';

export function PostingPendingBadge({
  label,
  hint,
}: {
  readonly label: string;
  readonly hint: string;
}) {
  return (
    <Badge
      color="orange"
      variant="outline"
      size="sm"
      leftSection={<IconAlertTriangle size={11} />}
      style={{ cursor: 'help' }}
      title={hint}
    >
      {label}
    </Badge>
  );
}
