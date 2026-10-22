import { IconBuildingWarehouse } from '@tabler/icons-react';
import { ROUTES } from '@/constants/routes';
import { useVendorStore } from '@/stores/useVendorStore';
import { EntityAnchor, EntityChip, EntityDash, LINK_ICON_SIZE, type LinkSize } from './EntityLink';

type VendorLinkProps = {
  
  code: string | undefined | null;
  
  name?: string | undefined | null;
  size?: LinkSize;
};

export function VendorLink({ code, name, size = 'sm' }: VendorLinkProps) {
  const vendor = useVendorStore((s) => (code ? s.getByCode(code) : undefined));

  const displayName = name?.trim() || vendor?.extra?.shortName || vendor?.name || '';
  if (!displayName) return <EntityDash size={size} />;

  const chip = (
    <EntityChip
      size={size}
      gap={4}
      lead={<IconBuildingWarehouse size={LINK_ICON_SIZE[size]} style={{ flexShrink: 0 }} />}
      label={displayName}
    />
  );

  if (!vendor) return chip;

  return (
    <EntityAnchor to={ROUTES.VENDORS.DETAIL.replace(':id', vendor.id)} size={size}>
      {chip}
    </EntityAnchor>
  );
}
