import { IconTruck } from '@tabler/icons-react';
import { useMemo } from 'react';
import { ROUTES } from '@/constants/routes';
import { useTruckAssetStore } from '@/stores/useTruckAssetStore';
import { perms } from '@/utils/permission';
import { featureFlags } from '@/utils/features';
import { EntityAnchor, EntityChip, EntityDash, LINK_ICON_SIZE, type LinkSize } from './EntityLink';

type TruckLinkProps = {
  
  id: string | undefined | null;
  
  fallbackLabel?: string | null;
  size?: LinkSize;
};

function TruckIcon({ size }: { size: LinkSize }) {
  return <IconTruck size={LINK_ICON_SIZE[size]} stroke={1.75} style={{ flexShrink: 0 }} />;
}

export function TruckLink({ id, fallbackLabel, size = 'sm' }: TruckLinkProps) {
  const items = useTruckAssetStore((s) => s.items);
  const truck = useMemo(() => (id ? items.find((tr) => tr.id === id) : undefined), [id, items]);

  if (!id) return <EntityDash size={size} />;
  const label = truck?.name ?? fallbackLabel ?? '';
  if (!label) return <EntityDash size={size} />;

  const chip = (
    <EntityChip size={size} lead={<TruckIcon size={size} />} label={label} color="blue" />
  );

  const reachable = featureFlags.trucks.enabled && perms.truck.canView();
  if (!reachable) return chip;

  return (
    <EntityAnchor to={ROUTES.ASSETS.TRUCKS.DETAIL.replace(':id', id)} size={size}>
      {chip}
    </EntityAnchor>
  );
}
