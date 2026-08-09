import { IconFileText } from '@tabler/icons-react';
import { useMemo } from 'react';
import { ROUTES } from '@/constants/routes';
import { useSalesOrderStore } from '@/stores/useSalesOrderStore';
import { EntityAnchor, EntityChip, EntityDash, LINK_ICON_SIZE, type LinkSize } from './EntityLink';

type SalesOrderLinkProps = {
  id: string | undefined | null;

  fallbackLabel?: string | null;
  size?: LinkSize;

  color?: string;
};

function urgencyColor(isUrgent: boolean | undefined): string {
  return isUrgent ? 'red' : 'blue';
}

function SalesOrderIcon({ size }: { size: LinkSize }) {
  return <IconFileText size={LINK_ICON_SIZE[size]} stroke={1.75} style={{ flexShrink: 0 }} />;
}

export function SalesOrderLink({ id, fallbackLabel, size = 'sm', color }: SalesOrderLinkProps) {
  const items = useSalesOrderStore((s) => s.items);

  const so = useMemo(() => (id ? items.find((s) => s.id === id) : undefined), [id, items]);

  if (!id) return <EntityDash size={size} />;
  const label = so?.orderNumber ?? fallbackLabel ?? '';
  if (!label) return <EntityDash size={size} />;

  const resolvedColor = color ?? urgencyColor(so?.extra?.isUrgent);

  return (
    <EntityAnchor to={ROUTES.SALES_ORDERS.DETAIL.replace(':id', id)} size={size}>
      <EntityChip
        size={size}
        lead={<SalesOrderIcon size={size} />}
        label={label}
        color={resolvedColor}
        monospace
      />
    </EntityAnchor>
  );
}
