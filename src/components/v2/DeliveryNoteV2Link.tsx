import { IconTruckDelivery } from '@tabler/icons-react';
import { ROUTES } from '@/constants/routes';
import { featureFlags } from '@/config';
import { EntityAnchor, EntityChip, EntityDash, LINK_ICON_SIZE } from '../EntityLink';
import type { EntityLinkV2Props } from './entityLinkV2';

export function DeliveryNoteV2Link({
  id,
  fallbackLabel,
  withoutIcon,
  size = 'sm',
}: EntityLinkV2Props) {
  const label = fallbackLabel?.trim() || '';
  if (!label) return <EntityDash size={size} />;

  const chip = (
    <EntityChip
      size={size}
      gap={4}
      lead={
        withoutIcon ? undefined : (
          <IconTruckDelivery size={LINK_ICON_SIZE[size]} style={{ flexShrink: 0 }} />
        )
      }
      label={label}
    />
  );

  if (!id || !featureFlags.deliveryNotesV2.enabled) return chip;

  return (
    <EntityAnchor to={ROUTES.DELIVERY_NOTES_V2.DETAIL.replace(':id', id)} size={size}>
      {chip}
    </EntityAnchor>
  );
}
