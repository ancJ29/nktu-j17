import { IconBuildingStore } from '@tabler/icons-react';
import { ROUTES } from '@/constants/routes';
import { featureFlags } from '@/config';
import { useVendorV2Store } from '@/stores/useVendorV2Store';
import { EntityAnchor, EntityChip, EntityDash, LINK_ICON_SIZE } from '../EntityLink';
import { chipLabelParts, type EntityLinkV2Props } from './entityLinkV2';

export function VendorV2Link({
  id,
  fallbackLabel,
  fallbackCode,
  codeBelow,
  withoutIcon,
  size = 'sm',
}: EntityLinkV2Props) {
  const vendor = useVendorV2Store((s) => (id ? s.getById(id) : undefined));
  const label = vendor?.name?.trim() || fallbackLabel?.trim() || '';
  if (!label) return <EntityDash size={size} />;

  const chip = (
    <EntityChip
      size={size}
      gap={4}
      lead={
        withoutIcon ? undefined : (
          <IconBuildingStore size={LINK_ICON_SIZE[size]} style={{ flexShrink: 0 }} />
        )
      }
      {...chipLabelParts(label, vendor?.code ?? fallbackCode, codeBelow)}
    />
  );

  if (!vendor || !featureFlags.vendorsV2.enabled) return chip;

  return (
    <EntityAnchor to={ROUTES.VENDORS_V2.DETAIL.replace(':id', vendor.id)} size={size}>
      {chip}
    </EntityAnchor>
  );
}
