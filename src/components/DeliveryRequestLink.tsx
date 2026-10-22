import { IconTruckDelivery } from '@tabler/icons-react';
import { useMemo } from 'react';
import { ROUTES } from '@/constants/routes';
import { useDeliveryRequestStore } from '@/stores/useDeliveryRequestStore';
import { EntityAnchor, EntityChip, EntityDash, LINK_ICON_SIZE, type LinkSize } from './EntityLink';

type DeliveryRequestLinkProps = {
  id: string | undefined | null;
  size?: LinkSize;
  color?: string;

  fallbackLabel?: string | null;
};

function DeliveryRequestIcon({ size }: { size: LinkSize }) {
  return <IconTruckDelivery size={LINK_ICON_SIZE[size]} stroke={1.75} style={{ flexShrink: 0 }} />;
}

export function DeliveryRequestLink({
  id,
  size = 'sm',
  color = 'inherit',
  fallbackLabel = null,
}: DeliveryRequestLinkProps) {
  const items = useDeliveryRequestStore((s) => s.items);

  const dr = useMemo(() => (id ? items.find((d) => d.id === id) : undefined), [id, items]);

  if (!id) return <EntityDash size={size} />;
  const label = dr?.requestNumber ?? fallbackLabel ?? '';
  if (!label) return <EntityDash size={size} />;

  return (
    <EntityAnchor to={ROUTES.DELIVERY.DETAIL.replace(':id', id)} size={size}>
      <EntityChip
        size={size}
        lead={<DeliveryRequestIcon size={size} />}
        label={label}
        color={color}
        monospace
      />
    </EntityAnchor>
  );
}
