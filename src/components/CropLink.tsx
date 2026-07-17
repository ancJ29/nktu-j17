import { useMemo } from 'react';
import { IconPlant2 } from '@tabler/icons-react';
import { ROUTES } from '@/constants/routes';
import { useCropStore } from '@/stores/useCropStores';
import {
  EntityAnchor,
  EntityChip,
  EntityDash,
  JoinedLinks,
  LINK_ICON_SIZE,
  type LinkSize,
} from './EntityLink';

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

type CropLinksProps = {
  
  codes?: string[];
  size?: LinkSize;
};

export function CropLinks({ codes, size = 'sm' }: CropLinksProps) {
  const getByCode = useCropStore((s) => s.getByCode);
  
  
  useCropStore((s) => s.items);

  const resolved = useMemo(
    () =>
      (codes ?? []).map((code) => {
        const crop = getByCode(code);
        return { code, name: crop?.name ?? code, detailId: crop?.id };
      }),
    [codes, getByCode],
  );

  return (
    <JoinedLinks
      size={size}
      items={resolved}
      keyOf={(c) => c.code}
      renderItem={(c) => {
        const chip = <EntityChip size={size} lead={leaf(size)} label={c.name} />;
        return c.detailId ? (
          <EntityAnchor to={ROUTES.CROPS.DETAIL.replace(':id', c.detailId)} size={size}>
            {chip}
          </EntityAnchor>
        ) : (
          chip
        );
      }}
    />
  );
}
