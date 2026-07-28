import { IconTruckDelivery } from '@tabler/icons-react';
import { ROUTES } from '@/constants/routes';
import { useTransportOrderStore } from '@/stores/useTransportOrderStore';
import { EntityAnchor, EntityChip, EntityDash, LINK_ICON_SIZE, type LinkSize } from './EntityLink';

type TransportOrderLinkProps = {
  id: string | undefined | null;

  fallbackLabel?: string | null;
  size?: LinkSize;
};

export function TransportOrderLink({ id, fallbackLabel, size = 'sm' }: TransportOrderLinkProps) {
  const order = useTransportOrderStore((s) => (id ? s.getById(id) : undefined));

  if (!id) return <EntityDash size={size} />;
  const label = order?.orderNumber ?? fallbackLabel ?? '';
  if (!label) return <EntityDash size={size} />;

  return (
    <EntityAnchor to={ROUTES.TRANSPORT_ORDERS.DETAIL.replace(':id', id)} size={size}>
      <EntityChip
        size={size}
        lead={
          <IconTruckDelivery size={LINK_ICON_SIZE[size]} stroke={1.75} style={{ flexShrink: 0 }} />
        }
        label={label}
        color="blue"
        monospace
      />
    </EntityAnchor>
  );
}
