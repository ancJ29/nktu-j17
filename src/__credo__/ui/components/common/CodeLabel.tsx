import { Text, type MantineColor, type TextProps } from '@mantine/core';

type CodeLabelProps = {
  readonly code?: string;
  readonly c?: MantineColor;
  readonly size?: TextProps['size'];
  readonly fw?: TextProps['fw'];
};

export function CodeLabel({ code = '—', c = 'dimmed', size = 'sm', fw = 'bold' }: CodeLabelProps) {
  return (
    <Text size={size} ff="monospace" fw={fw} c={c}>
      {code}
    </Text>
  );
}
