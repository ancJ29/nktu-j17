import type { ThemeConfig } from '@credo/kits/types';
import { brandPalettes } from '@credo/base-ui/utils';
import { ColorSwatch, Group, Select, Text } from '@mantine/core';
import { memo } from 'react';

const BRAND_COLOR_OPTIONS = Object.keys(brandPalettes).map((key) => ({
  value: key,
  label: key[0].toUpperCase() + key.slice(1),
}));

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

export const ThemeConfigSection = memo(function ThemeConfigSection({
  theme,
  onChange,
}: {
  theme: ThemeConfig;
  onChange: (theme: ThemeConfig) => void;
}) {
  const selectedPalette = brandPalettes[theme.mainColor];

  return (
    <>
      <Select
        label="Main Color"
        data={BRAND_COLOR_OPTIONS}
        value={theme.mainColor}
        onChange={(v) => v && onChange({ ...theme, mainColor: v })}
        size="sm"
        maw={300}
        renderOption={({ option }) => (
          <ThemeColorOption value={option.value} label={option.label} />
        )}
      />
      {selectedPalette && (
        <Group gap={4} mt="sm">
          {selectedPalette.map((color, i) => (
            <ColorSwatch key={i} color={color} size={20} />
          ))}
        </Group>
      )}
    </>
  );
});
