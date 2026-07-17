import { Text, type TextProps } from '@mantine/core';
import type { ReactNode } from 'react';

export type FieldLabelProps = TextProps & {
  readonly children?: ReactNode;
};

export function FieldLabel(props: FieldLabelProps) {
  const hasC = 'c' in props;
  const { size = 'xs', fw = 600, lts = 0.3, tt = 'uppercase', children, c, ...rest } = props;
  return (
    <Text size={size} c={hasC ? c : 'dimmed'} fw={fw} lts={lts} tt={tt} {...rest}>
      {children}
    </Text>
  );
}
