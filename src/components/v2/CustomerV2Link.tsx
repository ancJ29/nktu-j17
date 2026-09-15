import { IconUser } from '@tabler/icons-react';
import { ROUTES } from '@/constants/routes';
import { featureFlags } from '@/config';
import { useCustomerV2Store } from '@/stores/useCustomerV2Store';
import { EntityAnchor, EntityChip, EntityDash, LINK_ICON_SIZE } from '../EntityLink';
import { chipLabelParts, type EntityLinkV2Props } from './entityLinkV2';

export function CustomerV2Link({
  id,
  fallbackLabel,
  fallbackCode,
  codeBelow,
  withoutIcon,
  size = 'sm',
}: EntityLinkV2Props) {
  const customer = useCustomerV2Store((s) => (id ? s.getById(id) : undefined));
  const label = customer?.name?.trim() || fallbackLabel?.trim() || '';
  if (!label) return <EntityDash size={size} />;

  const chip = (
    <EntityChip
      size={size}
      gap={4}
      lead={
        withoutIcon ? undefined : <IconUser size={LINK_ICON_SIZE[size]} style={{ flexShrink: 0 }} />
      }
      {...chipLabelParts(label, customer?.code ?? fallbackCode, codeBelow)}
    />
  );

  if (!customer || !featureFlags.customersV2.enabled) return chip;

  return (
    <EntityAnchor to={ROUTES.CUSTOMERS_V2.DETAIL.replace(':id', customer.id)} size={size}>
      {chip}
    </EntityAnchor>
  );
}
