import { Box, Image } from '@mantine/core';
import { IconPackage } from '@tabler/icons-react';
import type { ReactNode } from 'react';

type RecordThumbProps = {
  readonly url?: string;
  readonly alt: string;
  readonly size?: number;
  readonly radius?: number | string;

  readonly icon?: ReactNode;
};

export function RecordThumb({ url, alt, size = 40, radius = 8, icon }: RecordThumbProps) {
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
        <Image src={url} alt={alt} w={size} h={size} fit="cover" />
      ) : (
        (icon ?? (
          <IconPackage
            size={Math.max(18, Math.floor(size * 0.45))}
            color="var(--mantine-color-dimmed)"
            stroke={1.5}
          />
        ))
      )}
    </Box>
  );
}
