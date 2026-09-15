import { Badge, Tooltip } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';

export function PostingPendingBadge({
  label,
  hint,
}: {
  readonly label: string;
  readonly hint: string;
}) {
  return (
    <Tooltip label={hint} withArrow multiline w={280}>
      <Badge
        color="orange"
        variant="outline"
        size="sm"
        leftSection={<IconAlertTriangle size={11} />}
        style={{ cursor: 'help' }}
      >
        {label}
      </Badge>
    </Tooltip>
  );
}
