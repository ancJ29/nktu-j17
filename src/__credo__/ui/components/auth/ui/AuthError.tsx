import { Text } from '@mantine/core';

type AuthErrorProps = {
  message: string | null;
};

export function AuthError({ message }: AuthErrorProps) {
  if (!message) return null;

  return (
    <Text c="red" size="sm" ta="center" mb="md">
      {message}
    </Text>
  );
}
