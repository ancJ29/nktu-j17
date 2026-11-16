import { Text, Tooltip } from '@mantine/core';

export function PaymentNoteCell({ text }: { readonly text: string | undefined }) {
  const note = text?.trim();
  if (!note) {
    return (
      <Text size="sm" c="dimmed">
        —
      </Text>
    );
  }
  return (
    <Tooltip label={note} multiline maw={360} withArrow openDelay={300}>
      <Text size="sm" lineClamp={1}>
        {note}
      </Text>
    </Tooltip>
  );
}
