import { Card, Center, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconLock } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

export function ForbiddenState() {
  const { t } = useTranslation();
  return (
    <Center h="80vh">
      <Card withBorder padding="xl">
        <Stack align="center" gap="md" py="xl">
          <ThemeIcon size={64} radius="xl" variant="light" color="gray">
            <IconLock size={32} />
          </ThemeIcon>
          <Stack align="center" gap={4}>
            <Text size="lg" fw={600}>
              {t('error.forbidden.inlineTitle')}
            </Text>
            <Text size="sm" c="dimmed" ta="center" maw={360}>
              {t('error.forbidden.message')}
            </Text>
          </Stack>
        </Stack>
      </Card>
    </Center>
  );
}
