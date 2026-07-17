import { PasswordInput, TextInput, type TextInputProps } from '@mantine/core';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

type AuthTextInputProps = TextInputProps & {
  icon?: ReactNode;
};

export function AuthTextInput({ icon, ...props }: AuthTextInputProps) {
  return <TextInput leftSection={icon} size="md" {...props} />;
}

type AuthPasswordInputProps = ComponentPropsWithoutRef<typeof PasswordInput> & {
  icon?: ReactNode;
};

export function AuthPasswordInput({ icon, ...props }: AuthPasswordInputProps) {
  return <PasswordInput leftSection={icon} size="md" {...props} />;
}
