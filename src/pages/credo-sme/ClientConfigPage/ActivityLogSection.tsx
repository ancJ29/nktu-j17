import { Stack, Switch, Text } from '@mantine/core';

export function ActivityLogSection({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <Stack gap="sm">
      <Switch
        checked={enabled}
        onChange={(e) => onChange(e.currentTarget.checked)}
        label="Record an activity trail"
        description="Who changed what, per record. Off means the app writes no entries and the viewers stay empty."
      />
      <Text size="xs" c="dimmed">
        Entries the browser authors are queued and flushed to credo-sme, so this client&apos;s trail
        depends on that service being reachable — a failed flush retries rather than dropping.
        Actions that already run server-side are written there whatever this says.
      </Text>
    </Stack>
  );
}
