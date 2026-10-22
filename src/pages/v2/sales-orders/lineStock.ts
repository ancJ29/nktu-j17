import { featureFlags } from '@/config';
import { useMaterialInventoryV2Store } from '@/stores/useMaterialInventoryV2Store';
import { useProductInventoryV2Store } from '@/stores/useProductInventoryV2Store';
import type { SalesOrderV2ItemType } from '@/types/sales-order-v2';
import { forecastOf } from '../master-data/stockLevel';
import { useInventoryV2 } from '../master-data/useInventoryV2';

export type LineStock = {
  readonly onHand: number;

  readonly incoming: number;

  readonly outgoing: number;

  readonly available: number;

  readonly forecast: number;

  readonly held: number;
};

export type LineStockReader = (
  line: { readonly itemType: SalesOrderV2ItemType; readonly itemId: string },

  orderId?: string,
) => LineStock | null;

export function useSalesOrderLineStock(): {
  readonly read: LineStockReader;
  readonly pending: boolean;
} {
  const productStock = useInventoryV2(useProductInventoryV2Store, true);
  const materialStock = useInventoryV2(
    useMaterialInventoryV2Store,
    featureFlags.materialsV2.enabled,
  );

  return {
    pending: !productStock.ready || !materialStock.ready,
    read: (line, orderId) => {
      const row = (line.itemType === 'material' ? materialStock : productStock).byItemId.get(
        line.itemId,
      );
      if (!row) return null;
      const held = orderId
        ? (row.outgoingBy?.find((entry) => entry.orderId === orderId)?.quantity ?? 0)
        : 0;
      const outgoing = row.outgoing ?? 0;
      return {
        onHand: row.onHand,
        incoming: row.incoming ?? 0,
        outgoing,
        available: row.onHand - outgoing,
        forecast: forecastOf(row),
        held,
      };
    },
  };
}
