import { IconPackage } from '@tabler/icons-react';
import { ROUTES } from '@/constants/routes';
import { featureFlags } from '@/config';
import { useProductV2Store } from '@/stores/useProductV2Store';
import { EntityAnchor, EntityChip, EntityDash, LINK_ICON_SIZE } from '../EntityLink';
import { chipLabelParts, type EntityLinkV2Props } from './entityLinkV2';

export function ProductV2Link({
  id,
  fallbackLabel,
  fallbackCode,
  codeBelow,
  withoutIcon,
  size = 'sm',
}: EntityLinkV2Props) {
  const product = useProductV2Store((s) => (id ? s.getById(id) : undefined));
  const label = product?.name?.trim() || fallbackLabel?.trim() || '';
  if (!label) return <EntityDash size={size} />;

  const chip = (
    <EntityChip
      size={size}
      gap={4}
      lead={
        withoutIcon ? undefined : (
          <IconPackage size={LINK_ICON_SIZE[size]} style={{ flexShrink: 0 }} />
        )
      }
      {...chipLabelParts(label, product?.code ?? fallbackCode, codeBelow)}
    />
  );

  if (!product || !featureFlags.productsV2.enabled) return chip;

  return (
    <EntityAnchor to={ROUTES.PRODUCTS_V2.DETAIL.replace(':id', product.id)} size={size}>
      {chip}
    </EntityAnchor>
  );
}
