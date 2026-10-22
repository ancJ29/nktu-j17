import { IconBox } from '@tabler/icons-react';
import { useMemo } from 'react';
import { ROUTES } from '@/constants/routes';
import { useMaterialStore } from '@/stores/useMaterialStore';
import { EntityAnchor, EntityChip, EntityDash, LINK_ICON_SIZE, type LinkSize } from './EntityLink';

type MaterialLinkProps = {
  
  code: string | undefined | null;
  
  name?: string | undefined | null;
  size?: LinkSize;
};

export function MaterialLink({ code, name, size = 'sm' }: MaterialLinkProps) {
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

  return material ? (
    <EntityAnchor to={ROUTES.MATERIALS.DETAIL.replace(':id', material.id)} size={size}>
      {chip}
    </EntityAnchor>
  ) : (
    chip
  );
}
