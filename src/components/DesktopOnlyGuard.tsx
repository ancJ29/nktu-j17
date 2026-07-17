import { Center, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconDeviceDesktop } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { device } from '@credo/base-ui/utils';

type DesktopOnlyGuardProps = {
  children: ReactNode;
};

const isMobile = device.isMobile;

export function DesktopOnlyGuard({ children }: DesktopOnlyGuardProps) {
  const { t } = useTranslation();

  if (isMobile) {
    return (
      <Center mih="60vh">
        <Stack align="center" gap="md">
          <ThemeIcon size={64} radius="xl" variant="light" color="gray">
            <IconDeviceDesktop size={32} />
          </ThemeIcon>
          <Text size="lg" fw={500}>
            {t('common.desktopOnly.title')}
          </Text>
          <Text size="sm" c="dimmed" ta="center" maw={320}>
            {t('common.desktopOnly.message')}
          </Text>
        </Stack>
      </Center>
    );
  }

  return children;
}
