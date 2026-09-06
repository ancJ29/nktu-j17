import type { ColumnFilterDef, DataTableColumnFilterLabels } from '@credo/base-ui/hooks';

import type { Product } from '@/types';

type BuildArgs = {
  readonly onHandByCode?: ReadonlyMap<string, number>;

  readonly priceVisible: boolean;
  readonly inventoryEnabled: boolean;
  readonly labels: DataTableColumnFilterLabels;
};

const numeric = (value: unknown): string | null => {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : String(parsed);
};

const formatNumber = (value: string): string => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toLocaleString() : value;
};

export function buildProductColumnFilterDefs({
  onHandByCode,
  priceVisible,
  inventoryEnabled,
  labels,
}: BuildArgs): ColumnFilterDef<Product>[] {
  return [
    {
      key: 'name',

      getValue: (p) => p.name,
      labels,
    },
    ...(priceVisible
      ? [
          { key: 'basePrice', getValue: (p: Product) => numeric(p.extra?.basePrice) },
          { key: 'price', getValue: (p: Product) => numeric(p.price) },
          { key: 'suggestedPrice', getValue: (p: Product) => numeric(p.extra?.suggestedPrice) },
        ].map((def) => ({ ...def, getLabel: formatNumber, labels }))
      : []),
    ...(inventoryEnabled
      ? [
          {
            key: 'onHand',

            getValue: (p: Product) => numeric(onHandByCode?.get(p.code) ?? 0),
            getLabel: formatNumber,
            labels,
          },
        ]
      : []),
  ];
}
