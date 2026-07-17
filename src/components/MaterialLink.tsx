import { Box, HoverCard, Image, Tooltip } from '@mantine/core';
import { IconBox } from '@tabler/icons-react';
import { useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/constants/routes';
import { useMaterialStore } from '@/stores/useMaterialStore';
import { hasMaterialImages } from '@/utils/materialConfig';
import { EntityAnchor, EntityChip, EntityDash, LINK_ICON_SIZE, type LinkSize } from './EntityLink';

type MaterialLinkProps = {
  
  code: string | undefined | null;
  
  name?: string | undefined | null;
  size?: LinkSize;
  
  photoOnHover?: boolean;
};

const materialImagesEnabled = hasMaterialImages();

export function MaterialLink({ code, name, size = 'sm', photoOnHover = false }: MaterialLinkProps) {
  const { t } = useTranslation();
  const materials = useMaterialStore((s) => s.items);
  const material = useMemo(
    () => (code ? materials.find((m) => m.code === code) : undefined),
    [code, materials],
  );

  const displayName = name?.trim() || material?.name || '';
  if (!displayName) return <EntityDash size={size} />;

  const chip = (
    <EntityChip
      size={size}
      gap={4}
      lead={<IconBox size={LINK_ICON_SIZE[size]} style={{ flexShrink: 0 }} />}
      label={displayName}
    />
  );

  const content: ReactNode = material ? (
    <EntityAnchor to={ROUTES.MATERIALS.DETAIL.replace(':id', material.id)} size={size}>
      {chip}
    </EntityAnchor>
  ) : (
    chip
  );

  
  
  
  
  if (!photoOnHover || !materialImagesEnabled || !material) return content;

  const photoUrl = material.extra?.images?.[0]?.url?.trim();
  const hoverTarget = <Box style={{ display: 'inline-flex', maxWidth: '100%' }}>{content}</Box>;

  if (!photoUrl) {
    return (
      <Tooltip label={t('materials.detail.noPhotoHint')} withArrow position="top" openDelay={200}>
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
