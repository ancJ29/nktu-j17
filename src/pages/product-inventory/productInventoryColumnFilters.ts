import type { ColumnFilterDef, DataTableColumnFilterLabels } from '@credo/base-ui/hooks';

import type { InboundEntry } from '@/hooks';
import type { ProductInventorySummary } from '@/types';

type BuildArgs = {
  readonly locationLabelOf: (code: string) => string;
  readonly secondaryStatusLabelOf: (value: string) => string;

  readonly inboundIndex?: ReadonlyMap<string, InboundEntry>;
  readonly locationsEnabled: boolean;
  readonly labels: DataTableColumnFilterLabels;
};

const numeric = (value: number | undefined | null): string | null =>
  typeof value === 'number' && Number.isFinite(value) ? String(value) : null;

const formatNumber = (value: string): string => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toLocaleString() : value;
};

export function buildProductInventoryColumnFilterDefs({
  locationLabelOf,
  secondaryStatusLabelOf,
  inboundIndex,
  locationsEnabled,
  labels,
}: BuildArgs): ColumnFilterDef<ProductInventorySummary>[] {
  const incomingOf = (s: ProductInventorySummary) =>
    inboundIndex?.get(s.product.code)?.totalBase ?? 0;

  return [
    {
      key: 'product',

      getValue: (s) => s.product.name,
      labels,
    },
    ...(locationsEnabled
      ? [
          {
            key: 'location',

            getValue: (s: ProductInventorySummary) => s.rows.map((r) => r.locationCode),
            getLabel: locationLabelOf,
            labels,
          },
        ]
      : []),
    {
      key: 'minStock',
      getValue: (s) => numeric(s.product.extra?.minimumInventory?.value),
      getLabel: formatNumber,
      labels,
    },
    {
      key: 'beginOfPeriod',

      getValue: (s) => (s.hasBeginOfPeriod ? numeric(s.totalBeginOfPeriod) : null),
      getLabel: formatNumber,
      labels,
    },
    {
      key: 'onHand',
      getValue: (s) => numeric(s.totalOnHand),
      getLabel: formatNumber,
      labels,
    },
    {
      key: 'incoming',

      getValue: (s) => (incomingOf(s) > 0 ? numeric(incomingOf(s)) : null),
      getLabel: formatNumber,
      labels,
    },
    {
      key: 'outgoing',
      getValue: (s) => (s.totalReserved ? numeric(s.totalReserved) : null),
      getLabel: formatNumber,
      labels,
    },
    {
      key: 'forecasted',
      getValue: (s) => numeric(s.totalAvailable + incomingOf(s)),
      getLabel: formatNumber,
      labels,
    },
    {
      key: 'secondaryStatus',
      getValue: (s) => s.secondaryStatus,
      getLabel: secondaryStatusLabelOf,
      labels,
    },
  ];
}
