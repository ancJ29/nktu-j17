import { Box, Image } from '@mantine/core';
import { IconBox } from '@tabler/icons-react';
import type { Material } from '@/types';

type MaterialThumbProps = {
  readonly material: Material;
  readonly size?: number;
  readonly radius?: number | string;
};

export function MaterialThumb({ material, size = 40, radius = 8 }: MaterialThumbProps) {
  const url = material.extra?.images?.[0]?.url;
  return (
    <Box
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: radius,
        overflow: 'hidden',
        background: url
          ? 'var(--mantine-color-default-hover)'
          : 'linear-gradient(135deg, var(--mantine-color-default-hover), var(--mantine-color-default-border))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid var(--mantine-color-default-border)',
      }}
    >
      {url ? (
        <Image src={url} alt={material.name} w={size} h={size} fit="cover" />
      ) : (
        <IconBox
          size={Math.max(18, Math.floor(size * 0.45))}
          color="var(--mantine-color-dimmed)"
          stroke={1.5}
        />
      )}
    </Box>
  );
}
