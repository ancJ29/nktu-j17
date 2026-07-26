import { Box, HoverCard, Image, Tooltip } from '@mantine/core';
import { IconPackage } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import { useProductStore } from '@/stores/useProductStore';
import { hasImagesForProducts } from '@/utils/permission';
import { EntityAnchor, EntityChip, EntityDash, LINK_ICON_SIZE, type LinkSize } from './EntityLink';
import { PRODUCT_LINK_HIDES_SKU } from '@/config/productDisplayDefaults';

type ProductLinkProps = {
  
  code: string | undefined | null;
  
  name?: string | undefined | null;
  size?: LinkSize;
  
  photoOnHover?: boolean;
};

const noSku = PRODUCT_LINK_HIDES_SKU;
const productImagesEnabled = hasImagesForProducts();

export function ProductLink({ code, name, size = 'sm', photoOnHover = false }: ProductLinkProps) {
  const { t } = useTranslation();
  const product = useProductStore((s) => (code ? s.getByCode(code) : undefined));

  const displayName = name?.trim() || product?.name || '';
  if (!displayName) return <EntityDash size={size} />;

  const sku = noSku ? undefined : product?.extra?.sku?.trim();
  const label = sku ? `${displayName} · ${sku}` : displayName;
  const chip = (
    <EntityChip
      size={size}
      gap={4}
      lead={<IconPackage size={LINK_ICON_SIZE[size]} style={{ flexShrink: 0 }} />}
      label={label}
    />
  );

  const content: ReactNode = product ? (
    <EntityAnchor to={ROUTES.PRODUCTS.DETAIL.replace(':id', product.id)} size={size}>
      {chip}
    </EntityAnchor>
  ) : (
    chip
  );

  
  
  
  
  if (!photoOnHover || !productImagesEnabled || !product) return content;

  const photoUrl = product.extra?.images?.[0]?.url?.trim();
  const hoverTarget = <Box style={{ display: 'inline-flex', maxWidth: '100%' }}>{content}</Box>;

  if (!photoUrl) {
    return (
      <Tooltip label={t('products.detail.noPhotoHint')} withArrow position="top" openDelay={200}>
        {hoverTarget}
      </Tooltip>
    );
  }

  return (
    <HoverCard width={200} shadow="md" withArrow position="top" openDelay={200} closeDelay={80}>
      <HoverCard.Target>{hoverTarget}</HoverCard.Target>
      <HoverCard.Dropdown p={6}>
        <Image src={photoUrl} alt={displayName} w={188} mah={188} fit="contain" radius="sm" />
      </HoverCard.Dropdown>
    </HoverCard>
  );
}
