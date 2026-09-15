import { Alert, Button, ColorSwatch, Group, Select, Stack, Text, Textarea } from '@mantine/core';
import { brandPalettes, PALETTE_SHADE_COUNT } from '@credo/base-ui/utils';
import {
  formatPalette,
  readPaletteState,
  resolvePalette,
  themeRejection,
  type ThemeForm,
} from './themeFields';

const PALETTE_OPTIONS = Object.keys(brandPalettes).map((value) => ({
  value,
  label: value[0].toUpperCase() + value.slice(1),
}));

const PALETTE_PLACEHOLDER = `[
  "#eaf3fb", "#d6e6f7", "#bcd6f0", "#9bc1e7", "#79aadb",
  "#5f91c6", "#4a76a9", "#3e618c", "#324e71", "#273c59"
]`;

function PaletteOption({ value, label }: { value: string; label: string }) {
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

export function ThemeSection({
  value,
  onChange,
}: {
  value: ThemeForm;
  onChange: (next: ThemeForm) => void;
}) {
  const namedPalette = brandPalettes[value.mainColor];
  const palette = readPaletteState(value.palette);
  const rejection = themeRejection(value);
  const preview = resolvePalette(value);

  return (
    <Stack gap="sm">
      <Select
        label="Main color"
        description="Also the Mantine color name every shade reference resolves through. Clear it to store no theme at all."
        data={PALETTE_OPTIONS}
        value={value.mainColor || null}
        onChange={(next) => onChange({ ...value, mainColor: next ?? '' })}
        renderOption={({ option }) => <PaletteOption value={option.value} label={option.label} />}
        size="sm"
        maw={320}
        clearable
      />

      <Textarea
        label="Custom palette (optional)"
        description={`JSON array of ${PALETTE_SHADE_COUNT} hex shades — 0 lightest, 9 darkest, 7 the brand color. It replaces the named palette's shades rather than adding a color, so every reference in the app follows. Empty keeps the named palette.`}
        placeholder={PALETTE_PLACEHOLDER}
        value={value.palette}
        onChange={(e) => onChange({ ...value, palette: e.currentTarget.value })}
        error={palette.kind === 'bad-json' ? palette.reason : null}
        autosize
        minRows={4}
        maxRows={10}
        spellCheck={false}
        styles={{ input: { fontFamily: 'var(--mantine-font-family-monospace)', fontSize: 12 } }}
      />

      <Group gap="xs">
        <Button
          size="xs"
          variant="default"
          disabled={!namedPalette}
          onClick={() =>
            namedPalette && onChange({ ...value, palette: formatPalette([...namedPalette]) })
          }
        >
          Start from {value.mainColor || 'a palette'}
        </Button>
        <Button
          size="xs"
          variant="subtle"
          disabled={!value.palette}
          onClick={() => onChange({ ...value, palette: '' })}
        >
          Clear
        </Button>
      </Group>

      {palette.kind === 'bad-json' && (
        <Alert color="yellow" variant="light" p="xs">
          <Text fz="xs">
            Not applied — a save leaves the stored palette exactly as it is. Fix the JSON or clear
            the box.
          </Text>
        </Alert>
      )}

      {rejection && (
        <Alert color="red" variant="light" title="The client would ignore this section" p="xs">
          <Text fz="xs">
            {rejection} The main color and the custom palette go down together, and the app boots on
            its own default.
          </Text>
        </Alert>
      )}

      {preview && <PaletteStrip colors={preview} />}
    </Stack>
  );
}
