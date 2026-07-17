import { IconTruckLoading } from '@tabler/icons-react';
import { useMemo } from 'react';
import { ROUTES } from '@/constants/routes';
import { useGoodsReceiptStore } from '@/stores/useGoodsReceiptStore';
import { EntityAnchor, EntityChip, EntityDash, LINK_ICON_SIZE, type LinkSize } from './EntityLink';

type GoodsReceiptLinkProps = {
  
  id: string | undefined | null;
  
  fallbackLabel?: string | null;
  size?: LinkSize;
  
  color?: string;
};

export function GoodsReceiptLink({
  id,
  fallbackLabel,
  size = 'sm',
  color = 'blue',
}: GoodsReceiptLinkProps) {
  const items = useGoodsReceiptStore((s) => s.items);

  const gr = useMemo(() => (id ? items.find((g) => g.id === id) : undefined), [id, items]);

  if (!id) return <EntityDash size={size} />;
  const label = gr?.receiptNumber ?? fallbackLabel ?? '';
  if (!label) return <EntityDash size={size} />;

  return (
    <EntityAnchor to={ROUTES.GOODS_RECEIPTS.DETAIL.replace(':id', id)} size={size}>
      <EntityChip
        size={size}
        lead={
          <IconTruckLoading size={LINK_ICON_SIZE[size]} stroke={1.75} style={{ flexShrink: 0 }} />
        }
        label={label}
        color={color}
        monospace
      />
    </EntityAnchor>
  );
}
