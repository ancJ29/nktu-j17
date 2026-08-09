import { IconPlant2 } from '@tabler/icons-react';
import { ROUTES } from '@/constants/routes';
import { useCropStore } from '@/stores/useCropStores';
import { EntityAnchor, EntityChip, EntityDash, LINK_ICON_SIZE, type LinkSize } from './EntityLink';

function leaf(size: LinkSize) {
  return (
    <IconPlant2 size={LINK_ICON_SIZE[size]} stroke={1.75} color="var(--mantine-color-dimmed)" />
  );
}

type CropLinkProps = {
  code?: string | undefined | null;
  size?: LinkSize;
  noIcon?: boolean;
};

export function CropLink({ code, size = 'sm', noIcon = false }: CropLinkProps) {
  const crop = useCropStore((s) => (code ? s.getByCode(code) : undefined));

  const name = crop?.name ?? '';
  const detailId = crop?.id;

  if (!name || !detailId) return <EntityDash size={size} />;

  return (
    <EntityAnchor to={ROUTES.CROPS.DETAIL.replace(':id', detailId)} size={size}>
      <EntityChip size={size} lead={noIcon ? undefined : leaf(size)} label={name} />
    </EntityAnchor>
  );
}
