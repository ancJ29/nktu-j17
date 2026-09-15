import { Box, Stack, Text, Textarea, TextInput } from '@mantine/core';
import { AppBrandName } from '@credo/base-ui/components';
import { themeConfig } from '@/config';
import type { AppIdentityForm } from './appIdentityFields';

const NAME_HTML_PLACEHOLDER =
  '<div><span style="color: #1062ac;">CLIENT</span> <span style="color: #f28526;">NAME</span></div>';

export function AppIdentitySection({
  value,
  palette,
  onChange,
}: {
  value: AppIdentityForm;

  palette: readonly string[] | undefined;
  onChange: (next: AppIdentityForm) => void;
}) {
  const headerBg = palette?.[9] ?? `var(--mantine-color-${themeConfig.mainColor}-9)`;

  return (
    <Stack gap="sm">
      <TextInput
        label="App name"
        description="The browser tab title, the PWA / home-screen name, and every logo's alt text. Required — it is the fallback the two fields below are styled against."
        placeholder="e.g. Acme Logistics"
        value={value.name}
        onChange={(e) => onChange({ ...value, name: e.currentTarget.value })}
        error={value.name.trim() ? null : 'Required — a save is refused while this is empty.'}
        autoComplete="off"
        spellCheck={false}
        size="sm"
      />

      <Textarea
        label="App name (HTML)"
        description="Optional. Rendered in the app header INSTEAD of the plain name — for two-tone brands. The tab title and the manifest keep using the plain name, so clearing this changes the header only. Allowed: div, span, p, b, strong, i, em, u, s, small, sub, sup, br + style/class; anything else is stripped at render."
        placeholder={NAME_HTML_PLACEHOLDER}
        value={value.nameHtml}
        onChange={(e) => onChange({ ...value, nameHtml: e.currentTarget.value })}
        autosize
        minRows={2}
        maxRows={6}
        spellCheck={false}
        size="sm"
        styles={{ input: { fontFamily: 'var(--mantine-font-family-monospace)', fontSize: 12 } }}
      />

      {/* The header is the one surface that renders the rich form, so it is the
          one worth previewing — and it runs the SAME sanitizer the client will,
          which is what makes a stripped tag visible here rather than in prod. */}
      <Box>
        <Text size="xs" c="dimmed" mb={4}>
          Header preview — sanitized, on this client&apos;s own header colour
        </Text>
        <Box p="sm" bg={headerBg} style={{ borderRadius: 4 }}>
          <AppBrandName name={value.name} nameHtml={value.nameHtml} size="lg" fw={700} c="white" />
        </Box>
      </Box>

      <TextInput
        label="Description"
        description="The PWA manifest's description. Empty falls back to the app name."
        placeholder="Short description of the app"
        value={value.description}
        onChange={(e) => onChange({ ...value, description: e.currentTarget.value })}
        autoComplete="off"
        size="sm"
      />
    </Stack>
  );
}
