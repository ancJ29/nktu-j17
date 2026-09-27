import { NumberInput, type NumberInputProps } from '@mantine/core';
import type { Ref } from 'react';
import { NUMBER_MARKS } from '@/utils/number';

export type GroupedNumberInputProps = Omit<
  NumberInputProps,
  'thousandSeparator' | 'decimalSeparator'
> & {
  ref?: Ref<HTMLInputElement>;
};

export function GroupedNumberInput(props: GroupedNumberInputProps) {
  return (
    <NumberInput
      {...props}
      thousandSeparator={NUMBER_MARKS.group}
      decimalSeparator={NUMBER_MARKS.decimal}
    />
  );
}
