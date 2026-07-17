import { IconBuilding } from '@tabler/icons-react';
import { ROUTES } from '@/constants/routes';
import { useCustomerStore } from '@/stores/useCustomerStore';
import { EntityAnchor, EntityChip, EntityDash, LINK_ICON_SIZE, type LinkSize } from './EntityLink';

type CustomerLinkProps = {
  
  code?: string | null;
  
  name?: string | null;
  
  fallbackLabel?: string | null;
  size?: LinkSize;
};

export function CustomerLink({ code, name, fallbackLabel, size = 'sm' }: CustomerLinkProps) {
  const getCustomerByCode = useCustomerStore((s) => s.getByCode);

  let displayName = name?.trim() || undefined;
  let detailId: string | undefined;
  
  
  if (!displayName && code) {
    const customer = getCustomerByCode(code);
    if (customer) {
      displayName = customer.extra?.shortName || customer.name;
      detailId = customer.id;
    }
  }
  
  
  displayName ??= fallbackLabel?.trim() || undefined;

  if (!displayName) return <EntityDash size={size} />;

  const chip = (
    <EntityChip
      size={size}
      gap={4}
      lead={<IconBuilding size={LINK_ICON_SIZE[size]} style={{ flexShrink: 0 }} />}
      label={displayName}
    />
  );

  if (!detailId) return chip;

  return (
    <EntityAnchor to={ROUTES.CUSTOMERS.DETAIL.replace(':id', detailId)} size={size}>
      {chip}
    </EntityAnchor>
  );
}
