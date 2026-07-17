import { Box, Image } from '@mantine/core';
import { IconPackage } from '@tabler/icons-react';
import type { Product } from '@/types';

type ProductThumbProps = {
  readonly product: Product;
  readonly size?: number;
  readonly radius?: number | string;
};

export function ProductThumb({ product, size = 40, radius = 8 }: ProductThumbProps) {
  const url = product.extra?.images?.[0]?.url;
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
        <Image src={url} alt={product.name} w={size} h={size} fit="cover" />
      ) : (
        <IconPackage
          size={Math.max(18, Math.floor(size * 0.45))}
          color="var(--mantine-color-dimmed)"
          stroke={1.5}
        />
      )}
    </Box>
  );
}
