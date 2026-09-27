import {
  Button,
  Card,
  Center,
  Code,
  CopyButton,
  Group,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { IconAlertTriangle, IconCheck, IconCopy, IconRefresh } from '@tabler/icons-react';
import { useLocation, useRouteError } from 'react-router';
import { useTranslation } from 'react-i18next';
import { isChunkLoadError } from '@credo/base-ui/utils';
import { buildHash, version } from '@/config/build-version';

export function RouteErrorState() {
  const { t } = useTranslation();
  const error = useRouteError();
  const location = useLocation();
  const isStaleChunk = isChunkLoadError(error);

  const stack =
    error instanceof Error && error.stack
      ? error.stack.split('\n').slice(1, 5).join('\n').slice(0, 600)
      : '';

  const details = [
    `path: ${location.pathname}`,
    `error: ${error instanceof Error ? `${error.name}: ${error.message}` : String(error ?? 'unknown')}`,
    stack,
    `build: ${version} (${buildHash})`,
    `at: ${new Date().toLocaleString()}`,
  ]
    .filter(Boolean)
    .join('\n');

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
          <Stack gap={6} w="100%">
            <Text size="xs" c="dimmed" ta="center">
              {t('error.sendScreenshot')}
            </Text>
            <Code
              block
              fz={10}
              style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', userSelect: 'text' }}
            >
              {details}
            </Code>
            <Group justify="center">
              <CopyButton value={details}>
                {({ copied, copy }) => (
                  <Button
                    size="compact-xs"
                    variant="light"
                    color={copied ? 'teal' : 'gray'}
                    leftSection={copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
                    onClick={copy}
                  >
                    {copied ? t('error.copied') : t('error.copyDetails')}
                  </Button>
                )}
              </CopyButton>
            </Group>
          </Stack>
        </Stack>
      </Card>
    </Center>
  );
}
