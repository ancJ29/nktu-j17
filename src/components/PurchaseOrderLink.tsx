import { IconFileText } from '@tabler/icons-react';
import { useMemo } from 'react';
import { ROUTES } from '@/constants/routes';
import { usePurchaseOrderStore } from '@/stores/usePurchaseOrderStore';
import { EntityAnchor, EntityChip, EntityDash, LINK_ICON_SIZE, type LinkSize } from './EntityLink';

type PurchaseOrderLinkProps = {
  id: string | undefined | null;

  fallbackLabel?: string | null;
  size?: LinkSize;
  color?: string;
};

export function PurchaseOrderLink({
  id,
  fallbackLabel,
  size = 'sm',
  color = 'blue',
}: PurchaseOrderLinkProps) {
  const items = usePurchaseOrderStore((s) => s.items);
  const po = useMemo(() => (id ? items.find((o) => o.id === id) : undefined), [id, items]);

  if (!id) return <EntityDash size={size} />;
  const label = po?.orderNumber ?? fallbackLabel ?? '';
  if (!label) return <EntityDash size={size} />;

  return (
    <EntityAnchor to={ROUTES.PURCHASE_ORDERS.DETAIL.replace(':id', id)} size={size}>
      <EntityChip
        size={size}
        lead={<IconFileText size={LINK_ICON_SIZE[size]} stroke={1.75} style={{ flexShrink: 0 }} />}
        label={label}
        color={color}
        monospace
      />
    </EntityAnchor>
  );
}
