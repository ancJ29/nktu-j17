import { Button, Card, Center, Code, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconAlertTriangle, IconRefresh } from '@tabler/icons-react';
import { useRouteError } from 'react-router';
import { useTranslation } from 'react-i18next';
import { isChunkLoadError } from '@credo/base-ui/utils';
import { isInternal } from '@/config/env';

export function RouteErrorState() {
  const { t } = useTranslation();
  const error = useRouteError();
  const isStaleChunk = isChunkLoadError(error);

  return (
    <Center h="100vh" px="md">
      <Card withBorder padding="xl" maw={460} w="100%">
        <Stack align="center" gap="md" py="xl">
          <ThemeIcon size={64} radius="xl" variant="light" color={isStaleChunk ? 'blue' : 'red'}>
            {isStaleChunk ? <IconRefresh size={32} /> : <IconAlertTriangle size={32} />}
          </ThemeIcon>
          <Stack align="center" gap={4}>
            <Text size="lg" fw={600} ta="center">
              {isStaleChunk ? t('error.staleChunk.title') : t('error.unexpected.title')}
            </Text>
            <Text size="sm" c="dimmed" ta="center">
              {isStaleChunk ? t('error.staleChunk.message') : t('error.unexpected.message')}
            </Text>
          </Stack>
          <Button leftSection={<IconRefresh size={16} />} onClick={() => window.location.reload()}>
            {t('error.reload')}
          </Button>
          {/* The raw message is a debugging aid, not operator-facing copy. */}
          {isInternal && error instanceof Error && (
            <Code block fz="xs">
              {error.message}
            </Code>
          )}
        </Stack>
      </Card>
    </Center>
  );
}
