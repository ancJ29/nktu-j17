import { Button, Card, Center, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconArrowLeft, IconSearchOff } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

type NotFoundStateProps = {
  readonly title: string;
  readonly message?: string;
  readonly icon?: ReactNode;
  readonly backTo?: string;
  readonly backLabel?: string;
};

export function NotFoundState({ title, message, icon, backTo, backLabel }: NotFoundStateProps) {
  return (
    <Center h="80vh">
      <Card withBorder padding="xl">
        <Stack align="center" gap="md" py="xl">
          <ThemeIcon size={64} radius="xl" variant="light" color="gray">
            {icon ?? <IconSearchOff size={32} />}
          </ThemeIcon>
          <Stack align="center" gap={4}>
            <Text size="lg" fw={600}>
              {title}
            </Text>
            {message && (
              <Text size="sm" c="dimmed" ta="center" maw={360}>
                {message}
              </Text>
            )}
          </Stack>
          {backTo && backLabel && (
            <Button
              component={Link}
              to={backTo}
              variant="light"
              size="sm"
              leftSection={<IconArrowLeft size={16} />}
            >
              {backLabel}
            </Button>
          )}
        </Stack>
      </Card>
    </Center>
  );
}
