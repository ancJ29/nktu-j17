import { Divider, Text } from '@mantine/core';

type AuthDividerProps = {
  label?: string;
};

export function AuthDivider({ label = 'or' }: AuthDividerProps) {
  return (
    <Divider
      label={
        <Text size="sm" c="dimmed">
          {label}
        </Text>
      }
      labelPosition="center"
    />
  );
}
