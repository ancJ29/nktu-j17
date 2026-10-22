import { Alert, Stack, Text } from '@mantine/core';
import { OptionListEditor } from './OptionListEditor';
import type { PositionOption } from './optionFields';

export function PositionsSection({
  options,
  langCodes,
  orphaned,
  onChange,
}: {
  options: PositionOption[];
  langCodes: string[];

  orphaned: boolean;
  onChange: (next: PositionOption[]) => void;
}) {
  return (
    <Stack gap="sm">
      {orphaned && (
        <Alert color="yellow" variant="light">
          The Employees section has <b>Position</b> switched off, so nothing shows a position in the
          app — these rows are kept but unused.
        </Alert>
      )}
      <Text size="xs" c="dimmed">
        Labels only. There is no POSITION permission layer — the resolver merges BASE, CLIENT,
        DEPARTMENT and EMPLOYEE, so a position carries no permissions of its own today.
      </Text>
      <OptionListEditor
        options={options}
        langCodes={langCodes}
        addLabel="Add position"
        emptyHint="No positions configured."
        onChange={onChange}
      />
    </Stack>
  );
}
