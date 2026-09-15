import { IconStack2 } from '@tabler/icons-react';
import { ROUTES } from '@/constants/routes';
import { featureFlags } from '@/config';
import { useMaterialV2Store } from '@/stores/useMaterialV2Store';
import { EntityAnchor, EntityChip, EntityDash, LINK_ICON_SIZE } from '../EntityLink';
import { chipLabelParts, type EntityLinkV2Props } from './entityLinkV2';

export function MaterialV2Link({
  id,
  fallbackLabel,
  fallbackCode,
  codeBelow,
  withoutIcon,
  size = 'sm',
}: EntityLinkV2Props) {
  const material = useMaterialV2Store((s) => (id ? s.getById(id) : undefined));
  const label = material?.name?.trim() || fallbackLabel?.trim() || '';
  if (!label) return <EntityDash size={size} />;

  const chip = (
    <EntityChip
      size={size}
      gap={4}
      lead={
        withoutIcon ? undefined : (
          <IconStack2 size={LINK_ICON_SIZE[size]} style={{ flexShrink: 0 }} />
        )
      }
      {...chipLabelParts(label, material?.code ?? fallbackCode, codeBelow)}
    />
  );

  if (!material || !featureFlags.materialsV2.enabled) return chip;

  return (
    <EntityAnchor to={ROUTES.MATERIALS_V2.DETAIL.replace(':id', material.id)} size={size}>
      {chip}
    </EntityAnchor>
  );
}
