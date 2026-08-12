import type { ThemeConfig } from '@credo/kits/types';
import { brandPalettes, parsePalette, PALETTE_SHADE_COUNT } from '@credo/base-ui/utils';
import { Alert, Button, ColorSwatch, Group, Select, Stack, Text, Textarea } from '@mantine/core';
import { memo, useCallback, useMemo, useState } from 'react';

const BRAND_COLOR_OPTIONS = Object.keys(brandPalettes).map((key) => ({
  value: key,
  label: key[0].toUpperCase() + key.slice(1),
}));

const PALETTE_PLACEHOLDER = `[
  "#eaf3fb", "#d6e6f7", "#bcd6f0", "#9bc1e7", "#79aadb",
  "#5f91c6", "#4a76a9", "#3e618c", "#324e71", "#273c59"
]`;

function formatPalette(colors: readonly string[]): string {
  const head = colors
    .slice(0, 5)
    .map((c) => `"${c}"`)
    .join(', ');
  const tail = colors
    .slice(5)
    .map((c) => `"${c}"`)
    .join(', ');
  return `[\n  ${head},\n  ${tail}\n]`;
}

function ThemeColorOption({ value, label }: { value: string; label: string }) {
  const palette = brandPalettes[value];
  return (
    <Group gap="sm">
      <Group gap={2}>
        {palette &&
          [5, 7, 9].map((shade) => <ColorSwatch key={shade} color={palette[shade]} size={14} />)}
      </Group>
      <Text fz="sm">{label}</Text>
    </Group>
  );
}

function PaletteStrip({ colors }: { colors: readonly string[] }) {
  return (
    <Group gap={4}>
      {colors.map((color, i) => (
        <Stack key={i} gap={2} align="center">
          <ColorSwatch color={color} size={20} />
          <Text fz={9} c={i === 7 ? undefined : 'dimmed'} fw={i === 7 ? 700 : 400}>
            {i}
          </Text>
        </Stack>
      ))}
    </Group>
  );
}

export const ThemeConfigSection = memo(function ThemeConfigSection({
  theme,
  onChange,
}: {
  theme: ThemeConfig;
  onChange: (theme: ThemeConfig) => void;
}) {
  const namedPalette = brandPalettes[theme.mainColor];

  const [draft, setDraft] = useState(() =>
    theme.customPalette ? formatPalette(theme.customPalette) : '',
  );
  const [error, setError] = useState<string | null>(null);

  const handleDraft = useCallback(
    (raw: string) => {
      setDraft(raw);
      if (!raw.trim()) {
        setError(null);
        const { customPalette: _drop, ...rest } = theme;
        onChange(rest);
        return;
      }
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(raw);
      } catch {
        setError('Not valid JSON');
        return;
      }
      const palette = parsePalette(parsedJson);
      if (!palette) {
        setError(`Expected an array of exactly ${PALETTE_SHADE_COUNT} hex colors (e.g. "#3e618c")`);
        return;
      }
      setError(null);
      onChange({ ...theme, customPalette: [...palette] });
    },
    [onChange, theme],
  );

  const seedFromNamed = useCallback(() => {
    if (namedPalette) handleDraft(formatPalette([...namedPalette]));
  }, [handleDraft, namedPalette]);

  const clear = useCallback(() => handleDraft(''), [handleDraft]);

  const preview = useMemo(
    () => theme.customPalette ?? namedPalette,
    [theme.customPalette, namedPalette],
  );

  return (
    <Stack gap="sm">
      <Select
        label="Main Color"
        description="Also the Mantine color name the whole app resolves shades against."
        data={BRAND_COLOR_OPTIONS}
        value={theme.mainColor}
        onChange={(v) => v && onChange({ ...theme, mainColor: v })}
        size="sm"
        maw={300}
        renderOption={({ option }) => (
          <ThemeColorOption value={option.value} label={option.label} />
        )}
      />

      <Textarea
        label="Custom palette (optional)"
        description={`JSON array of ${PALETTE_SHADE_COUNT} hex shades — 0 lightest, 9 darkest, 7 is the brand color. Leave empty to use the named palette above. Takes effect on the client's next config reload.`}
        placeholder={PALETTE_PLACEHOLDER}
        value={draft}
        onChange={(e) => handleDraft(e.currentTarget.value)}
        error={error}
        autosize
        minRows={4}
        maxRows={10}
        styles={{ input: { fontFamily: 'var(--mantine-font-family-monospace)', fontSize: 12 } }}
      />

      <Group gap="xs">
        <Button size="xs" variant="default" onClick={seedFromNamed} disabled={!namedPalette}>
          Start from {theme.mainColor}
        </Button>
        <Button size="xs" variant="subtle" onClick={clear} disabled={!draft}>
          Clear
        </Button>
      </Group>

      {theme.customPalette && !error && (
        <Alert color="blue" variant="light" p="xs">
          <Text fz="xs">
            This palette overrides <b>{theme.mainColor}</b> for this client — every shade reference
            in the app (header, navbar, buttons, favicon, PWA theme color) resolves to it.
          </Text>
        </Alert>
      )}

      {preview && <PaletteStrip colors={preview} />}
    </Stack>
  );
});
