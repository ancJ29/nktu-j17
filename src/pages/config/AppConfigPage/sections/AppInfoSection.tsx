import { Box, Group, SimpleGrid, Stack, Switch, Text, Textarea, TextInput } from '@mantine/core';
import { memo } from 'react';
import { AppBrandName } from '@credo/base-ui/components';
import { themeConfig } from '@/config';
import type { AppInfo } from '../types';

export const AppInfoSection = memo(function AppInfoSection({
  app,
  version,
  languageSwitcher,
  enablePdfSharing,
  enableStats,
  notifyNewVersion,
  onChange,
  onVersionChange,
  onLanguageSwitcherChange,
  onEnablePdfSharingChange,
  onEnableStatsChange,
  onNotifyNewVersionChange,
}: {
  app: AppInfo;
  version: string;
  languageSwitcher: boolean;
  enablePdfSharing: boolean;
  enableStats: boolean;
  notifyNewVersion: boolean;
  onChange: (app: AppInfo) => void;
  onVersionChange: (v: string) => void;
  onLanguageSwitcherChange: (v: boolean) => void;
  onEnablePdfSharingChange: (v: boolean) => void;
  onEnableStatsChange: (v: boolean) => void;
  onNotifyNewVersionChange: (v: boolean) => void;
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
      <Textarea
        label="App Name (HTML)"
        description="Optional. Rendered in the app header instead of App Name — for two-tone / styled brands. Leave empty to show the plain App Name. Allowed: div, span, b, strong, i, em, u, s, small, sub, sup, br + style/class; anything else is stripped."
        placeholder={
          '<div><span style="color: #1062ac;">CLIENT</span> <span style="color: #f28526;">NAME</span></div>'
        }
        value={app.nameHtml ?? ''}
        onChange={(e) => onChange({ ...app, nameHtml: e.currentTarget.value || undefined })}
        autosize
        minRows={2}
        size="sm"
        styles={{ input: { fontFamily: 'monospace' } }}
      />
      {app.nameHtml?.trim() && (
        <Box>
          <Text size="xs" c="dimmed" mb={4}>
            Preview (sanitized, on the header background)
          </Text>
          {/* The running app's own header colour — the editor may be pointed at
              another client, but this preview is about the markup, not the theme. */}
          <Box
            p="sm"
            style={{ borderRadius: 4 }}
            bg={`var(--mantine-color-${themeConfig.mainColor}-9)`}
          >
            <AppBrandName name={app.name} nameHtml={app.nameHtml} size="lg" fw={600} c="white" />
          </Box>
        </Box>
      )}
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
        wrap="nowrap"
      >
        <Box style={{ flex: 1, minWidth: 0 }}>
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
          style={{ flexShrink: 0 }}
        />
      </Group>
      <Group
        justify="space-between"
        p="xs"
        style={{ borderRadius: 'var(--mantine-radius-sm)' }}
        bg={enablePdfSharing ? undefined : 'var(--mantine-color-default-hover)'}
        wrap="nowrap"
      >
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text fz="sm" fw={500}>
            Share PDF
          </Text>
          <Text fz="xs" c="dimmed">
            Show the &quot;Share PDF&quot; button on quotations (native share sheet / download)
          </Text>
        </Box>
        <Switch
          checked={enablePdfSharing}
          onChange={(e) => onEnablePdfSharingChange(e.currentTarget.checked)}
          style={{ flexShrink: 0 }}
        />
      </Group>
      <Group
        justify="space-between"
        p="xs"
        style={{ borderRadius: 'var(--mantine-radius-sm)' }}
        bg={enableStats ? undefined : 'var(--mantine-color-default-hover)'}
        wrap="nowrap"
      >
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text fz="sm" fw={500}>
            List Stats
          </Text>
          <Text fz="xs" c="dimmed">
            Show the stats panel (per-status count cards) above the filter bar on list pages
          </Text>
        </Box>
        <Switch
          checked={enableStats}
          onChange={(e) => onEnableStatsChange(e.currentTarget.checked)}
          style={{ flexShrink: 0 }}
        />
      </Group>
      <Group
        justify="space-between"
        p="xs"
        style={{ borderRadius: 'var(--mantine-radius-sm)' }}
        bg={notifyNewVersion ? undefined : 'var(--mantine-color-default-hover)'}
        wrap="nowrap"
      >
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text fz="sm" fw={500}>
            New Version Notice
          </Text>
          <Text fz="xs" c="dimmed">
            Announce a newly deployed version with a toast. Off (the default) does not stop the
            update — the app just updates silently instead of asking.
          </Text>
        </Box>
        <Switch
          checked={notifyNewVersion}
          onChange={(e) => onNotifyNewVersionChange(e.currentTarget.checked)}
          style={{ flexShrink: 0 }}
        />
      </Group>
    </Stack>
  );
});
