import type { AuthFeatures } from '@credo/kits/types';
import { Box, Group, SimpleGrid, Switch, Text, ThemeIcon } from '@mantine/core';
import { IconQrcode, IconShield } from '@tabler/icons-react';
import { memo } from 'react';

type AuthFlagDef = {
  key: keyof AuthFeatures;
  icon: typeof IconShield;
};

const AUTH_FLAG_DEFS: AuthFlagDef[] = [{ key: 'loginViaQRCode', icon: IconQrcode }];

const AUTH_LABELS: Record<string, string> = {
  authLoginViaQRCode: 'Login via QR Code',
  authLoginViaQRCodeDesc: 'Allow users to login via QR Code',
};

export const AuthFeaturesSection = memo(function AuthFeaturesSection({
  auth,
  onChange,
}: {
  auth: AuthFeatures;
  onChange: (auth: AuthFeatures) => void;
}) {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
      {AUTH_FLAG_DEFS.map(({ key, icon: FlagIcon }) => (
        <Group
          key={key}
          justify="space-between"
          p="xs"
          style={{ borderRadius: 'var(--mantine-radius-sm)' }}
          bg={auth[key] ? undefined : 'var(--mantine-color-default-hover)'}
          wrap="nowrap"
        >
          <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
            <ThemeIcon variant="light" size="sm" color={auth[key] ? 'teal' : 'gray'}>
              <FlagIcon size={14} />
            </ThemeIcon>
            <Box>
              <Text fz="sm" fw={500}>
                {AUTH_LABELS[`auth${key[0].toUpperCase()}${key.slice(1)}`] ?? key}
              </Text>
              <Text fz="xs" c="dimmed">
                {AUTH_LABELS[`auth${key[0].toUpperCase()}${key.slice(1)}Desc`] ?? key}
              </Text>
            </Box>
          </Group>
          <Switch
            checked={auth[key]}
            onChange={() => onChange({ ...auth, [key]: !auth[key] })}
            style={{ flexShrink: 0 }}
          />
        </Group>
      ))}
    </SimpleGrid>
  );
});
