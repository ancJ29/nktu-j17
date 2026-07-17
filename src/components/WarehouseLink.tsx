import { IconPackageExport, IconPackageImport } from '@tabler/icons-react';
import { useMemo } from 'react';
import { ROUTES } from '@/constants/routes';
import { warehouseDocBundles } from '@/stores/useWarehouseDocStores';
import { EntityAnchor, EntityChip, EntityDash, LINK_ICON_SIZE, type LinkSize } from './EntityLink';

export type WarehouseDocLinkKind = 'receipt' | 'delivery-note';

type WarehouseLinkProps = {
  
  id: string | undefined | null;
  
  kind: WarehouseDocLinkKind;
  
  fallbackLabel?: string | null;
  size?: LinkSize;
  
  color?: string;
};

export function WarehouseLink({
  id,
  kind,
  fallbackLabel,
  size = 'sm',
  color = 'blue',
}: WarehouseLinkProps) {
  
  
  
  
  const receiptItems = warehouseDocBundles['warehouse-receipts'].useStore((s) => s.items);
  const deliveryItems = warehouseDocBundles['warehouse-delivery-notes'].useStore((s) => s.items);
  const items = kind === 'receipt' ? receiptItems : deliveryItems;

  const doc = useMemo(() => (id ? items.find((d) => d.id === id) : undefined), [id, items]);

  if (!id) return <EntityDash size={size} />;
  const label = doc?.extra.code ?? fallbackLabel ?? '';
  if (!label) return <EntityDash size={size} />;

  const route =
    kind === 'receipt' ? ROUTES.WAREHOUSE_RECEIPTS.DETAIL : ROUTES.WAREHOUSE_DELIVERY_NOTES.DETAIL;
  const Icon = kind === 'receipt' ? IconPackageImport : IconPackageExport;

  return (
    <EntityAnchor to={route.replace(':id', id)} size={size}>
      <EntityChip
        size={size}
        lead={<Icon size={LINK_ICON_SIZE[size]} stroke={1.75} style={{ flexShrink: 0 }} />}
        label={label}
        color={color}
        monospace
      />
    </EntityAnchor>
  );
}
