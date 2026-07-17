import { TextInput, type TextInputProps } from '@mantine/core';
import { useEffect, useRef, useState } from 'react';

type Props = Omit<TextInputProps, 'value' | 'onChange'> & {
  readonly value: string;
  readonly onChange: (value: string) => void;
};

export function SearchInput({ value, onChange, ...rest }: Props) {
  const [local, setLocal] = useState(value);
  const composingRef = useRef(false);

  useEffect(() => {
    if (!composingRef.current) setLocal(value);
  }, [value]);

  return (
    <TextInput
      rightSectionPointerEvents="all"
      {...rest}
      value={local}
      onChange={(e) => {
        const next = e.currentTarget.value;
        setLocal(next);
        if (!composingRef.current) onChange(next);
      }}
      onCompositionStart={() => {
        composingRef.current = true;
      }}
      onCompositionEnd={(e) => {
        composingRef.current = false;
        onChange(e.currentTarget.value);
      }}
    />
  );
}
