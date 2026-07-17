import { Box, Group, SimpleGrid, Stack, Switch, Text, TextInput } from '@mantine/core';
import { memo } from 'react';
import type { AppInfo } from '../types';

export const AppInfoSection = memo(function AppInfoSection({
  app,
  version,
  languageSwitcher,
  onChange,
  onVersionChange,
  onLanguageSwitcherChange,
}: {
  app: AppInfo;
  version: string;
  languageSwitcher: boolean;
  onChange: (app: AppInfo) => void;
  onVersionChange: (v: string) => void;
  onLanguageSwitcherChange: (v: boolean) => void;
}) {
  return (
    <Stack gap="sm">
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
        <TextInput
          label="App Name"
          placeholder="e.g. My App"
          value={app.name}
          onChange={(e) => onChange({ ...app, name: e.currentTarget.value })}
          size="sm"
        />
        <TextInput
          label="Version"
          placeholder="e.g. 1.0.0"
          value={version}
          onChange={(e) => onVersionChange(e.currentTarget.value)}
          size="sm"
        />
      </SimpleGrid>
      <TextInput
        label="Description"
        placeholder="Short description of the app"
        value={app.description ?? ''}
        onChange={(e) => onChange({ ...app, description: e.currentTarget.value || undefined })}
        size="sm"
      />
      <TextInput
        label="Logo URL"
        placeholder="https://example.com/logo.png"
        value={app.logoUrl ?? ''}
        onChange={(e) => onChange({ ...app, logoUrl: e.currentTarget.value || undefined })}
        size="sm"
      />
      <TextInput
        label="Logo URL (Dark Background)"
        placeholder="https://example.com/logo-white.svg"
        value={app.logoDarkBgUrl ?? ''}
        onChange={(e) => onChange({ ...app, logoDarkBgUrl: e.currentTarget.value || undefined })}
        size="sm"
      />
      <TextInput
        label="Favicon URL"
        placeholder="https://example.com/favicon.svg"
        value={app.faviconUrl ?? ''}
        onChange={(e) => onChange({ ...app, faviconUrl: e.currentTarget.value || undefined })}
        size="sm"
      />
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
        <TextInput
          label="PWA Icon 192"
          placeholder="https://example.com/icon-192.png"
          value={app.pwaIcon192Url ?? ''}
          onChange={(e) => onChange({ ...app, pwaIcon192Url: e.currentTarget.value || undefined })}
          size="sm"
        />
        <TextInput
          label="PWA Icon 512"
          placeholder="https://example.com/icon-512.png"
          value={app.pwaIcon512Url ?? ''}
          onChange={(e) => onChange({ ...app, pwaIcon512Url: e.currentTarget.value || undefined })}
          size="sm"
        />
        <TextInput
          label="PWA Maskable"
          placeholder="https://example.com/maskable-512.png"
          value={app.pwaIconMaskableUrl ?? ''}
          onChange={(e) =>
            onChange({ ...app, pwaIconMaskableUrl: e.currentTarget.value || undefined })
          }
          size="sm"
        />
      </SimpleGrid>
      <Group
        justify="space-between"
        p="xs"
        style={{ borderRadius: 'var(--mantine-radius-sm)' }}
        bg={languageSwitcher ? undefined : 'var(--mantine-color-default-hover)'}
      >
        <Box>
          <Text fz="sm" fw={500}>
            Language Switcher
          </Text>
          <Text fz="xs" c="dimmed">
            Show language switcher in the header
          </Text>
        </Box>
        <Switch
          checked={languageSwitcher}
          onChange={(e) => onLanguageSwitcherChange(e.currentTarget.checked)}
        />
      </Group>
    </Stack>
  );
});
