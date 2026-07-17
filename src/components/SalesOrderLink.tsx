import { IconFileText } from '@tabler/icons-react';
import { useMemo } from 'react';
import { ROUTES } from '@/constants/routes';
import { useSalesOrderStore } from '@/stores/useSalesOrderStore';
import {
  EntityAnchor,
  EntityChip,
  EntityDash,
  JoinedLinks,
  LINK_ICON_SIZE,
  type LinkSize,
} from './EntityLink';

type SalesOrderLinkProps = {
  
  id: string | undefined | null;
  
  fallbackLabel?: string | null;
  size?: LinkSize;
  
  color?: string;
};

type SalesOrderLinksProps = {
  
  ids: string[];
  size?: LinkSize;
  
  colors?: (string | undefined)[];
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

export function SalesOrderLinks({ ids, size = 'sm', colors = [] }: SalesOrderLinksProps) {
  const items = useSalesOrderStore((s) => s.items);

  const resolved = useMemo(
    () =>
      ids.map((id, idx) => {
        const so = items.find((s) => s.id === id);
        return {
          id,
          label: so?.orderNumber ?? id,
          color: colors[idx] ?? urgencyColor(so?.extra?.isUrgent),
        };
      }),
    [ids, items, colors],
  );

  return (
    <JoinedLinks
      size={size}
      items={resolved}
      keyOf={(so) => so.id}
      renderItem={(so) => (
        <EntityAnchor
          to={ROUTES.SALES_ORDERS.DETAIL.replace(':id', so.id)}
          size={size}
          anchorColor={so.color}
        >
          <EntityChip
            size={size}
            lead={<SalesOrderIcon size={size} />}
            label={so.label}
            monospace
          />
        </EntityAnchor>
      )}
    />
  );
}
